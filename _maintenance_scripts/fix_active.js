const fs = require('fs');
let html = fs.readFileSync('materials_purchasing.html', 'utf8');

// Ensure body is visible
if(html.includes('<body class="text-slate-800 antialiased min-h-screen flex">')) {
    html = html.replace('<body class="text-slate-800 antialiased min-h-screen flex">', '<body class="text-slate-800 antialiased min-h-screen flex" style="display: flex !important;">');
}

// Remove active from dashboard
html = html.replace('<button class="nav-item active" onclick="window.location.href=\'dashboard.html\'" id="nav-dashboard">', '<button class="nav-item" onclick="window.location.href=\'dashboard.html\'" id="nav-dashboard">');

fs.writeFileSync('materials_purchasing.html', html);
console.log('Fixed active class and body display');
