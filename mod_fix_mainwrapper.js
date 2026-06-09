const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

const replacement = `    <!-- ===== MAIN WRAPPER ===== -->
    <div class="main-wrapper" id="mainWrapper">
        
        <!-- TOPBAR -->
        <header class="topbar">
            <button class="hamburger" onclick="toggleSidebar()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <div class="topbar-breadcrumb">
                <div class="breadcrumb-title">ระบบจัดการสินค้า <span style="white-space: nowrap;">(Products)</span></div>
                <div class="breadcrumb-sub">จัดการข้อมูลและรายการสินค้าขององค์กร</div>
            </div>
        
            <div class="topbar-actions" id="topbarActions"></div>
            <div class="topbar-right-menu">`;

// Using regex to handle any whitespace/newlines
html = html.replace(/<!-- ===== MAIN WRAPPER ===== -->[\s\S]*?<div class="topbar-right-menu">/, replacement);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log("Fixed main wrapper properly!");
