const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

const newRenderProducts = `function renderProducts() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    if (currentProducts.length === 0) {
        grid.innerHTML = \`<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; color: var(--border);"></i>
            <h3>ยังไม่มีสินค้าในระบบ</h3>
            <p>คลิก "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น</p>
        </div>\`;
        return;
    }

    currentProducts.forEach(p => {
        const pName = p.name || p.title || p.productName || 'ไม่ระบุชื่อสินค้า';
        const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || 'ไม่ระบุผู้ผลิต';
        const pPrice = p.price || p.cost || 0;
        const pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || 'assets/img/placeholder.png';
        const priceFmt = pPrice.toLocaleString();
        
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = \`
            <div class="product-card-img-container">
                <img src="\${pImgUrl}" alt="\${pName}" class="product-card-img" onerror="this.src='assets/img/logo.png'">
            </div>
            <div class="product-card-body">
                <div class="product-card-title">\${pName}</div>
                <div class="product-card-mfg"><i class="fa-solid fa-industry"></i> \${pMfg}</div>
                <div class="product-card-price">\${priceFmt} ฿</div>
                <div class="product-card-actions">
                    <button type="button" class="btn-edit" onclick="editProduct('\${p.id}')"><i class="fa-solid fa-pen"></i> แก้ไขข้อมูล</button>
                </div>
            </div>
        \`;
        grid.appendChild(card);
    });
}`;

const newEditProduct = `window.editProduct = (id) => {
    const p = currentProducts.find(x => x.id === id);
    if (!p) return;

    const pName = p.name || p.title || p.productName || '';
    const pMfg = p.manufacturer || p.brand || p.company || p.supplier || p.mfg || '';
    const pPrice = p.price || p.cost || 0;
    const pImgUrl = p.imageDriveUrl || p.imageUrl || p.image || p.imgUrl || p.picture || p.fileUrl || '';
    const pDocs = p.documentDriveUrls || p.documents || p.docs || p.files || [];

    document.getElementById("prodId").value = p.id;
    document.getElementById("prodName").value = pName;
    document.getElementById("prodMfg").value = pMfg;
    document.getElementById("prodPrice").value = pPrice;
    document.getElementById("productModalTitle").innerHTML = '<i class="fa-solid fa-pen"></i> แก้ไขสินค้า';
    
    const previewContainer = document.getElementById("imagePreview");
    const previewImg = document.getElementById("imagePreviewImg");
    if (pImgUrl) {
        previewImg.src = pImgUrl;
        previewContainer.style.display = "block";
    } else {
        previewContainer.style.display = "none";
    }

    const docsContainer = document.getElementById("docsPreview");
    if (pDocs && pDocs.length > 0) {
        docsContainer.innerHTML = pDocs.map(url => \`<a href="\${url}" target="_blank" style="color: var(--primary); text-decoration: none; display: block; margin-top: 4px;"><i class="fa-solid fa-file-pdf"></i> แนบเอกสารแล้ว (คลิกเพื่อดู)</a>\`).join('');
    } else {
        docsContainer.innerHTML = '';
    }

    document.getElementById("productModal").style.display = "flex";
};`;

// Also fix `saveProduct` to preserve ALL original fields
const newSaveProduct = `window.saveProduct = async () => {
    const name = document.getElementById("prodName").value.trim();
    const mfg = document.getElementById("prodMfg").value.trim();
    const price = parseInt(document.getElementById("prodPrice").value);
    const imgFile = document.getElementById("prodImage").files[0];
    const docFiles = document.getElementById("prodDocs").files;

    if (!name || !mfg || isNaN(price)) {
        Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน', 'warning');
        return;
    }

    const id = document.getElementById("prodId").value;

    Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        let oldP = null;
        let imageDriveUrl = '';
        let documentDriveUrls = [];

        if (id) {
            oldP = currentProducts.find(x => x.id === id);
            if (oldP) {
                imageDriveUrl = oldP.imageDriveUrl || oldP.imageUrl || oldP.imgUrl || oldP.image || '';
                documentDriveUrls = oldP.documentDriveUrls || oldP.documents || oldP.docs || [];
            }
        }

        if (imgFile) {
            Swal.update({ text: 'กำลังอัปโหลดรูปภาพสินค้า...' });
            imageDriveUrl = await uploadToDrive(imgFile);
        } else if (!id) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปภาพสินค้า', 'warning');
            return;
        }

        if (docFiles.length > 0) {
            Swal.update({ text: 'กำลังอัปโหลดเอกสารแนบ...' });
            for (let i = 0; i < docFiles.length; i++) {
                const docUrl = await uploadToDrive(docFiles[i]);
                documentDriveUrls.push(docUrl);
            }
        }

        const productData = oldP ? { ...oldP } : {};
        // Overwrite standard fields
        productData.name = name;
        productData.manufacturer = mfg;
        productData.price = price;
        productData.imageDriveUrl = imageDriveUrl;
        productData.documentDriveUrls = documentDriveUrls;
        productData.updatedAt = Timestamp.now();

        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            productData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'products'), productData);
        }

        closeModal('productModal');
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว', 'success');
        fetchProducts();

    } catch (e) {
        console.error("Save error", e);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + e.message, 'error');
    }
};`;

// Perform replacements
html = html.replace(/function renderProducts\(\) {[\s\S]*?window\.openProductModal =/m, newRenderProducts + '\n\nwindow.openProductModal =');
html = html.replace(/window\.editProduct = \(id\) => {[\s\S]*?\/\/ Handle Image Preview/m, newEditProduct + '\n\n// Handle Image Preview');
html = html.replace(/window\.saveProduct = async \(\) => {[\s\S]*?<\/script>/m, newSaveProduct + '\n</script>');

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed schema and edit button.');
