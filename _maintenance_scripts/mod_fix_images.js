const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

const getDriveImageFunc = `
function getDriveImageUrl(url, fileId) {
    if (!url) return 'assets/img/placeholder.png';
    let id = fileId || null;
    
    if (!id) {
        // Match /d/ID/ or /d/ID
        let match = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/);
        if (match) id = match[1];
        else {
            // Match ?id=ID or &id=ID
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }
    }
    
    if (id) {
        return \`https://drive.google.com/thumbnail?id=\${id}&sz=w1000\`;
    }
    return url;
}
`;

// Insert the helper function right before renderProducts
html = html.replace(/function renderProducts\(\)/, getDriveImageFunc + '\nfunction renderProducts()');

// Replace the image url parsing logic in renderProducts
html = html.replace(/let pImgUrl = p\.imageDriveUrl[\s\S]*?const priceFmt = pPrice\.toLocaleString\(\);/g, 
`let pImgUrl = getDriveImageUrl(p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl, p.fileId);
        const priceFmt = pPrice.toLocaleString();`);

// Replace the image url parsing logic in viewProductDetails
html = html.replace(/let pImgUrl = p\.imageDriveUrl[\s\S]*?const pDocs = p\.documentDriveUrls/g,
`let pImgUrl = getDriveImageUrl(p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl, p.fileId);
        const pDocs = p.documentDriveUrls`);

html = html.replace(/if \(pImgUrl\.includes\('export=download'\) && p\.fileId\) \{[\s\S]*?\}\s*const pdpi = document\.getElementById/g, 
`const pdpi = document.getElementById`);

// Replace the image url parsing logic in editProduct
html = html.replace(/const pImgUrl = p\.imageDriveUrl \|\| p\.imageUrl \|\| p\.image \|\| p\.imgUrl \|\| p\.picture \|\| p\.fileUrl \|\| '';\s*const pDocs = p\.documentDriveUrls/g,
`const pImgUrl = getDriveImageUrl(p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl, p.fileId);
        const pDocs = p.documentDriveUrls`);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed Google Drive image URL loading.');
