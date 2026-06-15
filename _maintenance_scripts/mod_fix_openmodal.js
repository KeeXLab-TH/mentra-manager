const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Remove docsPreview clear from openProductModal
html = html.replace(/document\.getElementById\("docsPreview"\)\.innerHTML = "";\s*/, '');

// 2. Add uploadProgressContainer if missing
const uploadProgressHtml = `
                    <div id="uploadProgressContainer" style="display: none; margin-top: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                            <span id="uploadProgressText"><i class="fa-solid fa-cloud-arrow-up"></i> กำลังเตรียมอัปโหลด...</span>
                            <span id="uploadProgressPercent">0%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                            <div id="uploadProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), #3b82f6); transition: width 0.1s ease; border-radius: 4px;"></div>
                        </div>
                    </div>
`;

if (!html.includes('id="uploadProgressContainer"')) {
    html = html.replace(/(<div id="imagePreview"[\s\S]*?<\/div>)\s*<\/div>\s*<\/form>/, '$1' + '\n' + uploadProgressHtml + '\n                </div>\n            </form>');
}

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed missing docsPreview in openProductModal and added uploadProgressContainer.');
