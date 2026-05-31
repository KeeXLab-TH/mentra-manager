const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const ts = Date.now();

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    // Replace src="assets/js/app-ui.js" or similar with cache buster
    html = html.replace(/src=["']assets\/js\/app-ui\.js(\?v=\d+)?["']/g, `src="assets/js/app-ui.js?v=${ts}"`);
    fs.writeFileSync(f, html);
});

console.log('Cache busted app-ui.js in all HTML files!');
