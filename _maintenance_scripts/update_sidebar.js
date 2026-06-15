const fs = require('fs');

const filesToUpdate = [
    'dashboard.html',
    'quotation.html',
    'external_training.html',
    'products.html',
    'console_admin.html'
];

for (const file of filesToUpdate) {
    const filePath = `d:/Mentra_Solution/mentra-manager/${file}`;
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');

    // Make sure we haven't already added it
    if (html.includes('id="nav-products"')) {
        // If it's already there, maybe just update the active states?
        // But let's assume we just want to ensure it's there
        if (file === 'products.html') {
            html = html.replace(/<button class="nav-item active" onclick="window\.location\.href='external_training\.html'" id="nav-training">/, `<button class="nav-item" onclick="window.location.href='external_training.html'" id="nav-training">`);
            html = html.replace(/<button class="nav-item" onclick="window\.location\.href='products\.html'" id="nav-products">[\s\S]*?<\/button>/, `<button class="nav-item active" onclick="window.location.href='products.html'" id="nav-products">\n                <div class="nav-icon">📦</div>\n                <span class="nav-label">จัดการสินค้า</span>\n            </button>`);
        }
    } else {
        // Not added yet. Let's find the external training button.
        const targetStr = `id="nav-training">
                <div class="nav-icon">🎓</div>
                <span class="nav-label">ระบบตารางจัดอบรม</span>
            </button>`;
        
        // Wait, some pages might have it active.
        // Let's use a regex to find the whole button block.
        const regex = /(<button class="nav-item.*?id="nav-training">[\s\S]*?<\/button>)/;
        
        const newMenuItem = `\n            <button class="nav-item${file === 'products.html' ? ' active' : ''}" onclick="window.location.href='products.html'" id="nav-products">
                <div class="nav-icon">📦</div>
                <span class="nav-label">จัดการสินค้า</span>
            </button>`;

        html = html.replace(regex, `$1${newMenuItem}`);
        
        // Fix active class for products.html
        if (file === 'products.html') {
            html = html.replace(/<button class="nav-item active" onclick="window\.location\.href='external_training\.html'" id="nav-training">/, `<button class="nav-item" onclick="window.location.href='external_training.html'" id="nav-training">`);
        }
    }

    fs.writeFileSync(filePath, html);
    console.log(`Updated sidebar in ${file}`);
}
