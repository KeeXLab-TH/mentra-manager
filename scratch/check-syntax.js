const fs = require('fs');
const vm = require('vm');

let code = fs.readFileSync('pages/accounting/quotation.html', 'utf8');
const scriptMatch = code.match(/<script type="module">([\s\S]*?)<\/script>/);
let js = scriptMatch[1];
js = js.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// import removed');
js = js.replace(/export\s+[\s\S]*?;/g, '// export removed');

try {
    new vm.Script('(async () => {\n' + js + '\n})', { filename: 'quotation-module.js' });
    console.log('Script is valid!');
} catch (e) {
    console.error('VM Error:', e);
}
