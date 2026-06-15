const fs = require('fs');
let html = fs.readFileSync('materials_purchasing.html', 'utf8');

// Add app-theme.css if not present
if(!html.includes('app-theme.css')) {
    html = html.replace('</head>', '    <link rel="stylesheet" href="assets/css/app-theme.css">\n</head>');
}

// Fix navigateTo() functions to window.location.href
html = html.replace(/onclick="navigateTo\('dashboard'\)"/g, 'onclick="window.location.href=\'dashboard.html\'"');
html = html.replace(/onclick="navigateTo\('projects'\)"/g, 'onclick="window.location.href=\'dashboard.html\'"'); // Or dashboard.html#projects if supported
html = html.replace(/onclick="navigateTo\('items'\)"/g, 'onclick="window.location.href=\'dashboard.html\'"');

// Fix toggleSidebarCollapse() if it's missing (it probably is missing in materials_purchasing.html since we didn't include app-ui.js)
// I will just add a dummy function or include app-ui.js.
if(!html.includes('function toggleSidebarCollapse')) {
    html = html.replace('</body>', `
    <script>
        function toggleSidebarCollapse() {
            document.getElementById('sidebar').classList.toggle('collapsed');
            const mainWrapper = document.querySelector('.flex-1');
            if (mainWrapper) {
                // Not perfectly matching Mentra's logic but prevents errors
            }
        }
    </script>
</body>`);
}

fs.writeFileSync('materials_purchasing.html', html);
console.log('materials_purchasing.html fixed!');
