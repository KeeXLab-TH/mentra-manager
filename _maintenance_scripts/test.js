
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initializeFirestore, collection, addDoc, getDocs, doc, updateDoc, Timestamp, deleteDoc, orderBy, query, persistentLocalCache, persistentMultipleTabManager } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let FIREBASE_CONFIG, GAS_URL, DRIVE_ROOT_FOLDER_ID;
let app, auth, db;
let currentProducts = [];

async function init() {
    try {
        const cfg = await import('./assets/js/firebase-config.js');
        FIREBASE_CONFIG = cfg.FIREBASE_CONFIG || cfg.default?.FIREBASE_CONFIG;
        GAS_URL = cfg.GAS_URL || cfg.default?.GAS_URL;
        DRIVE_ROOT_FOLDER_ID = cfg.DRIVE_ROOT_FOLDER_ID || cfg.default?.DRIVE_ROOT_FOLDER_ID;
    } catch (e) {
        console.warn('Failed to load config, using fallbacks');
    }

    if (!GAS_URL) {
        GAS_URL = 'https://script.google.com/macros/s/AKfycbwRIcnykIL630Op5cf6qWO_zpbkzqYfY_pDEyOf0vA_cpaxio9Gu813nfxuuufHhZXW/exec';
    }
    if (!DRIVE_ROOT_FOLDER_ID) {
        DRIVE_ROOT_FOLDER_ID = '1a0B6l56PAVCZ4v8lzSeIRslq78XSJh8e';
    }

    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });

    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            document.body.style.display = 'block';
            document.getElementById("userAvatar").textContent = user.email.charAt(0).toUpperCase();
            document.getElementById("userName").textContent = user.displayName || user.email;
            fetchProducts();
        }
    });
}

init();

window.handleLogout = () => {
    signOut(auth).then(() => { window.location.href = 'index.html'; });
};

async function fetchProducts() {
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        currentProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
    } catch (e) {
        console.error("Error fetching products", e);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้', 'error');
    }
}

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    if (currentProducts.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; color: var(--border);"></i>
            <h3>ยังไม่มีสินค้าในระบบ</h3>
            <p>คลิก "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น</p>
        </div>`;
        return;
    }

    currentProducts.forEach(p => {
        const pName = p.name || p.title || p.productName || 'ไม่ระบุชื่อสินค้า';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || 'ไม่ระบุผู้ผลิต';
        const pPrice = p.price || p.cost || 0;
        let pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || 'assets/img/placeholder.png';
        if (pImgUrl.includes('export=download') && p.fileId) {
            pImgUrl = `https://drive.google.com/thumbnail?id=${p.fileId}&sz=w1000`;
        } else if (pImgUrl.includes('/view')) {
            const match = pImgUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
            if (match) {
                pImgUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
            }
        }
        const priceFmt = pPrice.toLocaleString();
        
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="product-card-img-container">
                <img src="${pImgUrl}" alt="${pName}" class="product-card-img" onerror="this.src='assets/img/logo.png'">
            </div>
            <div class="product-card-body">
                <div class="product-card-title">${pName}</div>
                <div class="product-card-mfg"><i class="fa-solid fa-industry"></i> ${pMfg}</div>
                <div class="product-card-price">${priceFmt} ฿</div>
                <div class="product-card-actions">
                    <button type="button" class="btn-edit" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                    <button type="button" class="btn-details" onclick="viewProductDetails('${p.id}')"><i class="fa-solid fa-circle-info"></i> รายละเอียด</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.openProductModal = () => { try {
    document.getElementById("productForm").reset();
    document.getElementById("prodId").value = "";
    document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-box"></i> เพิ่มสินค้าใหม่';
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("docsPreview").innerHTML = "";
    const m = document.getElementById("productModal"); m.style.display = "flex"; setTimeout(() => m.classList.add("show"), 10); } catch(e) { console.error("openProductModal error", e); Swal.fire("Error", e.message, "error"); } };

window.closeModal = (id) => {
    const m = document.getElementById(id);
    m.classList.remove("show");
    setTimeout(() => m.style.display = "none", 300);
};


window.deleteProduct = (id) => {
    Swal.fire({
        title: 'ยืนยันการลบสินค้า?',
        text: "หากลบแล้วจะไม่สามารถกู้คืนได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                await deleteDoc(doc(db, 'products', id));
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลสินค้าถูกลบออกจากระบบแล้ว.', 'success');
                fetchProducts();
            } catch (e) {
                console.error("Delete error", e);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + e.message, 'error');
            }
        }
    });
};




window.closeProductDetail = () => {
    document.getElementById('paneDetailView').style.display = 'none';
    document.getElementById('paneListView').style.display = 'block';
};

const paneDocEl = document.getElementById('paneDetailProdDocs');
if (paneDocEl) {
    paneDocEl.addEventListener('change', function(e) {
        const preview = document.getElementById('paneDetailDocsPreview');
        const uploadBtn = document.getElementById('btnPaneUploadDocs');
        if (this.files && this.files.length > 0) {
            let htmlStr = '';
            for (let i = 0; i < this.files.length; i++) {
                htmlStr += `<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid var(--border); border-radius: 10px;">
                    <i class="fa-solid fa-file-arrow-up" style="color: var(--primary); font-size: 18px;"></i>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: var(--text);">${this.files[i].name}</span>
                    <span style="color: #64748b; font-size: 13px; font-weight: 500;">${(this.files[i].size / 1024 / 1024).toFixed(2)} MB</span>
                </div>`;
            }
            preview.innerHTML = htmlStr;
            uploadBtn.style.display = 'block';
        } else {
            preview.innerHTML = '';
            uploadBtn.style.display = 'none';
        }
    });
}

document.getElementById('btnPaneUploadDocs').addEventListener('click', async () => {
    const id = document.getElementById('paneDetailProdId').value;
    const docFiles = document.getElementById('paneDetailProdDocs').files;
    if (!id || !docFiles || docFiles.length === 0) return;

    try {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;

        let targetFolderId = DRIVE_ROOT_FOLDER_ID;
        let documentDriveUrls = p.documentDriveUrls || p.documents || p.docs || [];

        document.getElementById('btnPaneUploadDocs').style.display = 'none';
        
        const progContainer = document.getElementById('paneUploadProgressContainer');
        const progText = document.getElementById('paneUploadProgressText');
        const progBar = document.getElementById('paneUploadProgressBar');
        const progPct = document.getElementById('paneUploadProgressPercent');
        
        progContainer.style.display = 'block';
        progText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> ขอ URL อัปโหลด...';
        progBar.style.width = '0%';
        progPct.innerText = '0%';

        try {
            const gasFolderRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'createFolder',
                    folderName: p.name || 'Untitled',
                    parentFolderId: DRIVE_ROOT_FOLDER_ID
                })
            });
            const gasFolderResult = await gasFolderRes.json();
            if (gasFolderResult.status === 'created' || gasFolderResult.status === 'exists') {
                targetFolderId = gasFolderResult.folderId;
            }
        } catch(e) {
            console.warn("Failed to create folder", e);
        }

        for (let i = 0; i < docFiles.length; i++) {
            const file = docFiles[i];
            const fileUrl = await new Promise(async (resolve, reject) => {
                try {
                    const gasRes = await fetch(GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({
                            action: 'getUploadUrl',
                            filename: 'prod_' + Date.now() + '_' + file.name,
                            mimeType: file.type || 'application/octet-stream',
                            folderId: targetFolderId
                        })
                    });
                    const gasResult = await gasRes.json();
                    if (gasResult.status !== 'success' || !gasResult.token) throw new Error('GAS error');

                    progText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด (' + file.name + ')...';

                    const uploadMimeType = file.type || 'application/octet-stream';
                    const initRes = await fetch(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + gasResult.token,
                                'Content-Type': 'application/json',
                                'X-Upload-Content-Type': uploadMimeType,
                                'X-Upload-Content-Length': file.size.toString()
                            },
                            body: JSON.stringify({
                                name: gasResult.filename || file.name,
                                parents: [targetFolderId]
                            })
                        }
                    );

                    const locationUrl = initRes.headers.get('Location');
                    if (!locationUrl) throw new Error('Failed to get URL');

                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', locationUrl, true);
                    xhr.setRequestHeader('Content-Type', uploadMimeType);
                    
                    xhr.upload.onprogress = function(e) {
                        if (e.lengthComputable) {
                            const pct = Math.round((e.loaded / e.total) * 100);
                            progBar.style.width = pct + '%';
                            progPct.innerText = pct + '%';
                        }
                    };
                    
                    xhr.onload = function() {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            const res = JSON.parse(xhr.responseText);
                            if (res.id) resolve('https://drive.google.com/file/d/' + res.id + '/view');
                            else reject(new Error('No ID'));
                        } else {
                            reject(new Error('Failed: ' + xhr.status));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(file);
                } catch(e) { reject(e); }
            });
            documentDriveUrls.push(fileUrl);
        }

        progText.innerHTML = '<i class="fa-solid fa-check"></i> อัปโหลดเสร็จสมบูรณ์!';
        
        await updateDoc(doc(db, 'products', id), {
            documentDriveUrls: documentDriveUrls,
            updatedAt: Timestamp.now()
        });

        progContainer.style.display = 'none';
        document.getElementById('paneDetailDocsPreview').innerHTML = '';
        document.getElementById('paneDetailProdDocs').value = '';
        
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'อัปโหลดเอกสารแนบเรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false
        });
        
        await fetchProducts();
        viewProductDetails(id);

    } catch(err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'อัปโหลดล้มเหลว: ' + err.message, 'error');
        document.getElementById('btnPaneUploadDocs').style.display = 'block';
        document.getElementById('paneUploadProgressContainer').style.display = 'none';
    }
});

window.viewProductDetails = (id) => {
    try {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;

        const pName = p.name || p.title || p.productName || '';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || '- ไม่ระบุ -';
        const pPrice = p.price || p.cost || 0;
        let pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || 'assets/img/placeholder.png';
        const pDocs = p.documentDriveUrls || p.documents || p.docs || p.files || [];

        if (pImgUrl.includes('export=download') && p.fileId) {
            pImgUrl = `https://drive.google.com/thumbnail?id=${p.fileId}&sz=w1000`;
        } else if (pImgUrl.includes('/view')) {
            const match = pImgUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
            if (match) {
                pImgUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
            }
        }

        document.getElementById("paneDetailProdId").value = id;
        document.getElementById("paneDetailDocsPreview").innerHTML = '';
        document.getElementById("paneDetailProdDocs").value = '';
        document.getElementById("btnPaneUploadDocs").style.display = 'none';
        document.getElementById("paneUploadProgressContainer").style.display = 'none';

        document.getElementById("paneDetailName").innerText = pName;
        document.getElementById("paneDetailMfg").innerText = pMfg;
        document.getElementById("paneDetailPrice").innerText = pPrice.toLocaleString();
        document.getElementById("paneDetailImg").src = pImgUrl;

        const docsContainer = document.getElementById("paneDetailDocs");
        if (pDocs && pDocs.length > 0) {
            docsContainer.innerHTML = pDocs.map((url, i) => `
                <a href="${url}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--text); transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='var(--primary)'; this.style.background='white'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--border)'; this.style.background='#f8fafc'; this.style.transform='translateY(0)';">
                    <div style="width: 40px; height: 40px; background: #fee2e2; color: #ef4444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">เอกสารแนบชุดที่ ${i+1}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">คลิกเพื่อเปิดดูหรือดาวน์โหลดไฟล์</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: #cbd5e1; font-size: 14px;"></i>
                </a>
            `).join('');
            docsContainer.style.display = 'flex';
        } else {
            docsContainer.innerHTML = '<div style="text-align:center; padding: 24px; color: var(--text-muted); font-size: 14px; background: #f8fafc; border-radius: 12px; border: 1px dashed var(--border);">ยังไม่มีเอกสารแนบอ้างอิงสำหรับสินค้านี้</div>';
            docsContainer.style.display = 'block';
        }

        document.getElementById("btnPaneEdit").onclick = () => {
            editProduct(id);
        };

        document.getElementById("btnPaneDelete").onclick = () => {
            deleteProduct(id);
            closeProductDetail();
        };

        document.getElementById("paneListView").style.display = 'none';
        document.getElementById("paneDetailView").style.display = 'flex';
        
    } catch(e) {
        console.error("viewProductDetails error", e);
        Swal.fire("Error", e.message, "error");
    }
};
window.editProduct = (id) => { try {
    const p = currentProducts.find(x => x.id === id);
    if (!p) return;

    const pName = p.name || p.title || p.productName || '';
    const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || '';
    const pPrice = p.price || p.cost || 0;
    const pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || '';
    const pDocs = p.documentDriveUrls || p.documents || p.docs || p.files || [];

    document.getElementById("prodId").value = p.id;
    document.getElementById("prodName").value = pName;
    document.getElementById("prodMfg").value = pMfg;
    document.getElementById("prodPrice").value = pPrice;
    document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไขสินค้า';
    
    const previewContainer = document.getElementById("imagePreview");
    const previewImg = document.getElementById("imagePreviewImg");
    if (pImgUrl) {
        previewImg.src = pImgUrl;
        previewContainer.style.display = "block";
    } else {
        previewContainer.style.display = "none";
    }

    const docsContainer = document.getElementById("docsPreview");
    if (pDocs && pDocs.length > 0) {
        docsContainer.innerHTML = pDocs.map(url => `<a href="${url}" target="_blank" style="color: var(--primary); text-decoration: none; display: block; margin-top: 4px;"><i class="fa-solid fa-file-pdf"></i> แนบเอกสารแล้ว (คลิกเพื่อดู)</a>`).join('');
    } else {
        docsContainer.innerHTML = '';
    }

    const m = document.getElementById("productModal"); m.style.display = "flex"; setTimeout(() => m.classList.add("show"), 10); } catch(e) { console.error("openProductModal error", e); Swal.fire("Error", e.message, "error"); } };


const docEl = document.getElementById('prodDocs');
if (docEl) {
    docEl.addEventListener('change', function(e) {
        const preview = document.getElementById('docsPreview');
        if (this.files && this.files.length > 0) {
            let htmlStr = '';
            for (let i = 0; i < this.files.length; i++) {
                htmlStr += `<div style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: white; border: 1px solid var(--border); border-radius: 8px;">
                    <i class="fa-solid fa-file" style="color: #94a3b8;"></i>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; color: var(--text);">${this.files[i].name}</span>
                    <span style="color: #94a3b8; font-size: 12px;">${(this.files[i].size / 1024 / 1024).toFixed(2)} MB</span>
                </div>`;
            }
            preview.innerHTML = htmlStr;
        } else {
            preview.innerHTML = '';
        }
    });
}

// Handle Image Preview
const imgEl = document.getElementById('prodImage'); if(imgEl) imgEl.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            
            const imgTarget = document.getElementById('imagePreviewImg');
            imgTarget.style.display = 'inline-block';
            imgTarget.src = e.target.result;

            document.getElementById('imagePreview').style.display = 'block';
        }
        reader.readAsDataURL(this.files[0]);
    }
});

// GAS Upload Logic via resumable chunks matching dashboard
async function uploadToDrive(file, targetFolderId = DRIVE_ROOT_FOLDER_ID) {
    return new Promise(async (resolve, reject) => {
        try {
            document.getElementById('uploadProgressContainer').style.display = 'block';
            document.getElementById('uploadProgressText').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> ขอ URL อัปโหลด...';
            document.getElementById('uploadProgressBar').style.width = '0%';
            document.getElementById('uploadProgressPercent').innerText = '0%';

            const gasRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'getUploadUrl',
                    filename: 'prod_' + Date.now() + '_' + file.name,
                    mimeType: file.type || 'application/octet-stream',
                    folderId: targetFolderId
                })
            });
            const gasResult = await gasRes.json();
            if (gasResult.status !== 'success' || !gasResult.token) throw new Error('GAS error: ' + gasResult.error);

            document.getElementById('uploadProgressText').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด (' + file.name + ')...';

            const uploadMimeType = file.type || 'application/octet-stream';
            const initRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + gasResult.token,
                        'Content-Type': 'application/json',
                        'X-Upload-Content-Type': uploadMimeType,
                        'X-Upload-Content-Length': file.size.toString()
                    },
                    body: JSON.stringify({
                        name: gasResult.filename || file.name,
                        parents: [targetFolderId]
                    })
                }
            );

            const locationUrl = initRes.headers.get('Location');
            if (!locationUrl) throw new Error('Failed to get resumable upload URL');

            // Use XMLHttpRequest for progress
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', locationUrl, true);
            xhr.setRequestHeader('Content-Type', uploadMimeType);
            
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    document.getElementById('uploadProgressBar').style.width = percentComplete + '%';
                    document.getElementById('uploadProgressPercent').innerText = percentComplete + '%';
                    
                    if (Swal.isVisible()) {
                        Swal.update({ html: '<div style="margin-top:10px;">กำลังอัปโหลด (' + file.name + ')<br><b style="font-size:20px; color:var(--primary);">' + percentComplete + '%</b></div>' });
                    }
                }
            };
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const finalResult = JSON.parse(xhr.responseText);
                        if (finalResult.id) {
                            document.getElementById('uploadProgressText').innerHTML = '<i class="fa-solid fa-check text-success"></i> อัปโหลดเสร็จสิ้น';
                            resolve('https://drive.google.com/file/d/' + finalResult.id + '/view');
                        } else {
                            reject(new Error('No ID in response'));
                        }
                    } catch(err) { reject(err); }
                } else {
                    reject(new Error('Upload failed with status ' + xhr.status));
                }
            };
            
            xhr.onerror = function() { reject(new Error('XHR Network Error')); };
            xhr.send(file);
            
        } catch (err) {
            console.error("Upload error:", err);
            reject(err);
        }
    });
}

window.saveProduct = async () => {
    document.getElementById("uploadProgressContainer").style.display = "none";
    const name = document.getElementById("prodName").value.trim();
    const mfg = document.getElementById("prodMfg").value.trim();
    const price = parseInt(document.getElementById("prodPrice").value);
    const imgFile = document.getElementById("prodImage").files[0];
    
    if (!name || !mfg || isNaN(price)) {
        Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน', 'warning');
        return;
    }

    const id = document.getElementById("prodId").value;

    Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        let oldP = null;
        let imageDriveUrl = '';
        let documentDriveUrls = [];

        if (id) {
            oldP = currentProducts.find(x => x.id === id);
            if (oldP) {
                imageDriveUrl = oldP.imageDriveUrl || oldP.imageUrl || oldP.imgUrl || oldP.image || '';
                documentDriveUrls = oldP.documentDriveUrls || oldP.documents || oldP.docs || [];
            }
        }

        let targetFolderId = DRIVE_ROOT_FOLDER_ID;
        try {
            Swal.update({ text: 'กำลังเตรียมโฟลเดอร์สำหรับสินค้า...' });
            const gasFolderRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'createFolder',
                    folderName: name,
                    parentFolderId: DRIVE_ROOT_FOLDER_ID
                })
            });
            const gasFolderResult = await gasFolderRes.json();
            if (gasFolderResult.status === 'created' || gasFolderResult.status === 'exists') {
                targetFolderId = gasFolderResult.folderId;
            }
        } catch(e) {
            console.warn("Failed to create folder, using root", e);
        }

        if (imgFile) {
            Swal.update({ text: 'กำลังอัปโหลดรูปภาพสินค้า...' });
            imageDriveUrl = await uploadToDrive(imgFile, targetFolderId);
        } else if (!id) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปภาพสินค้า', 'warning');
            return;
        }

        const productData = oldP ? { ...oldP } : {};
        // Overwrite standard fields
        productData.name = name;
        productData.manufacturer = mfg;
        productData.price = price;
        productData.imageDriveUrl = imageDriveUrl;
        productData.documentDriveUrls = documentDriveUrls;
        productData.updatedAt = Timestamp.now();

        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            productData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'products'), productData);
        }

        closeModal('productModal');
        document.getElementById('uploadProgressContainer').style.display = 'none';
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว', 'success');
        fetchProducts();

    } catch (e) {
        console.error("Save error", e);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + e.message, 'error');
    }
};
