const fs = require('fs');
const html = fs.readFileSync('products.html', 'utf8');
const start = html.indexOf('<aside');
const end = html.indexOf('</aside>', start);
if(start !== -1 && end !== -1) {
    console.log(html.substring(start, end + 8));
}
