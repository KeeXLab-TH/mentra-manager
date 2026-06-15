const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

html = html.replace(/return \`https:\/\/drive\.google\.com\/uc\?export=view&id=\$\{id\}\`;/, "return `https://lh3.googleusercontent.com/d/${id}=w1000`;");

// Wait, the regex might not match exactly. Let me just replace the whole function.
const getDriveImageFunc = `
function getDriveImageUrl(url, fileId) {
    if (!url) return 'assets/img/placeholder.png';
    let id = fileId || null;
    
    if (!id) {
        let match = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/);
        if (match) id = match[1];
        else {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }
    }
    
    if (id) {
        // Try lh3.googleusercontent.com which is the most reliable for images right now
        return \`https://lh3.googleusercontent.com/d/\${id}=w1000\`;
    }
    return url;
}
`;

html = html.replace(/function getDriveImageUrl\([\s\S]*?return url;\s*\}/, getDriveImageFunc.trim());

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Changed getDriveImageUrl to use lh3.googleusercontent.com');
