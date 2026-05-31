const fs = require('fs');
let css = fs.readFileSync('app-theme.css', 'utf8');

let responsiveTableCss = `
/* ================================================================
   MOBILE RESPONSIVE TABLES & MODAL FIX
   ================================================================ */
@media (max-width: 900px) {
    /* Make tables into beautiful cards on mobile */
    .table-wrap table, .table-wrap thead, .table-wrap tbody, .table-wrap th, .table-wrap td, .table-wrap tr {
        display: block;
    }
    
    .table-wrap thead {
        display: none;
    }
    
    .table-wrap tr {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        margin-bottom: 16px;
        box-shadow: var(--shadow-sm);
        padding: 12px 16px;
        position: relative;
    }
    
    .table-wrap td {
        border: none !important;
        border-bottom: 1px dashed var(--border) !important;
        position: relative;
        padding: 12px 0 12px 40% !important;
        text-align: right;
        min-height: 44px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .table-wrap td:last-child {
        border-bottom: none !important;
        padding-bottom: 4px !important;
    }
    
    .table-wrap td::before {
        /* This requires data-label on tds, but as a fallback we just style nicely */
        position: absolute;
        left: 0;
        top: 12px;
        width: 38%;
        text-align: left;
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 13px;
        white-space: nowrap;
    }

    /* Target specific tables with nth-child magic for Dashboard Projects */
    #projectTableBody td:nth-child(1)::before { content: "เลขโครงการ"; }
    #projectTableBody td:nth-child(2)::before { content: "ชื่อโครงการ"; }
    #projectTableBody td:nth-child(3)::before { content: "ปี"; }
    #projectTableBody td:nth-child(4)::before { content: "วันที่"; }
    #projectTableBody td:nth-child(5)::before { content: "งบประมาณ"; }
    #projectTableBody td:nth-child(6)::before { content: "สถานะ"; }
    #projectTableBody td:nth-child(7)::before { content: "หมายเหตุ"; }
    #projectTableBody td:nth-child(8)::before { content: "จัดการ"; }

    #recentProjectTable td:nth-child(1)::before { content: "เลขโครงการ"; }
    #recentProjectTable td:nth-child(2)::before { content: "ชื่อโครงการ"; }
    #recentProjectTable td:nth-child(3)::before { content: "ปี"; }
    #recentProjectTable td:nth-child(4)::before { content: "สถานะ"; }

    #userTableBody td:nth-child(1)::before { content: "ชื่อ-สกุล"; }
    #userTableBody td:nth-child(2)::before { content: "Username"; }
    #userTableBody td:nth-child(3)::before { content: "ตำแหน่ง"; }
    #userTableBody td:nth-child(4)::before { content: "สิทธิ์"; }
    #userTableBody td:nth-child(5)::before { content: "วันสมัคร"; }
    #userTableBody td:nth-child(6)::before { content: "จัดการ"; }

    /* Fix Modal sinking behind mobile nav */
    .modal-overlay.show {
        padding-bottom: calc(76px + env(safe-area-inset-bottom)) !important;
        align-items: flex-end;
    }
    
    .modal-container {
        border-radius: 24px 24px 0 0 !important;
        max-height: calc(100vh - 76px - env(safe-area-inset-bottom) - 40px) !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
    }
}
`;

css += '\n' + responsiveTableCss;
fs.writeFileSync('app-theme.css', css);
console.log("Updated app-theme.css with mobile fixes!");
