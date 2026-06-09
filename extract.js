const fs = require('fs');
const html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');
const scriptStart = html.indexOf('<script type="module">') + 22;
const scriptEnd = html.lastIndexOf('</script>');
const script = html.substring(scriptStart, scriptEnd);
fs.writeFileSync('d:/Mentra_Solution/mentra-manager/test.js', script);
