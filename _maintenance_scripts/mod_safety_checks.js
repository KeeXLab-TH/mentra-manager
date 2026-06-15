const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add safety checks in openProductModal
html = html.replace(/window\.openProductModal = \(\) => \{ try \{[\s\S]*?Swal\.fire\("Error", e\.message, "error"\); \} \};/, 
`window.openProductModal = () => {
    try {
        const form = document.getElementById("productForm"); if(form) form.reset();
        const prodId = document.getElementById("prodId"); if(prodId) prodId.value = "";
        const title = document.getElementById("productModalTitle"); if(title) title.innerHTML = '<i class="fa-solid fa-box"></i> เพิ่มสินค้าใหม่';
        const imgPreview = document.getElementById("imagePreview"); if(imgPreview) imgPreview.style.display = "none";
        const prog = document.getElementById("uploadProgressContainer"); if(prog) prog.style.display = "none";
        
        const m = document.getElementById("productModal"); 
        if(m) {
            m.style.display = "flex"; 
            setTimeout(() => m.classList.add("show"), 10);
        }
    } catch(e) { 
        console.error("openProductModal error", e); 
        Swal.fire("Error", e.stack, "error"); 
    } 
};`);

// 2. Add safety checks in editProduct
html = html.replace(/window\.editProduct = \(id\) => \{ try \{[\s\S]*?Swal\.fire\("Error", e\.message, "error"\); \} \};/, 
`window.editProduct = (id) => { 
    try {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;

        const pName = p.name || p.title || p.productName || '';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || '';
        const pPrice = p.price || p.cost || 0;
        const pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || '';
        const pDocs = p.documentDriveUrls || p.documents || p.docs || p.files || [];

        const prodId = document.getElementById("prodId"); if(prodId) prodId.value = p.id;
        const prodName = document.getElementById("prodName"); if(prodName) prodName.value = pName;
        const prodMfg = document.getElementById("prodMfg"); if(prodMfg) prodMfg.value = pMfg;
        const prodPrice = document.getElementById("prodPrice"); if(prodPrice) prodPrice.value = pPrice;
        const title = document.getElementById("productModalTitle"); if(title) title.innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไขสินค้า';
        
        const previewContainer = document.getElementById("imagePreview");
        const previewImg = document.getElementById("imagePreviewImg");
        if (pImgUrl) {
            if(previewImg) previewImg.src = pImgUrl;
            if(previewContainer) previewContainer.style.display = "block";
        } else {
            if(previewContainer) previewContainer.style.display = "none";
        }

        const prog = document.getElementById("uploadProgressContainer"); if(prog) prog.style.display = "none";

        const m = document.getElementById("productModal"); 
        if(m) {
            m.style.display = "flex"; 
            setTimeout(() => m.classList.add("show"), 10); 
        }
    } catch(e) { 
        console.error("editProduct error", e); 
        Swal.fire("Error", e.stack, "error"); 
    } 
};`);

// 3. Add safety checks in viewProductDetails
html = html.replace(/document\.getElementById\("paneDetailDocsPreview"\)\.innerHTML = '';\s*document\.getElementById\("paneDetailProdDocs"\)\.value = '';\s*document\.getElementById\("btnPaneUploadDocs"\)\.style\.display = 'none';\s*document\.getElementById\("paneUploadProgressContainer"\)\.style\.display = 'none';/,
`const pdp = document.getElementById("paneDetailDocsPreview"); if(pdp) pdp.innerHTML = '';
        const pdpd = document.getElementById("paneDetailProdDocs"); if(pdpd) pdpd.value = '';
        const bpud = document.getElementById("btnPaneUploadDocs"); if(bpud) bpud.style.display = 'none';
        const pupc = document.getElementById("paneUploadProgressContainer"); if(pupc) pupc.style.display = 'none';`);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Safety checks added to openProductModal, editProduct, and viewProductDetails');
