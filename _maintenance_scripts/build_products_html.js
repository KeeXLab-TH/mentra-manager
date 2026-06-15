const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add SweetAlert2
if (!html.includes('sweetalert2@11')) {
    html = html.replace(/<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css">/, `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>`);
}

// 2. Add Product CSS
const css = `
        /* ===== PRODUCT CARDS ===== */
        .product-card {
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
            transition: transform var(--t-fast), box-shadow var(--t-fast);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0,0,0,0.03);
            cursor: pointer;
        }

        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-md);
            border-color: var(--border);
        }

        .product-card-img-container {
            width: 100%;
            height: 220px;
            background: #f8fafc;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid var(--border);
        }

        .product-card-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));
        }

        .product-card-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .product-card-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 4px;
            line-height: 1.4;
        }

        .product-card-mfg {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .product-card-price {
            font-size: 18px;
            font-weight: 800;
            color: var(--primary);
            margin-top: auto;
        }

        .product-card-actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .btn-view, .btn-edit {
            flex: 1;
            padding: 8px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background var(--t-fast), color var(--t-fast);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-view {
            background: var(--bg);
            color: var(--text);
        }

        .btn-view:hover {
            background: #e2e8f0;
        }

        .btn-edit {
            background: var(--primary-light);
            color: var(--primary-dark);
        }

        .btn-edit:hover {
            background: var(--primary);
            color: white;
        }

        /* ===== BUTTONS ===== */
        .btn-add-product {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 10px 20px;
            border-radius: var(--radius-sm);
            font-size: 14.5px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px var(--primary-glow);
            transition: transform var(--t-fast), box-shadow var(--t-fast);
        }

        .btn-add-product:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(26, 111, 191, 0.3);
        }
`;

if (!html.includes('.product-card {')) {
    html = html.replace(/\/\* Collapsed state \(desktop\) \*\//, css + '\n        /* Collapsed state (desktop) */');
}

// 3. Add Topbar Title and Button
const newHeader = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2>ระบบจัดการสินค้า (Products)</h2>
            <button class="btn-add-product" onclick="openProductModal()">
                <i class="fa-solid fa-plus"></i> เพิ่มสินค้าใหม่
            </button>
        </div>`;

if (!html.includes('openProductModal()')) {
    html = html.replace(/<h2 style="margin-bottom: 24px;">ระบบจัดการสินค้า \(Products\)<\/h2>/, newHeader);
}

// 4. Update the Script block
const scriptLogic = `
<script type="module">
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
        grid.innerHTML = \`<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; color: var(--border);"></i>
            <h3>ยังไม่มีสินค้าในระบบ</h3>
            <p>คลิก "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น</p>
        </div>\`;
        return;
    }

    currentProducts.forEach(p => {
        const priceFmt = (p.price || 0).toLocaleString();
        const imgUrl = p.imageDriveUrl ? p.imageDriveUrl : 'assets/img/placeholder.png';
        
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = \`
            <div class="product-card-img-container">
                <img src="\${imgUrl}" alt="\${p.name}" class="product-card-img" onerror="this.src='assets/img/logo.png'">
            </div>
            <div class="product-card-body">
                <div class="product-card-title">\${p.name}</div>
                <div class="product-card-mfg"><i class="fa-solid fa-industry"></i> \${p.manufacturer}</div>
                <div class="product-card-price">\${priceFmt} ฿</div>
                <div class="product-card-actions">
                    <button class="btn-edit" onclick="editProduct('\${p.id}')"><i class="fa-solid fa-pen"></i> แก้ไขข้อมูล</button>
                </div>
            </div>
        \`;
        grid.appendChild(card);
    });
}

window.openProductModal = () => {
    document.getElementById("productForm").reset();
    document.getElementById("prodId").value = "";
    document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-box"></i> เพิ่มสินค้าใหม่';
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("docsPreview").innerHTML = "";
    document.getElementById("productModal").style.display = "flex";
};

window.closeModal = (id) => {
    document.getElementById(id).style.display = "none";
};

window.editProduct = (id) => {
    const p = currentProducts.find(x => x.id === id);
    if (!p) return;

    document.getElementById("prodId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodMfg").value = p.manufacturer;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไขสินค้า';
    
    const previewContainer = document.getElementById("imagePreview");
    const previewImg = document.getElementById("imagePreviewImg");
    if (p.imageDriveUrl) {
        previewImg.src = p.imageDriveUrl;
        previewContainer.style.display = "block";
    } else {
        previewContainer.style.display = "none";
    }

    const docsContainer = document.getElementById("docsPreview");
    if (p.documentDriveUrls && p.documentDriveUrls.length > 0) {
        docsContainer.innerHTML = p.documentDriveUrls.map(url => \`<a href="\${url}" target="_blank" style="color: var(--primary); text-decoration: none; display: block; margin-top: 4px;"><i class="fa-solid fa-file-pdf"></i> แนบเอกสารแล้ว (คลิกเพื่อดู)</a>\`).join('');
    } else {
        docsContainer.innerHTML = '';
    }

    document.getElementById("productModal").style.display = "flex";
};

// Handle Image Preview
document.getElementById('prodImage').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreviewImg').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        }
        reader.readAsDataURL(this.files[0]);
    }
});

// GAS Upload Logic via resumable chunks matching dashboard
async function uploadToDrive(file) {
    try {
        const gasRes = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'getUploadUrl',
                filename: 'prod_' + Date.now() + '_' + file.name,
                mimeType: file.type || 'application/octet-stream',
                folderId: DRIVE_ROOT_FOLDER_ID
            })
        });
        const gasResult = await gasRes.json();
        if (gasResult.status !== 'success' || !gasResult.token) throw new Error('GAS error: ' + gasResult.error);

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
                    parents: [DRIVE_ROOT_FOLDER_ID]
                })
            }
        );

        const locationUrl = initRes.headers.get('Location');
        if (!locationUrl) throw new Error('Failed to get resumable upload URL');

        const uploadRes = await fetch(locationUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': file.size.toString(),
                'Content-Type': uploadMimeType
            },
            body: file
        });

        const finalResult = await uploadRes.json();
        if (finalResult.id) {
            return 'https://drive.google.com/file/d/' + finalResult.id + '/view';
        }
        throw new Error('Upload failed');
    } catch (err) {
        console.error("Upload error:", err);
        throw err;
    }
}

window.saveProduct = async () => {
    const name = document.getElementById("prodName").value.trim();
    const mfg = document.getElementById("prodMfg").value.trim();
    const price = parseInt(document.getElementById("prodPrice").value);
    const imgFile = document.getElementById("prodImage").files[0];
    const docFiles = document.getElementById("prodDocs").files;

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
        let imageDriveUrl = '';
        let documentDriveUrls = [];

        // If editing, preserve old urls
        if (id) {
            const oldP = currentProducts.find(x => x.id === id);
            if (oldP) {
                imageDriveUrl = oldP.imageDriveUrl || '';
                documentDriveUrls = oldP.documentDriveUrls || [];
            }
        }

        if (imgFile) {
            Swal.update({ text: 'กำลังอัปโหลดรูปภาพสินค้า...' });
            imageDriveUrl = await uploadToDrive(imgFile);
        } else if (!id) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปภาพสินค้า', 'warning');
            return;
        }

        if (docFiles.length > 0) {
            Swal.update({ text: 'กำลังอัปโหลดเอกสารแนบ...' });
            for (let i = 0; i < docFiles.length; i++) {
                const docUrl = await uploadToDrive(docFiles[i]);
                documentDriveUrls.push(docUrl);
            }
        }

        const productData = {
            name,
            manufacturer: mfg,
            price,
            imageDriveUrl,
            documentDriveUrls,
            updatedAt: Timestamp.now()
        };

        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            productData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'products'), productData);
        }

        closeModal('productModal');
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว', 'success');
        fetchProducts();

    } catch (e) {
        console.error("Save error", e);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + e.message, 'error');
    }
};
</script>
`;

html = html.replace(/<script type="module">[\s\S]*?<\/script>/, scriptLogic);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Done restoring products.html CSS and JS');
