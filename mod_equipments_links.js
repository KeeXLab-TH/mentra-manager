const fs = require('fs');

let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', 'utf8');

// Fix Shop Link to stop propagation
html = html.replace(/<a href="\\?\$\{p\.shopLink\}" target="_blank" style="/, '<a href="${p.shopLink}" target="_blank" onclick="event.stopPropagation()" style="');

// Fix Image to be clickable and open in new tab
const oldTdImage = /<td style="padding: 16px; text-align: center; cursor: pointer;" onclick="viewProductDetail\('\\?\$\{p\.id\}'\)">\s*<img src="\\?\$\{pImgUrl\}" style="([^"]*)" onerror="this\.src='assets\/img\/logo\.png'" referrerpolicy="no-referrer">\s*<\/td>/;

const newTdImage = `<td style="padding: 16px; text-align: center; cursor: pointer;" onclick="viewProductDetail('\${p.id}')">
                <a href="\${pImgUrl}" target="_blank" onclick="event.stopPropagation()" title="คลิกเพื่อดูรูปภาพขนาดเต็ม">
                    <img src="\${pImgUrl}" style="$1" onerror="this.src='assets/img/logo.png'" referrerpolicy="no-referrer">
                </a>
            </td>`;

html = html.replace(oldTdImage, newTdImage);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/equipments.html', html);
console.log("Updated clickable links and images!");
