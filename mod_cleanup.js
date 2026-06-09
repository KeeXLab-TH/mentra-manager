const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Clean up orphaned footer in HTML
// Find the exact snippet:
//        </div>
//        <footer class="modal-footer" ...> ... </footer>
//                    </div>
//
//                <!-- VIEW 2: PRODUCT DETAIL PANE -->

html = html.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<footer class="modal-footer"[\s\S]*?<\/footer>\s*<\/div>\s*<!-- VIEW 2: PRODUCT DETAIL PANE -->/, '<!-- VIEW 2: PRODUCT DETAIL PANE -->');

// 2. Clean up orphaned JS
// Find the exact snippet:
// };
// document.getElementById("detailDeleteBtn").onclick = () => {
// ...
//     } catch(e) {
// ...
//     }
// };
html = html.replace(/document\.getElementById\("detailDeleteBtn"\)\.onclick = \(\) => {[\s\S]*?m\.classList\.add\("show"\), 10\);\s*\} catch\(e\) {\s*console\.error\("viewProductDetails error", e\);\s*Swal\.fire\("Error", e\.message, "error"\);\s*\}\s*};\s*/, '');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log("Cleanup completed.");
