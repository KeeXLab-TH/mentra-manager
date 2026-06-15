const fs = require('fs');
const quotationHtml = fs.readFileSync('quotation.html', 'utf8');

// Find the start of sidebar CSS in quotation.html
const startTag = '/* ================================================\n           SIDEBAR & MAIN LAYOUT (From dashboard.html)\n           ================================================ */';
const startIndex = quotationHtml.indexOf(startTag);
if(startIndex === -1) {
    console.error('Could not find sidebar CSS in quotation.html');
    process.exit(1);
}

// Find the end of sidebar CSS (before the header-actions or specific quotation styles)
const endTag = '.header-actions {';
const endIndex = quotationHtml.indexOf(endTag, startIndex);
if(endIndex === -1) {
    console.error('Could not find end of sidebar CSS in quotation.html');
    process.exit(1);
}

const sidebarCss = quotationHtml.substring(startIndex, endIndex);

let materialsHtml = fs.readFileSync('materials_purchasing.html', 'utf8');
materialsHtml = materialsHtml.replace('</style>', '\n' + sidebarCss + '\n</style>');
fs.writeFileSync('materials_purchasing.html', materialsHtml);
console.log('Successfully injected sidebar CSS from quotation.html into materials_purchasing.html!');
