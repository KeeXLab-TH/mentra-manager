const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Remove docsPreview logic from editProduct
html = html.replace(/const docsContainer = document\.getElementById\("docsPreview"\);\s*if \(pDocs && pDocs\.length > 0\) {[\s\S]*?docsContainer\.innerHTML = '';\s*}/, '');

// 2. Remove prodDocs event listener which might error or just be dead code
html = html.replace(/const docEl = document\.getElementById\('prodDocs'\);\s*if \(docEl\) {[\s\S]*?preview\.innerHTML = '';\s*}\s*}\);\s*}/, '');

// Also remove image upload logic for docs if any
html = html.replace(/document\.getElementById\('prodDocs'\)\.value = '';/g, '');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed docsPreview innerHTML error.');
