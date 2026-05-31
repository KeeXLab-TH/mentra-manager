const fs = require('fs');
let c = fs.readFileSync('assets/css/app-theme.css', 'utf8');

// Regex to remove all top-level [data-theme="dark"] rules
let prev;
do {
    prev = c;
    c = c.replace(/\[data-theme=["']dark["']\][^{]*\{[^{}]*\}/g, '');
} while (prev !== c);

// Handle nested rules (like inside media queries)
do {
    prev = c;
    c = c.replace(/\[data-theme=["']dark["']\][^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
} while (prev !== c);

fs.writeFileSync('assets/css/app-theme.css', c);
console.log('Removed dark mode from css');
