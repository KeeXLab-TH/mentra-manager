const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

const updatedOnProgress = `
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    document.getElementById('uploadProgressBar').style.width = percentComplete + '%';
                    document.getElementById('uploadProgressPercent').innerText = percentComplete + '%';
                    
                    if (Swal.isVisible()) {
                        Swal.update({ html: '<div style="margin-top:10px;">กำลังอัปโหลด (' + file.name + ')<br><b style="font-size:20px; color:var(--primary);">' + percentComplete + '%</b></div>' });
                    }
                }
            };
`;

html = html.replace(/xhr\.upload\.onprogress = function\(e\) {[\s\S]*?};/, updatedOnProgress.trim());

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log('Added Swal progress update.');
