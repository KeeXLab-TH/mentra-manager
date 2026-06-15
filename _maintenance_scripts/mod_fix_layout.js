const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Give dashboard-content an inner paneListView if it doesn't exist
if (!html.includes('id="paneListView"')) {
    html = html.replace(/<div class="dashboard-content" style="padding: 24px;">/, 
        '<div class="dashboard-content" style="padding: 24px;">\n        <div id="paneListView" style="display: block;">');
    
    html = html.replace(/(<div id="productsGrid"[\s\S]*?<\/div>)\s*<\/div>/, 
        '$1\n        </div> <!-- end paneListView -->\n    </div>');
}

// 2. Move paneDetailView inside dashboard-content
// Currently paneDetailView is AFTER main-wrapper.
// We need to extract it and put it inside dashboard-content, right after paneListView.
const matchDetailView = html.match(/<!-- VIEW 2: PRODUCT DETAIL PANE -->[\s\S]*?(?=<!-- Add Product Modal -->|<div class="modal-overlay" id="productModal">|<script type="module">)/);

if (matchDetailView) {
    const detailHtml = matchDetailView[0];
    
    // Remove it from its current bad location
    html = html.replace(matchDetailView[0], '');
    
    // Insert it after paneListView
    html = html.replace(/<\/div>\s*<!-- end paneListView -->/, '</div> <!-- end paneListView -->\n\n' + detailHtml);
}

// 3. In viewProductDetails, make sure the safety check for docsContainer doesn't throw
// It's already fixed with my previous script, but just to be sure we also don't throw on paneListView
// The previous script added safety checks, but let's confirm the IDs.
html = html.replace(/document\.getElementById\("paneListView"\)\.style\.display = 'none';/g, 'const plv = document.getElementById("paneListView"); if(plv) plv.style.display = "none";');
html = html.replace(/document\.getElementById\("paneDetailView"\)\.style\.display = 'flex';/g, 'const pdv = document.getElementById("paneDetailView"); if(pdv) pdv.style.display = "flex";');

html = html.replace(/document\.getElementById\('paneListView'\)\.style\.display = 'block';/g, 'const plv2 = document.getElementById("paneListView"); if(plv2) plv2.style.display = "block";');
html = html.replace(/document\.getElementById\('paneDetailView'\)\.style\.display = 'none';/g, 'const pdv2 = document.getElementById("paneDetailView"); if(pdv2) pdv2.style.display = "none";');

// Fix the docsContainer in viewProductDetails
html = html.replace(/const docsContainer = document\.getElementById\("paneDetailDocs"\);\s*if \(pDocs && pDocs\.length > 0\) \{/g, 
`const docsContainer = document.getElementById("paneDetailDocs");
        if (docsContainer && pDocs && pDocs.length > 0) {`);

html = html.replace(/\} else \{\s*docsContainer\.innerHTML = /g, `} else if (docsContainer) { docsContainer.innerHTML = `);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed paneListView layout and safety checks.');
