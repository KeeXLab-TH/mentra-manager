const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// Add referrerpolicy="no-referrer" to the product card image
html = html.replace(/<img src="\$\{pImgUrl\}" alt="\$\{pName\}" class="product-card-img" onerror="this\.src='assets\/img\/logo\.png'">/g, 
'<img src="${pImgUrl}" alt="${pName}" class="product-card-img" referrerpolicy="no-referrer" onerror="this.src=\\\'assets/img/logo.png\\\'">');

// Add referrerpolicy to paneDetailImg
html = html.replace(/<img id="paneDetailImg" src="" style="/g, '<img id="paneDetailImg" src="" referrerpolicy="no-referrer" style="');

// Add referrerpolicy to imagePreviewImg
html = html.replace(/<img id="imagePreviewImg" style="([^"]+)" onerror="this\.style\.display='none'">/g, '<img id="imagePreviewImg" style="$1" referrerpolicy="no-referrer" onerror="this.style.display=\\\'none\\\'">');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Added referrerpolicy="no-referrer" to images');
