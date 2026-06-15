const fs = require('fs');

const files = [
    'd:/Mentra_Solution/mentra-manager/products.html',
    'd:/Mentra_Solution/mentra-manager/dashboard.html',
    'd:/Mentra_Solution/mentra-manager/quotation.html',
    'd:/Mentra_Solution/mentra-manager/external_training.html'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let html = fs.readFileSync(file, 'utf8');
        
        // Fix sidebar
        html = html.replace(/<span class="nav-label">จัดการสินค้า<\/span>/g, '<span class="nav-label">สินค้า</span>');
        
        // If it's products.html, fix title and h2
        if (file.includes('products.html')) {
            html = html.replace(/<title>ระบบจัดการสินค้า \(Products\) — Mentra Manager<\/title>/g, '<title>สินค้า (Products) — Mentra Manager</title>');
            html = html.replace(/<h2>ระบบจัดการสินค้า \(Products\)<\/h2>/g, '<h2>สินค้า (Products)</h2>');
        }

        fs.writeFileSync(file, html);
    }
});

console.log("Updated sidebar label in all files");
