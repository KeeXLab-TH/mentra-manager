const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', 'utf8');

// 1. Change Grid HTML to Table HTML
const oldGrid = `<div id="productsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
            <!-- Render products here -->
        </div>`;
const newGrid = `<div class="table-responsive" style="background: white; border-radius: 12px; border: 1px solid var(--border); overflow: hidden;">
            <table class="mentra-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; text-align: left; border-bottom: 2px solid var(--border);">
                        <th style="padding: 16px; font-weight: 700; color: #475569; width: 80px; text-align: center;">รูปภาพ</th>
                        <th style="padding: 16px; font-weight: 700; color: #475569;">ชื่อวัสดุอุปกรณ์</th>
                        <th style="padding: 16px; font-weight: 700; color: #475569;">ร้านค้า / ช่องทางติดต่อ</th>
                        <th style="padding: 16px; font-weight: 700; color: #475569;">ราคา (บาท)</th>
                        <th style="padding: 16px; font-weight: 700; color: #475569; width: 140px; text-align: center;">จัดการ</th>
                    </tr>
                </thead>
                <tbody id="productsGrid">
                    <!-- Render rows here -->
                </tbody>
            </table>
        </div>`;
html = html.replace(oldGrid, newGrid);

// 2. Add prodShopLink to Modal Form
const oldFormMfg = `<div class="form-group" style="margin-bottom: 16px;">
                    <label>บริษัทที่ผลิต / แบรนด์ <span class="required">*</span></label>
                    <input type="text" id="prodMfg" class="form-input" required placeholder="เช่น Mentra Solution">
                </div>`;
const newFormMfg = `<div class="form-group" style="margin-bottom: 16px;">
                    <label>ร้านค้า / ช่องทางติดต่อ <span class="required">*</span></label>
                    <input type="text" id="prodMfg" class="form-input" required placeholder="เช่น Shopee, ร้าน กขค">
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label>ลิงก์ร้านค้า (URL) <span style="color:var(--text-secondary); font-size:12px; font-weight:normal;">(ตัวเลือก)</span></label>
                    <input type="url" id="prodShopLink" class="form-input" placeholder="เช่น https://shopee.co.th/...">
                </div>`;
html = html.replace(oldFormMfg, newFormMfg);

// 3. Add ShopLink Badge to Detail Pane
const oldDetailMfg = `<span class="badge" style="background: #f1f5f9; color: #475569; padding: 12px 20px; border-radius: 24px; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-building"></i> <span id="paneDetailMfg"></span></span>`;
const newDetailMfg = `<span class="badge" style="background: #f1f5f9; color: #475569; padding: 12px 20px; border-radius: 24px; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-store"></i> <span id="paneDetailMfg"></span></span>
                                    <a id="paneDetailShopLink" href="#" target="_blank" class="badge" style="display:none; background: #e0f2fe; color: #0284c7; padding: 12px 20px; border-radius: 24px; font-weight: 600; font-size: 15px; align-items: center; gap: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15); transition: 0.2s;"><i class="fa-solid fa-arrow-up-right-from-square"></i> สั่งซื้อ / เปิดลิงก์ร้านค้า</a>`;
html = html.replace(oldDetailMfg, newDetailMfg);

// 4. Update renderProducts JS
const oldRenderRegex = /function renderProducts\(\) \{[\s\S]*?grid\.appendChild\(card\);\s*\n\s*\}\);\n\s*\}/;
const newRender = `function renderProducts() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    if (currentProducts.length === 0) {
        grid.innerHTML = \`<tr><td colspan="5" style="text-align: center; padding: 60px; color: var(--text-secondary);">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; color: var(--border);"></i>
            <h3 style="margin-bottom: 8px;">ยังไม่มีวัสดุอุปกรณ์ในระบบ</h3>
            <p>คลิก "เพิ่มวัสดุอุปกรณ์ใหม่" เพื่อเริ่มต้น</p>
        </td></tr>\`;
        return;
    }

    currentProducts.forEach(p => {
        const pName = p.name || p.title || p.productName || 'ไม่ระบุชื่อวัสดุอุปกรณ์';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || 'ไม่ระบุร้านค้า';
        const pPrice = p.price || p.cost || 0;
        let pImgUrl = getDriveImageUrl(p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl, p.fileId);
        const priceFmt = pPrice.toLocaleString();
        
        const shopLinkHtml = p.shopLink ? \`<a href="\${p.shopLink}" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; padding: 4px 8px; background: #eff6ff; border-radius: 6px;"><i class="fa-solid fa-link"></i> ลิงก์ร้านค้า</a>\` : '';

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        tr.style.transition = "0.2s";
        tr.onmouseover = () => tr.style.background = "#f8fafc";
        tr.onmouseout = () => tr.style.background = "transparent";
        tr.innerHTML = \`
            <td style="padding: 16px; text-align: center; cursor: pointer;" onclick="viewProductDetail('\${p.id}')">
                <img src="\${pImgUrl}" style="width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border); background: white;" onerror="this.src='assets/img/logo.png'" referrerpolicy="no-referrer">
            </td>
            <td style="padding: 16px; font-weight: 700; color: var(--text); cursor: pointer;" onclick="viewProductDetail('\${p.id}')">
                \${pName}
            </td>
            <td style="padding: 16px; cursor: pointer;" onclick="viewProductDetail('\${p.id}')">
                <div style="font-weight: 600; color: #475569;">\${pMfg}</div>
                \${shopLinkHtml}
            </td>
            <td style="padding: 16px; font-weight: 700; color: #059669; font-size: 16px; cursor: pointer;" onclick="viewProductDetail('\${p.id}')">
                \${priceFmt} ฿
            </td>
            <td style="padding: 16px; text-align: center;">
                <button class="btn-action" onclick="viewProductDetail('\${p.id}')" style="padding: 8px 12px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; cursor: pointer; margin-right: 4px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-action" onclick="editProduct('\${p.id}')" style="padding: 8px 12px; background: #e0f2fe; color: #0284c7; border: none; border-radius: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'"><i class="fa-solid fa-pen"></i></button>
            </td>
        \`;
        grid.appendChild(tr);
    });
}`;
html = html.replace(oldRenderRegex, newRender);

// 5. Update saveProduct JS to include shopLink
html = html.replace(/const productData = \{[\s\S]*?manufacturer: document\.getElementById\("prodMfg"\)\.value,/, 
`const productData = {
                name: document.getElementById("prodName").value,
                manufacturer: document.getElementById("prodMfg").value,
                shopLink: document.getElementById("prodShopLink") ? document.getElementById("prodShopLink").value : '',`);

// 6. Update viewProductDetail JS to handle shopLink
const oldViewRegex = /document\.getElementById\("paneDetailMfg"\)\.textContent = pMfg;/;
const newView = `document.getElementById("paneDetailMfg").textContent = pMfg;
    if (p.shopLink) {
        document.getElementById("paneDetailShopLink").href = p.shopLink;
        document.getElementById("paneDetailShopLink").style.display = "flex";
    } else {
        document.getElementById("paneDetailShopLink").style.display = "none";
    }`;
html = html.replace(oldViewRegex, newView);

// 7. Update editProduct JS to populate shopLink
html = html.replace(/document\.getElementById\("prodMfg"\)\.value = p\.manufacturer \|\| p\.brand \|\| '';/, 
`document.getElementById("prodMfg").value = p.manufacturer || p.brand || p.shopName || '';
    if (document.getElementById("prodShopLink")) document.getElementById("prodShopLink").value = p.shopLink || '';`);

// 8. Update openProductModal to clear shopLink
html = html.replace(/document\.getElementById\("prodMfg"\)\.value = "";/,
`document.getElementById("prodMfg").value = "";
    if (document.getElementById("prodShopLink")) document.getElementById("prodShopLink").value = "";`);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', html);
console.log("Equipments page converted to list and added shop link!");
