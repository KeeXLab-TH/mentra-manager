const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add project-detail-layout CSS if not exists
if (!html.includes('.project-detail-layout')) {
    const layoutCss = `
        .project-detail-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            align-items: start;
        }
        @media (max-width: 900px) {
            .project-detail-layout {
                grid-template-columns: 1fr;
            }
        }
    `;
    html = html.replace(/<\/style>/, layoutCss + '\n    </style>');
}

// 2. Add paneDetailView to dynamicMainContentArea
const paneDetailHtml = `
                <!-- VIEW 2: PRODUCT DETAIL PANE -->
                <div class="view-content-pane" id="paneDetailView" style="display: none; flex-direction: column;">
                    <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <button class="btn-cancel" onclick="closeProductDetail()" style="padding: 10px 20px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: white; border: 1px solid var(--border); cursor: pointer;"><i class="fa-solid fa-arrow-left"></i> กลับหน้ารวม</button>
                        <div style="display: flex; gap: 12px;">
                            <button class="btn-edit" id="btnPaneEdit" style="padding: 10px 20px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: #e0f2fe; color: #0284c7; border: none; cursor: pointer;"><i class="fa-solid fa-pen-to-square"></i> แก้ไขข้อมูล</button>
                            <button class="btn-delete" id="btnPaneDelete" style="padding: 10px 20px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: white; color: #ef4444; border: 1px solid #fca5a5; cursor: pointer;"><i class="fa-solid fa-trash-can"></i> ลบสินค้า</button>
                        </div>
                    </div>
                    
                    <div class="project-detail-layout">
                        <!-- LEFT: Product Info -->
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                                <div style="text-align: center; margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                                    <img id="paneDetailImg" src="" style="max-width: 100%; max-height: 320px; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                </div>
                                <h2 id="paneDetailName" style="font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 16px; line-height: 1.3;"></h2>
                                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                    <span class="badge" style="background: #f1f5f9; color: #475569; padding: 12px 20px; border-radius: 24px; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-building"></i> <span id="paneDetailMfg"></span></span>
                                    <span class="badge" style="background: #ecfdf5; color: #059669; padding: 12px 20px; border-radius: 24px; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);"><i class="fa-solid fa-tag"></i> <span id="paneDetailPrice"></span> ฿</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- RIGHT: Documents -->
                        <div style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                            <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 20px; display:flex; align-items:center; gap:8px; color: var(--text);"><i class="fa-solid fa-folder-open" style="color: var(--primary);"></i> เอกสารและไฟล์แนบ</h3>
                            
                            <div id="paneDetailDocs" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                                <!-- Existing docs listed here -->
                            </div>
                            
                            <!-- Upload Zone -->
                            <div style="border-top: 1px dashed var(--border); padding-top: 24px;">
                                <input type="hidden" id="paneDetailProdId">
                                <label for="paneDetailProdDocs" class="file-drop-zone docs-zone" style="padding: 24px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; transition: 0.2s;">
                                    <i class="fa-solid fa-cloud-arrow-up drop-icon" style="font-size: 36px; color: #94a3b8; margin-bottom: 12px;"></i>
                                    <span class="drop-text" style="font-size: 15px; font-weight: 600; color: var(--text);">ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลดเอกสาร</span>
                                    <span class="drop-hint" style="font-size: 13px; color: var(--text-secondary); margin-top: 6px;">รองรับ PDF, DOCX, XLSX (อัปโหลดได้หลายไฟล์พร้อมกัน)</span>
                                </label>
                                <input type="file" id="paneDetailProdDocs" multiple style="display: none;">
                                
                                <div id="paneDetailDocsPreview" style="margin-top: 16px; font-size: 14px; display: flex; flex-direction: column; gap: 8px;"></div>
                                
                                <button type="button" id="btnPaneUploadDocs" style="display: none; width: 100%; margin-top: 16px; padding: 14px; background: var(--primary); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);"><i class="fa-solid fa-cloud-arrow-up"></i> บันทึกและเริ่มอัปโหลดไฟล์</button>
                                
                                <div id="paneUploadProgressContainer" style="display: none; margin-top: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                                    <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px;">
                                        <span id="paneUploadProgressText"><i class="fa-solid fa-cloud-arrow-up"></i> กำลังเตรียมอัปโหลด...</span>
                                        <span id="paneUploadProgressPercent">0%</span>
                                    </div>
                                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                                        <div id="paneUploadProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), #3b82f6); transition: width 0.1s ease; border-radius: 4px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`;

if (!html.includes('id="paneDetailView"')) {
    html = html.replace(/<\/div>\s*<\/div>\s*<!-- Add Product Modal -->/, '                </div>\n' + paneDetailHtml + '\n            </div>\n\n<!-- Add Product Modal -->');
}

// 3. Remove the old productDetailsModal
html = html.replace(/<!-- Product Details Modal -->[\s\S]*?<\/div>\s*<\/div>/, '');

// 4. Update JS logic
const newJsLogic = `
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
                htmlStr += \`<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid var(--border); border-radius: 10px;">
                    <i class="fa-solid fa-file-arrow-up" style="color: var(--primary); font-size: 18px;"></i>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: var(--text);">\${this.files[i].name}</span>
                    <span style="color: #64748b; font-size: 13px; font-weight: 500;">\${(this.files[i].size / 1024 / 1024).toFixed(2)} MB</span>
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
            pImgUrl = \`https://drive.google.com/thumbnail?id=\${p.fileId}&sz=w1000\`;
        } else if (pImgUrl.includes('/view')) {
            const match = pImgUrl.match(/\\/d\\/([a-zA-Z0-9_-]+)\\//);
            if (match) {
                pImgUrl = \`https://drive.google.com/thumbnail?id=\${match[1]}&sz=w1000\`;
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
            docsContainer.innerHTML = pDocs.map((url, i) => \`
                <a href="\${url}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--text); transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='var(--primary)'; this.style.background='white'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--border)'; this.style.background='#f8fafc'; this.style.transform='translateY(0)';">
                    <div style="width: 40px; height: 40px; background: #fee2e2; color: #ef4444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">เอกสารแนบชุดที่ \${i+1}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">คลิกเพื่อเปิดดูหรือดาวน์โหลดไฟล์</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: #cbd5e1; font-size: 14px;"></i>
                </a>
            \`).join('');
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
`;

html = html.replace(/const detailDocEl[\s\S]*?window\.viewProductDetails = \(id\) => {[\s\S]*?};\s*/, newJsLogic);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Switched to Pane Detail View like dashboard');
