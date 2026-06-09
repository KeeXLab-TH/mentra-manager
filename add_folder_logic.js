const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// 1. Update uploadToDrive signature
html = html.replace(/async function uploadToDrive\(file\) {/, 'async function uploadToDrive(file, targetFolderId = DRIVE_ROOT_FOLDER_ID) {');
html = html.replace(/folderId: DRIVE_ROOT_FOLDER_ID\n\s*\}\)/, 'folderId: targetFolderId\n            })');
html = html.replace(/parents: \[DRIVE_ROOT_FOLDER_ID\]/, 'parents: [targetFolderId]');

// 2. Update saveProduct to create a folder first
const folderCreationLogic = `
        let targetFolderId = DRIVE_ROOT_FOLDER_ID;
        try {
            Swal.update({ text: 'กำลังเตรียมโฟลเดอร์สำหรับสินค้า...' });
            const gasFolderRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'createFolder',
                    folderName: name,
                    parentFolderId: DRIVE_ROOT_FOLDER_ID
                })
            });
            const gasFolderResult = await gasFolderRes.json();
            if (gasFolderResult.status === 'created' || gasFolderResult.status === 'exists') {
                targetFolderId = gasFolderResult.folderId;
            }
        } catch(e) {
            console.warn("Failed to create folder, using root", e);
        }

        if (imgFile) {
            Swal.update({ text: 'กำลังอัปโหลดรูปภาพสินค้า...' });
            imageDriveUrl = await uploadToDrive(imgFile, targetFolderId);
        } else if (!id) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาอัปโหลดรูปภาพสินค้า', 'warning');
            return;
        }

        if (docFiles.length > 0) {
            Swal.update({ text: 'กำลังอัปโหลดเอกสารแนบ...' });
            for (let i = 0; i < docFiles.length; i++) {
                const docUrl = await uploadToDrive(docFiles[i], targetFolderId);
                documentDriveUrls.push(docUrl);
            }
        }
`;

// Replace the image/doc upload section with the new logic
html = html.replace(/if \(imgFile\) {[\s\S]*?documentDriveUrls\.push\(docUrl\);\n\s*\}\n\s*\}/, folderCreationLogic.trim());

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Added folder creation logic.');
