const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add btn-details CSS
if (!html.includes('.btn-details {')) {
    const btnCss = `
        .btn-details {
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
            background: #e0f2fe;
            color: #0284c7;
        }
        .btn-details:hover {
            background: #bae6fd;
            color: #0369a1;
        }
    `;
    html = html.replace(/\/\* ===== BUTTONS ===== \*\//, btnCss + '\n        /* ===== BUTTONS ===== */');
}

// 2. Change btn-delete to btn-details in renderProducts
html = html.replace(/<button type="button" class="btn-delete" onclick="deleteProduct\('([^']+)'\)">.*?<\/button>/g, 
    '<button type="button" class="btn-details" onclick="viewProductDetails(\'$1\')"><i class="fa-solid fa-circle-info"></i> รายละเอียด</button>'
);

// 3. Add Product Details Modal HTML
const detailsModalHtml = `
<!-- Product Details Modal -->
<div class="modal-overlay" id="productDetailsModal">
    <div class="modal-container" style="max-width: 600px;">
        <header class="modal-header">
            <h3 id="detailModalTitle" style="display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-box-open" style="color:var(--primary);"></i> รายละเอียดสินค้า</h3>
            <button class="btn-close-modal" onclick="closeModal('productDetailsModal')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </header>
        <div class="modal-body" style="padding: 24px;">
            <div style="text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid var(--border);">
                <img id="detailImg" src="" style="max-width: 100%; max-height: 280px; border-radius: 8px; object-fit: contain;">
            </div>
            <h2 id="detailName" style="font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; line-height: 1.3;"></h2>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
                <span class="badge" style="background: #f1f5f9; color: #475569; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-building"></i> <span id="detailMfg"></span>
                </span>
                <span class="badge" style="background: #ecfdf5; color: #059669; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 15px; display:flex; align-items:center; gap:6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
                    <i class="fa-solid fa-tag"></i> <span id="detailPrice"></span> ฿
                </span>
            </div>
            <div id="detailDocsContainer" style="margin-top: 20px;">
                <h4 style="font-size: 15px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-lines"></i> เอกสารอ้างอิง</h4>
                <div id="detailDocs" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- documents here -->
                </div>
            </div>
        </div>
        <footer class="modal-footer" style="display: flex; justify-content: space-between; padding: 16px 24px; border-top: 1px solid var(--border); background: #f8fafc;">
            <button type="button" class="btn-delete" id="detailDeleteBtn" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; background: white; color: #ef4444; border: 1px solid #fca5a5; cursor: pointer; transition: 0.2s; display:flex; align-items:center; gap:6px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='white'"><i class="fa-solid fa-trash-can"></i> ลบสินค้านี้</button>
            <div style="display: flex; gap: 12px;">
                <button type="button" class="btn-cancel" onclick="closeModal('productDetailsModal')" style="padding: 10px 20px; border-radius: 10px;">ปิด</button>
                <button type="button" class="btn-save" id="detailEditBtn" style="padding: 10px 24px; border-radius: 10px;"><i class="fa-solid fa-pen-to-square"></i> แก้ไขข้อมูล</button>
            </div>
        </footer>
    </div>
</div>
`;
if (!html.includes('id="productDetailsModal"')) {
    html = html.replace(/<!-- Add Product Modal -->/, detailsModalHtml + '\n\n<!-- Add Product Modal -->');
}

// 4. Add progress bar UI to Product Modal
const progressBarHtml = `
                <div id="uploadProgressContainer" style="display: none; margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        <span id="uploadProgressText"><i class="fa-solid fa-cloud-arrow-up"></i> กำลังอัปโหลด...</span>
                        <span id="uploadProgressPercent">0%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                        <div id="uploadProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), #3b82f6); transition: width 0.1s ease; border-radius: 4px;"></div>
                    </div>
                </div>
`;
if (!html.includes('id="uploadProgressContainer"')) {
    html = html.replace(/<\/form>/, progressBarHtml + '\n            </form>');
}

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Modified HTML structure.');
