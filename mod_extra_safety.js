const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// Ensure ALL DOM accesses in viewProductDetails are null-safe
html = html.replace(/document\.getElementById\("paneDetailName"\)\.innerText = pName;/g, 'const pdn = document.getElementById("paneDetailName"); if(pdn) pdn.innerText = pName;');
html = html.replace(/document\.getElementById\("paneDetailMfg"\)\.innerText = pMfg;/g, 'const pdm = document.getElementById("paneDetailMfg"); if(pdm) pdm.innerText = pMfg;');
html = html.replace(/document\.getElementById\("paneDetailPrice"\)\.innerText = pPrice\.toLocaleString\(\);/g, 'const pdpr = document.getElementById("paneDetailPrice"); if(pdpr) pdpr.innerText = pPrice.toLocaleString();');
html = html.replace(/document\.getElementById\("paneDetailImg"\)\.src = pImgUrl;/g, 'const pdi = document.getElementById("paneDetailImg"); if(pdi) pdi.src = pImgUrl;');
html = html.replace(/document\.getElementById\("paneDetailProdId"\)\.value = id;/g, 'const pdpi = document.getElementById("paneDetailProdId"); if(pdpi) pdpi.value = id;');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Extra safety checks added.');
