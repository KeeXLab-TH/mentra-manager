const fs = require('fs');
let html = fs.readFileSync('materials_purchasing.html', 'utf8');

// Remove the external stylesheet app-theme.css link since we've injected the required internal CSS block
html = html.replace('<link rel="stylesheet" href="assets/css/app-theme.css">', '');

// Remove the line "display: none; /* Hidden by default until authenticated */" from the newly injected CSS block
html = html.replace(/display:\s*none;\s*\/\*\s*Hidden by default until authenticated\s*\*\//g, '');

fs.writeFileSync('materials_purchasing.html', html);
console.log('Cleaned up materials_purchasing.html');
