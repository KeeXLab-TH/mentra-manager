const fs = require('fs');

let cssContent = fs.readFileSync('assets/css/app-theme.css', 'utf8');

const flawlessMobileCss = `
    /* ── Flawless Mobile Card Tables ── */
    @media (max-width: 900px) {
        .table-wrap table { min-width: 0 !important; }
        .table-wrap {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow-x: hidden !important;
        }
        
        .table-wrap table,
        .table-wrap table tbody,
        .table-wrap table tr,
        .table-wrap table td {
            display: block;
            width: 100%;
        }

        .table-wrap table thead {
            display: none;
        }

        .table-wrap table tr {
            background: #ffffff !important;
            border-radius: 12px;
            margin-bottom: 1rem;
            padding: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0;
            position: relative;
        }
        
        .table-wrap table tr td[colspan] {
            text-align: center !important;
            justify-content: center !important;
            flex-direction: row !important;
            border-bottom: none !important;
            padding: 2rem 0 !important;
        }
        .table-wrap table tr td[colspan]::before {
            display: none !important;
        }

        .table-wrap table td {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 0.75rem 0;
            font-size: 14.5px;
            border-bottom: 1px solid #f1f5f9;
            text-align: left;
            gap: 0.35rem;
            word-break: break-word;
            line-height: 1.5;
            color: #334155;
        }

        .table-wrap table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .table-wrap table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .table-wrap table td .action-btns {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.25rem;
        }
        
        .table-wrap table td .action-btns .btn {
            flex: 1;
            text-align: center;
            justify-content: center;
            padding: 0.5rem;
        }
        
        .table-wrap table td .badge {
            display: inline-block;
            font-size: 12px;
            padding: 0.35rem 0.65rem;
            border-radius: 6px;
        }
    }
`;

cssContent += flawlessMobileCss;

fs.writeFileSync('assets/css/app-theme.css', cssContent);
console.log('Appended flawless CSS safely to EOF');
