const fs = require('fs');
let js = fs.readFileSync('assets/js/app-ui.js', 'utf8');

js = js.replace(
    /if \(page === 'index\.html' \|\| page === ''\) return;/g,
    '// Removed to allow mobile nav to appear on dynamically loaded pages'
);

fs.writeFileSync('assets/js/app-ui.js', js);
console.log('Successfully updated app-ui.js');
