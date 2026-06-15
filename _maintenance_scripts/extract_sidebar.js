const fs = require('fs');
const html = fs.readFileSync('dashboard.html', 'utf8');
const startIdx = html.indexOf('<aside class="sidebar" id="sidebar">');
const endIdx = html.indexOf('</aside>', startIdx);
if(startIdx !== -1 && endIdx !== -1) {
    console.log(html.substring(startIdx, endIdx + 8));
}
