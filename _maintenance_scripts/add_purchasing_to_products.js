const fs = require('fs');

let content = fs.readFileSync('products.html', 'utf8');

const navPurchasing = `            <button class="nav-item" onclick="window.location.href='materials_purchasing.html'" id="nav-purchasing">
                <div class="nav-icon">🛒</div>
                <span class="nav-label">จัดการจัดซื้อ / วัสดุ</span>
            </button>\n`;

// Insert it right before nav-products
const insertBefore = '            <button class="nav-item active" onclick="window.location.href=\'products.html\'" id="nav-products">';

if (!content.includes('id="nav-purchasing"')) {
    content = content.replace(insertBefore, navPurchasing + insertBefore);
    fs.writeFileSync('products.html', content);
    console.log('Added nav-purchasing to products.html');
} else {
    console.log('nav-purchasing already exists in products.html');
}
