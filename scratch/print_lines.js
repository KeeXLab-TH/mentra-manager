const fs = require('fs');
const html = fs.readFileSync('pages/accounting/quotation.html', 'utf8');
const scriptIndex = html.indexOf('<script type="module">');
const beforeLines = html.slice(0, scriptIndex).split('\n').length;
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
const lines = scriptMatch[1].split('\n');

for (let i = 640; i < 680; i++) {
    const htmlLineNo = beforeLines + i + 1;
    console.log(`Script L${i+1} (HTML L${htmlLineNo}): ${lines[i]}`);
}
