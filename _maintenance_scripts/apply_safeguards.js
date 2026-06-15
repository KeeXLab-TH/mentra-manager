const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add null check to addEventListener
html = html.replace(/document\.getElementById\('prodImage'\)\.addEventListener/g, 'const imgEl = document.getElementById(\'prodImage\'); if(imgEl) imgEl.addEventListener');

// 2. Fix the image parsing for old Google Drive export links
html = html.replace(
    /const pImgUrl = p\.imageDriveUrl[\s\S]*?;/,
    `let pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || 'assets/img/placeholder.png';
        if (pImgUrl.includes('export=download') && p.fileId) {
            pImgUrl = \`https://drive.google.com/thumbnail?id=\${p.fileId}&sz=w1000\`;
        } else if (pImgUrl.includes('/view')) {
            const match = pImgUrl.match(/\\/d\\/([a-zA-Z0-9_-]+)\\//);
            if (match) {
                pImgUrl = \`https://drive.google.com/thumbnail?id=\${match[1]}&sz=w1000\`;
            }
        }`
);

// 3. Make sure functions are explicitly bound to window with try/catch to prevent breaking
html = html.replace(/window\.openProductModal = \(\) => {/g, 'window.openProductModal = () => { try {');
html = html.replace(/document\.getElementById\("productModal"\)\.style\.display = "flex";\n};/g, 'document.getElementById("productModal").style.display = "flex"; } catch(e) { console.error("openProductModal error", e); Swal.fire("Error", e.message, "error"); } };');

html = html.replace(/window\.editProduct = \(id\) => {/g, 'window.editProduct = (id) => { try {');
html = html.replace(/document\.getElementById\("productModal"\)\.style\.display = "flex";\n};/g, 'document.getElementById("productModal").style.display = "flex"; } catch(e) { console.error("editProduct error", e); Swal.fire("Error", e.message, "error"); } };');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Safeguards and fixes applied.');
