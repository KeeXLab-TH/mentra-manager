const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Rewrite uploadToDrive to use XMLHttpRequest for progress
const newUploadToDrive = `
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
`;

html = html.replace(/async function uploadToDrive\(file, targetFolderId = DRIVE_ROOT_FOLDER_ID\) {[\s\S]*?\}\s*catch[\s\S]*?\}\s*\}/, newUploadToDrive.trim());

// 2. Hide progress container when saveProduct starts or ends
html = html.replace(/window\.saveProduct = async \(\) => {/, 'window.saveProduct = async () => {\n    document.getElementById("uploadProgressContainer").style.display = "none";');
html = html.replace(/closeModal\('productModal'\);/, "closeModal('productModal');\n        document.getElementById('uploadProgressContainer').style.display = 'none';");

// 3. Add viewProductDetails logic
const viewDetailsLogic = `
window.viewProductDetails = (id) => {
    try {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;

        const pName = p.name || p.title || p.productName || '';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || '- ไม่ระบุ -';
        const pPrice = p.price || p.cost || 0;
        let pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || 'assets/img/placeholder.png';
        const pDocs = p.documentDriveUrls || p.documents || p.docs || p.files || [];

        // convert drive view urls to thumbnail
        if (pImgUrl.includes('export=download') && p.fileId) {
            pImgUrl = \`https://drive.google.com/thumbnail?id=\${p.fileId}&sz=w1000\`;
        } else if (pImgUrl.includes('/view')) {
            const match = pImgUrl.match(/\\/d\\/([a-zA-Z0-9_-]+)\\//);
            if (match) {
                pImgUrl = \`https://drive.google.com/thumbnail?id=\${match[1]}&sz=w1000\`;
            }
        }

        document.getElementById("detailName").innerText = pName;
        document.getElementById("detailMfg").innerText = pMfg;
        document.getElementById("detailPrice").innerText = pPrice.toLocaleString();
        document.getElementById("detailImg").src = pImgUrl;

        const docsContainer = document.getElementById("detailDocs");
        if (pDocs && pDocs.length > 0) {
            docsContainer.innerHTML = pDocs.map((url, i) => \`
                <a href="\${url}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: white; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--text); font-weight: 500; transition: 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text)';">
                    <div style="width: 32px; height: 32px; background: #fee2e2; color: #ef4444; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    เอกสารแนบชุดที่ \${i+1} <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left: auto; color: var(--text-secondary); font-size: 12px;"></i>
                </a>
            \`).join('');
            document.getElementById("detailDocsContainer").style.display = 'block';
        } else {
            document.getElementById("detailDocsContainer").style.display = 'none';
        }

        // Setup Buttons
        document.getElementById("detailEditBtn").onclick = () => {
            closeModal('productDetailsModal');
            setTimeout(() => editProduct(id), 300);
        };

        document.getElementById("detailDeleteBtn").onclick = () => {
            closeModal('productDetailsModal');
            setTimeout(() => deleteProduct(id), 300);
        };

        const m = document.getElementById("productDetailsModal");
        m.style.display = "flex";
        setTimeout(() => m.classList.add("show"), 10);
    } catch(e) {
        console.error("viewProductDetails error", e);
        Swal.fire("Error", e.message, "error");
    }
};
`;

if (!html.includes('window.viewProductDetails =')) {
    html = html.replace(/window\.editProduct =/g, viewDetailsLogic + '\nwindow.editProduct =');
}

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Modified JS logic.');
