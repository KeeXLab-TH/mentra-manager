const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Remove the document upload zone from the Add/Edit Product modal
html = html.replace(/<div class="form-group" style="margin-bottom: 16px;">\s*<label>เอกสารแนบเพิ่มเติม \(PDF, DOCX ฯลฯ\)<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/form>/, '</form>');

// 2. Add the document upload zone to the View Details modal
const newDetailDocsSection = `
            <div id="detailDocsContainer" style="margin-top: 20px;">
                <h4 style="font-size: 15px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-lines"></i> เอกสารอ้างอิง</h4>
                <div id="detailDocs" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- documents here -->
                </div>
                
                <div style="margin-top: 16px; border-top: 1px dashed var(--border); padding-top: 16px;">
                    <input type="hidden" id="detailProdId">
                    <label for="detailProdDocs" class="file-drop-zone docs-zone" style="padding: 12px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; transition: 0.2s;">
                        <i class="fa-solid fa-file-circle-plus drop-icon" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px;"></i>
                        <span class="drop-text" style="font-size: 14px; font-weight: 600; color: var(--text);">คลิกเพื่ออัปโหลดเอกสารเพิ่มเติม (PDF, DOCX)</span>
                    </label>
                    <input type="file" id="detailProdDocs" multiple style="display: none;">
                    
                    <div id="detailDocsPreview" style="margin-top: 12px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px;"></div>
                    
                    <button type="button" id="btnUploadDetailDocs" style="display: none; width: 100%; margin-top: 12px; padding: 10px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-cloud-arrow-up"></i> บันทึกและอัปโหลดเอกสาร</button>
                    
                    <div id="detailUploadProgressContainer" style="display: none; margin-top: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                            <span id="detailUploadProgressText"><i class="fa-solid fa-cloud-arrow-up"></i> กำลังอัปโหลด...</span>
                            <span id="detailUploadProgressPercent">0%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div id="detailUploadProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), #3b82f6); transition: width 0.1s ease; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
            </div>
`;
html = html.replace(/<div id="detailDocsContainer"[\s\S]*?<\/div>\s*<\/div>/, newDetailDocsSection.trim() + '\n        </div>');

// 3. Update the JS logic for the new details upload
const newJsLogic = `
const detailDocEl = document.getElementById('detailProdDocs');
if (detailDocEl) {
    detailDocEl.addEventListener('change', function(e) {
        const preview = document.getElementById('detailDocsPreview');
        const uploadBtn = document.getElementById('btnUploadDetailDocs');
        if (this.files && this.files.length > 0) {
            let htmlStr = '';
            for (let i = 0; i < this.files.length; i++) {
                htmlStr += \`<div style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: white; border: 1px solid var(--border); border-radius: 8px;">
                    <i class="fa-solid fa-file" style="color: #94a3b8;"></i>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; color: var(--text);">\${this.files[i].name}</span>
                    <span style="color: #94a3b8; font-size: 12px;">\${(this.files[i].size / 1024 / 1024).toFixed(2)} MB</span>
                </div>\`;
            }
            preview.innerHTML = htmlStr;
            uploadBtn.style.display = 'block';
        } else {
            preview.innerHTML = '';
            uploadBtn.style.display = 'none';
        }
    });
}

document.getElementById('btnUploadDetailDocs').addEventListener('click', async () => {
    const id = document.getElementById('detailProdId').value;
    const docFiles = document.getElementById('detailProdDocs').files;
    if (!id || !docFiles || docFiles.length === 0) return;

    try {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;

        let targetFolderId = DRIVE_ROOT_FOLDER_ID;
        let documentDriveUrls = p.documentDriveUrls || p.documents || p.docs || [];

        document.getElementById('btnUploadDetailDocs').style.display = 'none';
        
        // Show detail progress bar
        document.getElementById('detailUploadProgressContainer').style.display = 'block';
        document.getElementById('detailUploadProgressText').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> ขอ URL อัปโหลด...';
        document.getElementById('detailUploadProgressBar').style.width = '0%';
        document.getElementById('detailUploadProgressPercent').innerText = '0%';

        // Setup folder
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
            console.warn("Failed to create folder, using root", e);
        }

        // Upload files
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
                    if (gasResult.status !== 'success' || !gasResult.token) throw new Error('GAS error: ' + gasResult.error);

                    document.getElementById('detailUploadProgressText').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด (' + file.name + ')...';

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
                            document.getElementById('detailUploadProgressBar').style.width = pct + '%';
                            document.getElementById('detailUploadProgressPercent').innerText = pct + '%';
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

        document.getElementById('detailUploadProgressText').innerHTML = '<i class="fa-solid fa-check"></i> เสร็จสิ้น!';
        
        // Update Firestore
        await updateDoc(doc(db, 'products', id), {
            documentDriveUrls: documentDriveUrls,
            updatedAt: Timestamp.now()
        });

        document.getElementById('detailUploadProgressContainer').style.display = 'none';
        document.getElementById('detailDocsPreview').innerHTML = '';
        document.getElementById('detailProdDocs').value = '';
        
        Swal.fire('สำเร็จ', 'อัปโหลดเอกสารเพิ่มเติมเรียบร้อยแล้ว', 'success');
        
        // Refresh product list and re-open details
        await fetchProducts();
        viewProductDetails(id);

    } catch(err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'อัปโหลดล้มเหลว: ' + err.message, 'error');
        document.getElementById('btnUploadDetailDocs').style.display = 'block';
        document.getElementById('detailUploadProgressContainer').style.display = 'none';
    }
});
`;
// Insert logic right before window.viewProductDetails
html = html.replace(/window\.viewProductDetails =/, newJsLogic + '\nwindow.viewProductDetails =');

// 4. Update viewProductDetails to clear old upload state and set detailProdId
html = html.replace(/document\.getElementById\("detailName"\)\.innerText = pName;/, `
        document.getElementById("detailProdId").value = id;
        document.getElementById("detailDocsPreview").innerHTML = '';
        document.getElementById("detailProdDocs").value = '';
        document.getElementById("btnUploadDetailDocs").style.display = 'none';
        document.getElementById("detailUploadProgressContainer").style.display = 'none';
        
        document.getElementById("detailName").innerText = pName;
`);

// 5. Update saveProduct to remove prodDocs references
html = html.replace(/const docFiles = document\.getElementById\("prodDocs"\)\.files;\n/, '');
html = html.replace(/if \(docFiles\.length > 0\) {[\s\S]*?\}\s*const productData/, 'const productData');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Moved document upload to Details modal.');
