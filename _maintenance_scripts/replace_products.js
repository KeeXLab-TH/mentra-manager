const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  
  // Replace active and inactive nav-products buttons
  let newHtml = html.replace(/<button class="nav-item(?: active)?" onclick="window\.location\.href='products\.html'" id="nav-products">[\s\S]*?<\/button>/g, 
    `<button class="nav-item" onclick="window.location.href='materials_purchasing.html'" id="nav-purchasing">
                <div class="nav-icon">🛒</div>
                <span class="nav-label">จัดการจัดซื้อ / วัสดุ</span>
            </button>`);
  
  if (html !== newHtml) {
    fs.writeFileSync(f, newHtml);
    console.log('Updated', f);
  }
});
