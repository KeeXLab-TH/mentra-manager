const fs = require('fs');
const path = require('path');

const dir = './';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const productsBtnTemplate = `            <button class="nav-item" onclick="window.location.href='products.html'" id="nav-products">
                <div class="nav-icon">📦</div>
                <span class="nav-label">สินค้า</span>
            </button>
`;
const productsBtnActive = `            <button class="nav-item active" onclick="window.location.href='products.html'" id="nav-products">
                <div class="nav-icon">📦</div>
                <span class="nav-label">สินค้า</span>
            </button>
`;

let replacedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    let modified = false;

    // 1. Remove nav-equipments
    const equipRegex = /\s*<button[^>]*id="nav-equipments"[^>]*>[\s\S]*?<\/button>/;
    if (equipRegex.test(content)) {
        content = content.replace(equipRegex, '');
        modified = true;
    }

    // 2. Add nav-products if it doesn't exist
    if (!content.includes('id="nav-products"')) {
        // Find where to insert it. Let's insert it before nav-purchasing, or at the end of the sidebar.
        // Easiest is to insert it right before </nav> inside <aside class="sidebar" id="sidebar">
        const navEndRegex = /(<\/nav>\s*<\/aside>)/;
        if (navEndRegex.test(content)) {
            const btn = file === 'products.html' ? productsBtnActive : productsBtnTemplate;
            content = content.replace(navEndRegex, btn + '$1');
            modified = true;
        }
    }

    // Also, if the page is equipments.html, we don't really care, but we'll modify it anyway.

    if (modified) {
        fs.writeFileSync(path.join(dir, file), content, 'utf8');
        replacedCount++;
        console.log(`Modified menu in ${file}`);
    }
}

console.log(`Finished processing. Modified ${replacedCount} files.`);
