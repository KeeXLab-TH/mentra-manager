const fs = require('fs');
let jsContent = fs.readFileSync('assets/js/app-ui.js', 'utf8');

const newResponsiveTables = `
    /* ==========================================
       RESPONSIVE MOBILE TABLES (Mutation Observer)
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
            
            // Watch for dynamic data loads (Firebase)
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const observer = new MutationObserver(() => applyDataLabels(table));
                observer.observe(tbody, { childList: true, subtree: true });
            }
        });
    }
`;

// Replace the old initResponsiveTables
jsContent = jsContent.replace(/\/\* ==========================================\s*RESPONSIVE MOBILE TABLES\s*========================================== \*\/[\s\S]*?function initResponsiveTables\(\) \{[\s\S]*?\}\n\s*\}\n/m, newResponsiveTables + '\n');

fs.writeFileSync('assets/js/app-ui.js', jsContent);
console.log('Added MutationObserver to responsive tables');
