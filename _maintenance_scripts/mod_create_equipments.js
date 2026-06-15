const fs = require('fs');
const path = require('path');

const files = [
    'd:/Mentra_Solution/mentra-manager/products.html',
    'd:/Mentra_Solution/mentra-manager/dashboard.html',
    'd:/Mentra_Solution/mentra-manager/quotation.html',
    'd:/Mentra_Solution/mentra-manager/external_training.html',
    'd:/Mentra_Solution/mentra-manager/equipments.html'
];

const newNav = `
            <button class="nav-item" onclick="window.location.href='equipments.html'" id="nav-equipments">
                <div class="nav-icon">🧰</div>
                <span class="nav-label">วัสดุอุปกรณ์</span>
            </button>`;

files.forEach(file => {
    if (fs.existsSync(file)) {
        let html = fs.readFileSync(file, 'utf8');
        
        // Add nav-equipments if not exists
        if (!html.includes('id="nav-equipments"')) {
            html = html.replace(/(<button[^>]*id="nav-products"[^>]*>[\s\S]*?<\/button>)/, `$1${newNav}`);
        }

        // Specific changes for equipments.html
        if (file.includes('equipments.html')) {
            // Fix title
            html = html.replace(/<title>.*?<\/title>/, '<title>วัสดุอุปกรณ์ (Equipments) — Mentra Manager</title>');
            
            // Fix breadcrumbs
            html = html.replace(/<div class="breadcrumb-title">สินค้า.*?<\/div>/, '<div class="breadcrumb-title">วัสดุอุปกรณ์ <span style="white-space: nowrap;">(Equipments)</span></div>');
            html = html.replace(/<div class="breadcrumb-sub">.*?<\/div>/, '<div class="breadcrumb-sub">จัดการข้อมูลวัสดุและอุปกรณ์ต่างๆ</div>');
            
            // Fix h2
            html = html.replace(/<h2>.*?<\/h2>/, '<h2>วัสดุอุปกรณ์ (Equipments)</h2>');
            
            // Fix buttons and labels
            html = html.replace(/เพิ่มสินค้าใหม่/g, 'เพิ่มวัสดุอุปกรณ์ใหม่');
            html = html.replace(/แก้ไขสินค้า/g, 'แก้ไขวัสดุอุปกรณ์');
            html = html.replace(/ลบสินค้า/g, 'ลบวัสดุอุปกรณ์');
            html = html.replace(/รหัสสินค้า/g, 'รหัสวัสดุอุปกรณ์');
            html = html.replace(/ชื่อสินค้า/g, 'ชื่อวัสดุอุปกรณ์');
            html = html.replace(/ภาพสินค้า/g, 'ภาพวัสดุอุปกรณ์');
            html = html.replace(/รายละเอียดสินค้า/g, 'รายละเอียดวัสดุอุปกรณ์');
            html = html.replace(/ยังไม่มีสินค้าในระบบ/g, 'ยังไม่มีวัสดุอุปกรณ์ในระบบ');
            html = html.replace(/บันทึกข้อมูลสินค้าเรียบร้อยแล้ว/g, 'บันทึกข้อมูลวัสดุอุปกรณ์เรียบร้อยแล้ว');
            
            // Fix Firestore collection
            html = html.replace(/'products'/g, "'equipments'");
            
            // Fix active nav
            html = html.replace(/id="nav-products" class="nav-item active"/, 'id="nav-products" class="nav-item"');
            html = html.replace(/class="nav-item active"([^>]*id="nav-products")/, 'class="nav-item"$1'); // fallback
            
            // The nav-equipments button we just inserted might not be active, let's fix it
            html = html.replace(/<button class="nav-item"([^>]*id="nav-equipments")/, '<button class="nav-item active"$1');
        }

        fs.writeFileSync(file, html);
    }
});

console.log("Created equipments.html and updated all sidebars!");
