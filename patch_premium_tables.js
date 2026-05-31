const fs = require('fs');
let cssContent = fs.readFileSync('assets/css/app-theme.css', 'utf8');

const modernTableCss = `
    /* ── Ultra Premium Mobile Card Tables ── */
    @media (max-width: 900px) {
        .table-responsive {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow-x: hidden !important;
        }
        
        .table-responsive table,
        .table-responsive table tbody,
        .table-responsive table tr,
        .table-responsive table td {
            display: block;
            width: 100%;
        }

        .table-responsive table thead {
            display: none;
        }

        .table-responsive table tr {
            background: linear-gradient(145deg, #ffffff, #fcfcfd);
            border-radius: 16px;
            margin-bottom: 1.25rem;
            padding: 1.25rem;
            box-shadow: 0 8px 24px rgba(26, 111, 191, 0.06), 0 2px 8px rgba(0,0,0,0.02);
            border: 1px solid rgba(26, 111, 191, 0.1);
            border-left: 5px solid var(--primary);
            position: relative;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .table-responsive table tr:active {
            transform: scale(0.98);
        }

        .table-responsive table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            font-size: 14px;
            border-bottom: 1px dashed rgba(0,0,0,0.08);
            text-align: right;
            gap: 1rem;
            word-break: break-word;
            line-height: 1.5;
            color: #334155;
        }

        .table-responsive table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
            margin-top: 0.75rem;
            justify-content: center;
        }

        /* Make the very first cell stand out like a Card Title */
        .table-responsive table td:first-child {
            font-size: 17px;
            font-weight: 700;
            color: var(--primary-darker, #0e4a85);
            border-bottom: 1px solid rgba(26, 111, 191, 0.15);
            padding-bottom: 0.8rem;
            margin-bottom: 0.25rem;
            justify-content: space-between;
            align-items: flex-start;
            text-align: right;
        }
        
        .table-responsive table td:first-child::before {
            color: var(--primary, #1A6FBF);
            font-size: 12.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
        }

        .table-responsive table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
            font-size: 13.5px;
            max-width: 45%;
        }

        /* Action Buttons */
        .table-responsive table td .action-btns {
            width: 100%;
            display: flex;
            justify-content: center;
            gap: 0.75rem;
        }
        
        .table-responsive table td .action-btns .btn {
            flex: 1;
            justify-content: center;
            padding: 0.6rem 0.5rem;
            font-size: 13px;
        }
        
        /* Badges */
        .table-responsive table td .badge {
            font-size: 12px;
            padding: 0.4rem 0.75rem;
            border-radius: 20px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
    }
`;

// Find where we added the old block and replace it
const startIndex = cssContent.indexOf('/* ── Responsive Card Tables ── */');
if (startIndex !== -1) {
    // It's at the end of the file, we can just slice and append
    cssContent = cssContent.slice(0, startIndex);
}

cssContent += modernTableCss;

fs.writeFileSync('assets/css/app-theme.css', cssContent);
console.log('Patched app-theme.css with ULTRA PREMIUM mobile table styles');
