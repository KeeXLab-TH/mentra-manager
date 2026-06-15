const fs = require('fs');
let html = fs.readFileSync('materials_purchasing.html', 'utf8');

// Add main-wrapper class
html = html.replace('<div class="flex-1 flex flex-col min-h-screen overflow-x-hidden">', '<div class="main-wrapper flex-1 flex flex-col min-h-screen overflow-x-hidden">');

fs.writeFileSync('materials_purchasing.html', html);
console.log('Fixed main-wrapper');
