const fs = require('fs');

let jsContent = fs.readFileSync('assets/js/app-ui.js', 'utf8');

const newResponsiveTables = `
    /* ==========================================
       RESPONSIVE MOBILE TABLES
       ========================================== */
    function applyDataLabels(table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index] && !cell.hasAttribute('data-label')) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    }

    function initResponsiveTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            // Apply initially
            applyDataLabels(table);
            
            // Watch for dynamic data loads
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const observer = new MutationObserver(() => applyDataLabels(table));
                observer.observe(tbody, { childList: true, subtree: true });
            }
        });
    }
`;

// Replace the old initResponsiveTables
jsContent = jsContent.replace(/function initResponsiveTables\(\) \{[\s\S]*?querySelectorAll\('th'\)[\s\S]*?\}\n\s*\}/m, newResponsiveTables.replace('/* ==========================================\n       RESPONSIVE MOBILE TABLES\n       ========================================== */\n', ''));

fs.writeFileSync('assets/js/app-ui.js', jsContent);
console.log('Added MutationObserver to responsive tables! Success:', jsContent.includes('applyDataLabels'));
