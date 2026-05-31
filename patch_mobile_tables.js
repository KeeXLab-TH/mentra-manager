const fs = require('fs');

// --- Patch app-ui.js ---
let jsContent = fs.readFileSync('assets/js/app-ui.js', 'utf8');

const tableScript = `
    /* ==========================================
       RESPONSIVE MOBILE TABLES
       ========================================== */
    function initResponsiveTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, index) => {
                    if (headers[index]) {
                        cell.setAttribute('data-label', headers[index]);
                    }
                });
            });
        });
    }
`;

if (!jsContent.includes('function initResponsiveTables')) {
    jsContent = jsContent.replace(/init\(\);\s*\}\)\(\);/, tableScript + '\n    init();\n})();');
}

if (!jsContent.includes('initResponsiveTables();')) {
    jsContent = jsContent.replace(/initMobileNav\(\);/, 'initMobileNav();\n        initResponsiveTables();');
}

fs.writeFileSync('assets/js/app-ui.js', jsContent);
console.log('Patched app-ui.js with responsive tables logic');

// --- Patch app-theme.css ---
let cssContent = fs.readFileSync('assets/css/app-theme.css', 'utf8');

const tableCss = `
    /* ── Responsive Card Tables ── */
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    @media (max-width: 900px) {
        .table-responsive {
            border: 0;
            overflow-x: hidden !important; /* Force no horizontal scroll */
        }
        
        .table-responsive table {
            display: block;
        }

        .table-responsive table thead {
            display: none;
        }

        .table-responsive table tbody,
        .table-responsive table tr,
        .table-responsive table td {
            display: block;
            width: 100%;
        }

        .table-responsive table tr {
            background: #fff;
            border-radius: 12px;
            margin-bottom: 1rem;
            padding: 0.75rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid rgba(26,111,191,0.1);
        }

        .table-responsive table td {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 0.6rem 0.5rem;
            font-size: 13.5px;
            border-bottom: 1px solid rgba(0,0,0,0.04);
            text-align: right; /* Values aligned right on mobile */
            gap: 1rem;
            word-break: break-word; /* Prevent text overflow */
            line-height: 1.5;
        }

        .table-responsive table td:last-child {
            border-bottom: none;
        }

        .table-responsive table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: var(--text-muted);
            text-align: left;
            flex-shrink: 0;
            max-width: 45%;
        }
        
        /* Specific adjustments for status badges inside mobile tables */
        .table-responsive table td .badge {
            display: inline-block;
            margin-top: 0;
        }
        
        .table-responsive table td .action-btns {
            justify-content: flex-end;
            width: 100%;
        }
    }
`;

if (!cssContent.includes('/* ── Responsive Card Tables ── */')) {
    cssContent = cssContent.replace(/@media \(max-width: 900px\) \{/, tableCss + '\n    @media (max-width: 900px) {');
    fs.writeFileSync('assets/css/app-theme.css', cssContent);
    console.log('Patched app-theme.css with responsive table styles');
}
