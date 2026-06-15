const fs = require('fs');
const dashboardHtml = fs.readFileSync('dashboard.html', 'utf8');

const startIdx = dashboardHtml.indexOf('<aside class="sidebar" id="sidebar">');
const endIdx = dashboardHtml.indexOf('</aside>', startIdx);

if(startIdx !== -1 && endIdx !== -1) {
    let sidebar = dashboardHtml.substring(startIdx, endIdx + 8);
    
    // We want the purchasing menu item to have the active class
    sidebar = sidebar.replace('<button class="nav-item" onclick="window.location.href=\'materials_purchasing.html\'" id="nav-purchasing">', '<button class="nav-item active" onclick="window.location.href=\'materials_purchasing.html\'" id="nav-purchasing">');

    // also remove active from dashboard
    sidebar = sidebar.replace('<button class="nav-item active" onclick="window.location.href=\'dashboard.html\'" id="nav-dashboard">', '<button class="nav-item" onclick="window.location.href=\'dashboard.html\'" id="nav-dashboard">');

    let purchasingHtml = fs.readFileSync('materials_purchasing.html', 'utf8');
    
    // replace everything from <aside... to </aside> in materials_purchasing.html with this sidebar
    const pStartIdx = purchasingHtml.indexOf('<aside');
    const pEndIdx = purchasingHtml.indexOf('</aside>', pStartIdx);
    
    if (pStartIdx !== -1 && pEndIdx !== -1) {
        purchasingHtml = purchasingHtml.substring(0, pStartIdx) + sidebar + purchasingHtml.substring(pEndIdx + 8);
        fs.writeFileSync('materials_purchasing.html', purchasingHtml, 'utf8');
        console.log('materials_purchasing.html sidebar replaced with real sidebar.');
    }
}
