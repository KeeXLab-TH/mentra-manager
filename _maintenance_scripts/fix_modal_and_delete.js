const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Add btn-delete CSS if not exists
if (!html.includes('.btn-delete {')) {
    const btnCss = `
        .btn-delete {
            flex: 1;
            padding: 8px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background var(--t-fast), color var(--t-fast);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #fee2e2;
            color: #b91c1c;
        }
        .btn-delete:hover {
            background: #ef4444;
            color: white;
        }
    `;
    html = html.replace(/\/\* ===== BUTTONS ===== \*\//, btnCss + '\n        /* ===== BUTTONS ===== */');
}

// 2. Add Delete Button to renderProducts
html = html.replace(/<button type="button" class="btn-edit" onclick="editProduct\('([^']+)'\)">.*?<\/button>/g, 
    '<button type="button" class="btn-edit" onclick="editProduct(\'$1\')"><i class="fa-solid fa-pen"></i> แก้ไข</button>\n                    <button type="button" class="btn-delete" onclick="deleteProduct(\'$1\')"><i class="fa-solid fa-trash"></i> ลบ</button>'
);

// 3. Fix openProductModal to use classList.add("show")
html = html.replace(/document\.getElementById\("productModal"\)\.style\.display = "flex"; } catch\(e\)/g, 
    'const m = document.getElementById("productModal"); m.style.display = "flex"; setTimeout(() => m.classList.add("show"), 10); } catch(e)'
);

// 4. Fix closeModal to use classList.remove("show")
html = html.replace(/window\.closeModal = \(id\) => {[\s\S]*?};/, 
    `window.closeModal = (id) => {
    const m = document.getElementById(id);
    m.classList.remove("show");
    setTimeout(() => m.style.display = "none", 300);
};`
);

// 5. Add window.deleteProduct
const deleteFn = `
window.deleteProduct = (id) => {
    Swal.fire({
        title: 'ยืนยันการลบสินค้า?',
        text: "หากลบแล้วจะไม่สามารถกู้คืนได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                await deleteDoc(doc(db, 'products', id));
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลสินค้าถูกลบออกจากระบบแล้ว.', 'success');
                fetchProducts();
            } catch (e) {
                console.error("Delete error", e);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + e.message, 'error');
            }
        }
    });
};
`;

if (!html.includes('window.deleteProduct =')) {
    html = html.replace(/window\.editProduct =/g, deleteFn + '\nwindow.editProduct =');
}

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Fixed modal visibility and added delete button.');
