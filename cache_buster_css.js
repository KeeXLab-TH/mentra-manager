const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const ts = Date.now();

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    // Replace src="assets/css/app-theme.css" with cache buster
    html = html.replace(/href=["']assets\/css\/app-theme\.css(\?v=\d+)?["']/g, `href="assets/css/app-theme.css?v=${ts}"`);
    fs.writeFileSync(f, html);
});

console.log('Cache busted app-theme.css in all HTML files!');
