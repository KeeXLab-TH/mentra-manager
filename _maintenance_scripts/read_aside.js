const fs = require('fs');
const html = fs.readFileSync('materials_purchasing.html', 'utf8');
const start = html.indexOf('<aside');
const end = html.indexOf('</aside>', start);
if(start !== -1 && end !== -1) {
    console.log(html.substring(start, end + 8));
}
