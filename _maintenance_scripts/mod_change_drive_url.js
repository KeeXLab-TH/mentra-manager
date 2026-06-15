const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

html = html.replace(/return \`https:\/\/drive\.google\.com\/thumbnail\?id=\$\{id\}&sz=w1000\`;/, "return `https://drive.google.com/uc?export=view&id=${id}`;");

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Changed getDriveImageUrl to use uc?export=view');
