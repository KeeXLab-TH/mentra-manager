const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

html = html.replace(/<title>.*?<\/title>/g, '<title>ระบบจัดการสินค้า (Products) — Mentra Manager</title>');

const topbarEndIndex = html.indexOf('</header>', html.indexOf('<!-- TOPBAR -->')) + 9;
let topPart = html.substring(0, topbarEndIndex);

let newHtml = topPart + `

    <!-- === PAGE CONTENT === -->
    <div class="dashboard-content" style="padding: 24px;">
        <h2 style="margin-bottom: 24px;">ระบบจัดการสินค้า (Products)</h2>
        <div id="productsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
            <!-- Render products here -->
        </div>
    </div>

</div> <!-- main-wrapper -->

<!-- Add Product Modal -->
<div class="modal-overlay" id="productModal">
    <div class="modal-container" style="max-width: 600px;">
        <header class="modal-header">
            <h3 id="productModalTitle"><i class="fa-solid fa-box"></i> เพิ่มสินค้าใหม่</h3>
            <button class="btn-close-modal" onclick="closeModal('productModal')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </header>
        <div class="modal-body" style="padding: 24px;">
            <form id="productForm">
                <input type="hidden" id="prodId">
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label>ชื่อสินค้า <span class="required">*</span></label>
                    <input type="text" id="prodName" class="form-input" required placeholder="เช่น PLC Trainer Board">
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                    <label>บริษัทที่ผลิต / แบรนด์ <span class="required">*</span></label>
                    <input type="text" id="prodMfg" class="form-input" required placeholder="เช่น Mentra Solution">
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                    <label>ราคาขาย (บาท) <span class="required">*</span></label>
                    <input type="number" id="prodPrice" class="form-input" required placeholder="เช่น 15000" min="0">
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                    <label>อัปโหลดรูปภาพสินค้า <span class="required">*</span></label>
                    <input type="file" id="prodImage" class="form-input" accept="image/*">
                    <div id="imagePreview" style="margin-top: 10px; display: none;">
                        <img id="imagePreviewImg" style="max-width: 100%; height: 200px; object-fit: contain; background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                    <label>เอกสารแนบเพิ่มเติม (PDF, DOCX ฯลฯ)</label>
                    <input type="file" id="prodDocs" class="form-input" multiple>
                    <div id="docsPreview" style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);"></div>
                </div>
            </form>
        </div>
        <footer class="modal-footer" style="justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border);">
            <button type="button" class="btn-cancel" onclick="closeModal('productModal')">ยกเลิก</button>
            <button type="button" class="btn-save" onclick="saveProduct()">บันทึกข้อมูล</button>
        </footer>
    </div>
</div>

<script type="module">
// We will populate this with Firebase and GAS upload logic
</script>
</body>
</html>`;

// Remove specific external_training css
newHtml = newHtml.replace(/<!-- Custom Tooltips & Fixes -->[\s\S]*?(?=<\/style>)/, '');
newHtml = newHtml.replace(/\/\* ===== MAIN WRAPPER ===== \*\/[\s\S]*?(?=<\/style>)/, '');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', newHtml);
