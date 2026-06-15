const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', 'utf8');

// 1. Fix saveProduct to save shopLink
const oldSaveData = `        productData.manufacturer = mfg;`;
const newSaveData = `        productData.manufacturer = mfg;
        productData.shopLink = document.getElementById("prodShopLink") ? document.getElementById("prodShopLink").value.trim() : '';`;
if (!html.includes('productData.shopLink =')) {
    html = html.replace(oldSaveData, newSaveData);
}

// 2. Change image click from new tab to Swal popup
const oldImageHtml = /<a href="\\?\$\{pImgUrl\}" target="_blank" onclick="event\.stopPropagation\(\)" title="คลิกเพื่อดูรูปภาพขนาดเต็ม">\s*<img src="\\?\$\{pImgUrl\}" style="([^"]*)" onerror="this\.src='assets\/img\/logo\.png'" referrerpolicy="no-referrer">\s*<\/a>/g;

const newImageHtml = `<img src="\${pImgUrl}" style="$1" onerror="this.src='assets/img/logo.png'" referrerpolicy="no-referrer" onclick="event.stopPropagation(); Swal.fire({ imageUrl: '\${pImgUrl}', imageAlt: '\${pName}', width: 'auto', padding: 10, showConfirmButton: false, customClass: { popup: 'swal-image-popup' } })" title="คลิกเพื่อดูรูปภาพขนาดเต็ม">`;

html = html.replace(oldImageHtml, newImageHtml);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', html);
console.log("Fixed save logic and image popup!");
