const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add Drop Zone CSS
if (!html.includes('.file-drop-zone')) {
    const css = `
        .file-drop-zone {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            margin-top: 8px;
        }
        .file-drop-zone:hover {
            background: #f1f5f9;
            border-color: var(--primary);
        }
        .file-drop-zone .drop-icon {
            font-size: 32px;
            color: #94a3b8;
            margin-bottom: 12px;
            transition: color 0.2s ease;
        }
        .file-drop-zone:hover .drop-icon {
            color: var(--primary);
        }
        .file-drop-zone .drop-text {
            font-size: 15px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 4px;
        }
        .file-drop-zone .drop-hint {
            font-size: 13px;
            color: var(--text-secondary);
        }
        .docs-zone {
            padding: 16px;
        }
        .docs-zone .drop-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
    `;
    html = html.replace(/\/\* ===== BUTTONS ===== \*\//, css + '\n        /* ===== BUTTONS ===== */');
}

// 2. Replace Image Upload Input HTML
const newImgInput = `
                    <label>อัปโหลดรูปภาพสินค้า <span class="required">*</span></label>
                    <label for="prodImage" class="file-drop-zone">
                        <i class="fa-solid fa-cloud-arrow-up drop-icon"></i>
                        <span class="drop-text">คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวางที่นี่</span>
                        <span class="drop-hint">รองรับ JPG, PNG, WEBP (แนะนำขนาดไม่เกิน 5MB)</span>
                    </label>
                    <input type="file" id="prodImage" accept="image/*" style="display: none;">
                    <div id="imagePreview" style="margin-top: 16px; display: none; text-align: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                        <span style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">ภาพตัวอย่าง</span>
                        <img id="imagePreviewImg" style="max-width: 100%; height: 200px; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" onerror="this.style.display='none'">
                    </div>
`;
html = html.replace(/<label>อัปโหลดรูปภาพสินค้า <span class="required">\*<\/span><\/label>[\s\S]*?<\/div>\s*<\/div>/, newImgInput.trim() + '\n                </div>');

// 3. Replace Document Upload Input HTML
const newDocInput = `
                    <label>เอกสารแนบเพิ่มเติม (PDF, DOCX ฯลฯ)</label>
                    <label for="prodDocs" class="file-drop-zone docs-zone">
                        <i class="fa-solid fa-file-circle-plus drop-icon"></i>
                        <span class="drop-text">คลิกเพื่อเลือกไฟล์เอกสาร (เลือกได้หลายไฟล์)</span>
                    </label>
                    <input type="file" id="prodDocs" multiple style="display: none;">
                    <div id="docsPreview" style="margin-top: 12px; font-size: 14px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px;"></div>
`;
html = html.replace(/<label>เอกสารแนบเพิ่มเติม \(PDF, DOCX ฯลฯ\)<\/label>[\s\S]*?<\/div>\s*<\/div>/, newDocInput.trim() + '\n                </div>');

// 4. Add JavaScript listener for prodDocs
const docScript = `
const docEl = document.getElementById('prodDocs');
if (docEl) {
    docEl.addEventListener('change', function(e) {
        const preview = document.getElementById('docsPreview');
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
        } else {
            preview.innerHTML = '';
        }
    });
}
`;
html = html.replace(/\/\/ Handle Image Preview/, docScript + '\n// Handle Image Preview');

// 5. Enhance Image Preview script to reset onerror display
html = html.replace(/document\.getElementById\('imagePreviewImg'\)\.src = e\.target\.result;/, `
            const imgTarget = document.getElementById('imagePreviewImg');
            imgTarget.style.display = 'inline-block';
            imgTarget.src = e.target.result;
`);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Applied modern file input styling.');
