import os
import re

# Canonical Dual-Rail Sidebar markup
CANONICAL_SIDEBAR = '''    <!-- SIDEBAR OVERLAY (mobile) -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

    <!-- TOAST CONTAINER (new stackable system) -->
    <div id="toastContainer"></div>

    <!-- ===== SIDEBAR ===== -->
    <aside class="sidebar" id="sidebar">
        <!-- 1. PRIMARY SLIM DARK RAIL (LEFT) -->
        <div class="rail-primary">
            <!-- Brand Logo Mark -->
            <div class="rail-logo-wrap" onclick="typeof navigateTo === 'function' ? navigateTo('dashboard') : window.location.href='../admin/dashboard.html'" title="Mentra Manager">
                <img src="../../assets/img/logo.png" alt="Mentra" class="rail-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <i class='bx bxs-compass rail-logo-icon' style="display: none;"></i>
            </div>

            <!-- Icon Nav Stack -->
            <div class="rail-nav-group">
                <!-- Search -->
                <button type="button" class="rail-icon-btn" onclick="focusQuickSearch()" id="railBtnSearch">
                    <i class='bx bx-search'></i>
                    <span class="rail-tooltip">ค้นหาด่วน (⌘F)</span>
                </button>

                <!-- Dashboard -->
                <button type="button" class="rail-icon-btn" onclick="handleRailTab('dashboard', this)" id="railBtnDashboard">
                    <i class='bx bx-grid-alt'></i>
                    <span class="rail-tooltip">Dashboard / ภาพรวม</span>
                </button>

                <!-- Projects -->
                <button type="button" class="rail-icon-btn" onclick="handleRailTab('projects', this)" id="railBtnProjects">
                    <i class='bx bx-briefcase'></i>
                    <span class="rail-tooltip">โครงการทั้งหมด (Projects)</span>
                </button>

                <!-- Purchasing -->
                <button type="button" class="rail-icon-btn" onclick="handleRailTab('purchasing', this)" id="railBtnPurchasing">
                    <i class='bx bx-cart'></i>
                    <span class="rail-tooltip">ฝ่ายจัดซื้อ & สินค้า</span>
                </button>

                <!-- Accounting -->
                <button type="button" class="rail-icon-btn" onclick="handleRailTab('accounting', this)" id="railBtnAccounting">
                    <i class='bx bx-receipt'></i>
                    <span class="rail-tooltip">บัญชี & การเงิน</span>
                </button>

                <!-- Schedule -->
                <button type="button" class="rail-icon-btn" onclick="handleRailTab('schedule', this)" id="railBtnSchedule">
                    <i class='bx bx-calendar'></i>
                    <span class="rail-tooltip">ตารางงาน & อบรม</span>
                </button>
            </div>

            <!-- Rail Bottom: Collapse toggle & Admin Settings -->
            <div class="rail-bottom">
                <button type="button" class="rail-collapse-toggle" onclick="toggleSidebarCollapse()" id="railCollapseBtn" title="ย่อ/ขยายแถบเมนู">
                    <i class='bx bx-chevron-left'></i>
                </button>
                <button type="button" class="rail-icon-btn" onclick="window.location.href='../admin/console_admin.html'" title="ตั้งค่าระบบ">
                    <i class='bx bx-cog'></i>
                    <span class="rail-tooltip">Admin Console</span>
                </button>
            </div>
        </div>

        <!-- 2. SECONDARY FLYOUT PANEL (WHITE) -->
        <div class="rail-secondary" id="railSecondaryPanel">
            <!-- Org Switcher Header -->
            <div class="org-switcher-header">
                <div class="org-switcher-btn" id="orgSwitcherBtn" onclick="toggleOrgPopover(event)">
                    <div class="org-avatar">
                        <img id="sidebarOrgLogo" src="../../assets/img/logo.png" alt="Mentra" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <span id="sidebarOrgInitials" style="display:none;">M</span>
                    </div>
                    <div class="org-meta">
                        <div class="org-title" id="sidebarOrgName">Mentra Solution</div>
                        <div class="org-subtitle" id="sidebarUserEmail">accounts@mentrasolution.com</div>
                    </div>
                    <i class='bx bx-chevron-up-down org-caret'></i>
                </div>

                <!-- Floating Popover (Multi-Shop Management) -->
                <div class="org-switcher-popover" id="orgSwitcherPopover">
                    <div class="popover-section-label">เลือกร้านค้าที่จัดการ</div>
                    <div class="popover-list" id="orgSwitcherPopoverList">
                        <!-- Rendered dynamically by dashboard-dual-sidebar.js -->
                    </div>
                    <div class="popover-divider"></div>
                    <button type="button" class="popover-btn-action create-new" onclick="openShopModal()">
                        <i class='bx bx-plus'></i> <span>เพิ่มร้านค้า</span>
                    </button>
                    <button type="button" class="popover-btn-action logout" onclick="handleLogout()">
                        <i class='bx bx-log-out'></i> <span>ออกจากระบบ (Logout)</span>
                    </button>
                </div>
            </div>

            <!-- Quick Search Input -->
            <div class="secondary-search-wrap">
                <div class="secondary-search-box">
                    <i class='bx bx-search'></i>
                    <input type="text" id="sidebarQuickSearch" placeholder="Search...." oninput="filterSidebarNav(this.value)">
                    <span class="search-kbd">⌘ F</span>
                </div>
            </div>

            <!-- Secondary Navigation Items -->
            <div class="secondary-nav-body" id="secondaryNavBody">
                <!-- Flat Primary Links -->
                <button type="button" class="sec-nav-item" onclick="typeof navigateTo === 'function' ? navigateTo('dashboard') : window.location.href='../admin/dashboard.html'" id="nav-dashboard">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-grid-alt'></i>
                        <span>Dashboard</span>
                    </div>
                </button>

                <button type="button" class="sec-nav-item" onclick="typeof navigateTo === 'function' ? navigateTo('projects') : window.location.href='../admin/dashboard.html?view=projects'" id="nav-projects">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-briefcase'></i>
                        <span>โครงการทั้งหมด</span>
                    </div>
                </button>

                <!-- Module Section: Administration & CRM -->
                <div class="sec-nav-divider">ฝ่ายบริหาร & CRM</div>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../admin/crm.html'" id="nav-crm">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-bar-chart-alt-2'></i>
                        <span>ระบบ CRM</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../admin/business_card.html'" id="nav-business-card">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-id-card'></i>
                        <span>นามบัตรดิจิทัล</span>
                    </div>
                </button>

                <!-- Module Section: Purchasing -->
                <div class="sec-nav-divider">จัดซื้อ & สินค้า</div>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../purchasing/materials_purchasing.html'" id="nav-purchasing-school">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-buildings'></i>
                        <span>จัดซื้อ (สถานศึกษา)</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../purchasing/materials_purchasing_company.html'" id="nav-purchasing-company">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-briefcase-alt'></i>
                        <span>จัดซื้อ (บริษัทเอกชน)</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../purchasing/products.html'" id="nav-products">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-package'></i>
                        <span>รายการสินค้า</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../purchasing/equipments.html'" id="nav-equipments">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-store-alt'></i>
                        <span>ข้อมูลร้านสำหรับสั่งวัสดุ</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="typeof navigateTo === 'function' ? navigateTo('items') : window.location.href='../admin/dashboard.html?view=items'" id="nav-items">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-purchase-tag-alt'></i>
                        <span>ราคาทุน / สิ่งของ</span>
                    </div>
                </button>

                <!-- Module Section: Accounting -->
                <div class="sec-nav-divider">งานบัญชี & การเงิน</div>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../accounting/quotation.html'" id="nav-quotation">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-file-blank'></i>
                        <span>ใบเสนอราคา</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../accounting/sales_dashboard.html'" id="nav-sales-dashboard">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-spreadsheet'></i>
                        <span>ระบบเอกสารงานขาย</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../accounting/sales_invoice.html'" id="nav-sales-invoice">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-receipt'></i>
                        <span>ใบกำกับภาษี / แจ้งหนี้</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../accounting/sales_receipt.html'" id="nav-sales-receipt">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-check-shield'></i>
                        <span>ใบเสร็จรับเงิน</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../accounting/ocr_table.html'" id="nav-ocr">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-scan'></i>
                        <span>OCR อ่านเอกสาร</span>
                    </div>
                </button>

                <!-- Module Section: Schedule -->
                <div class="sec-nav-divider">ตารางงาน & การอบรม</div>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../schedule/tasks.html'" id="nav-tasks">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-check-square'></i>
                        <span>งานที่ได้รับมอบหมาย</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../schedule/calendar.html'" id="nav-calendar">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-calendar-event'></i>
                        <span>ปฏิทินตารางงาน</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../schedule/external_training.html'" id="nav-training">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-award'></i>
                        <span>ระบบตารางจัดอบรม</span>
                    </div>
                </button>
                <button type="button" class="sec-nav-item" onclick="window.location.href='../schedule/internship_journal.html'" id="nav-internship">
                    <div class="sec-nav-item-left">
                        <i class='bx bx-book-bookmark'></i>
                        <span>บันทึกการฝึกงาน</span>
                    </div>
                </button>
            </div>
        </div>
    </aside>'''

# Canonical Shop Manage Modal
CANONICAL_SHOP_MODAL = '''    <!-- ===== MODAL: จัดการข้อมูลร้านค้า & อัปโหลดโลโก้ ===== -->
    <div class="modal-overlay" id="shopManageModal" style="display:none;">
        <div class="modal" style="max-width: 580px; border-radius: 18px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(7, 37, 66, 0.25);">
            <div class="modal-header" style="background: linear-gradient(135deg, #072542 0%, #0d4b85 100%); color: #ffffff; padding: 18px 24px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🏪</span>
                        <h3 id="shopModalTitle" style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; font-family: var(--sidebar-font);">เพิ่มร้านค้าใหม่</h3>
                    </div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.82); margin-top: 3px; font-family: var(--sidebar-font);">กรอกข้อมูลร้านค้าและอัปโหลดโลโก้ เพื่อแยกพื้นที่จัดเก็บข้อมูลอิสระ</div>
                </div>
                <button class="modal-close" style="color: rgba(255, 255, 255, 0.85); font-size: 18px;" onclick="closeShopModal()">✕</button>
            </div>
            <div class="modal-body" style="padding: 22px; max-height: 72vh; overflow-y: auto;">
                <!-- Logo Upload Section -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; margin-bottom: 18px; transition: all 0.2s;" id="shopLogoDropzone">
                    <div style="position: relative; margin-bottom: 10px;">
                        <div id="shopLogoPreviewContainer" style="width: 84px; height: 84px; border-radius: 18px; background: #ffffff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                            <img id="shopLogoPreview" src="" style="width: 100%; height: 100%; object-fit: contain; display: none;" alt="Logo Preview">
                            <div id="shopLogoPlaceholder" style="text-align: center; color: #94a3b8;">
                                <i class='bx bx-image-add' style="font-size: 32px; display: block; line-height: 1;"></i>
                                <span style="font-size: 11px; font-weight: 600; margin-top: 4px; display: block;">โลโก้ร้าน</span>
                            </div>
                        </div>
                        <button type="button" id="shopRemoveLogoBtn" onclick="removeShopLogoPreview()" style="display: none; position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; background: #ef4444; color: #fff; border: 2px solid #fff; font-size: 11px; cursor: pointer; align-items: center; justify-content: center;" title="ลบโลโก้">✕</button>
                    </div>
                    <div style="text-align: center;">
                        <label for="shopLogoFileInput" class="btn btn-outline btn-sm" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; font-weight: 600; font-size: 12.5px; padding: 6px 14px; background: #ffffff;">
                            <i class='bx bx-cloud-upload'></i> <span>เลือกรูปโลโก้ร้านค้า</span>
                        </label>
                        <input type="file" id="shopLogoFileInput" accept="image/*" style="display: none;" onchange="handleShopLogoSelect(this)">
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 5px;">รองรับไฟล์ PNG, JPG, WebP หรือ SVG (ขนาดไม่เกิน 2MB)</div>
                    </div>
                </div>

                <!-- Form Fields -->
                <input type="hidden" id="editingShopId" value="">
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="field-group" style="grid-column: 1 / -1;">
                        <label for="shopNameInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">ชื่อร้านค้า / บริษัท <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="shopNameInput" placeholder="เช่น Point Studio, โรงพิมพ์มิตรภาพ, บริษัท ทีพี มีเดีย จำกัด" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font); outline: none; transition: border-color 0.2s;" required>
                    </div>

                    <div class="field-group">
                        <label for="shopShortCodeInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">รหัสย่อร้าน (Short Code)</label>
                        <input type="text" id="shopShortCodeInput" placeholder="เช่น PS, TP, MTR" maxlength="6" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font); text-transform: uppercase;">
                    </div>

                    <div class="field-group">
                        <label for="shopCategoryInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">หมวดหมู่ / ประเภทธุรกิจ</label>
                        <select id="shopCategoryInput" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font); background: #ffffff;">
                            <option value="สตูดิโอ & มีเดีย">สตูดิโอ & มีเดีย</option>
                            <option value="สิ่งพิมพ์ & โฆษณา">สิ่งพิมพ์ & โฆษณา</option>
                            <option value="ไอที & ซอฟต์แวร์">ไอที & ซอฟต์แวร์</option>
                            <option value="ค้าปลีก & จัดจำหน่าย">ค้าปลีก & จัดจำหน่าย</option>
                            <option value="บริการ & ก่อสร้าง">บริการ & ก่อสร้าง</option>
                            <option value="ร้านค้าทั่วไป">ร้านค้าทั่วไป</option>
                        </select>
                    </div>

                    <div class="field-group">
                        <label for="shopPhoneInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">เบอร์โทรศัพท์ติดต่อ</label>
                        <input type="tel" id="shopPhoneInput" placeholder="เช่น 02-123-4567, 081-xxx-xxxx" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font);">
                    </div>

                    <div class="field-group">
                        <label for="shopEmailInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">อีเมลร้านค้า</label>
                        <input type="email" id="shopEmailInput" placeholder="shop@example.com" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font);">
                    </div>

                    <div class="field-group" style="grid-column: 1 / -1;">
                        <label for="shopTaxIdInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                        <input type="text" id="shopTaxIdInput" placeholder="เลขประจำตัว 13 หลัก (ใช้สำหรับเปิดบิล/ออกเอกสาร)" maxlength="20" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font);">
                    </div>

                    <div class="field-group" style="grid-column: 1 / -1;">
                        <label for="shopAddressInput" style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 5px; display: block;">ที่อยู่ / ที่ตั้งร้าน</label>
                        <textarea id="shopAddressInput" rows="2" placeholder="ระบุเลขที่ตั้ง อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; font-family: var(--sidebar-font); resize: vertical;"></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn btn-outline" onclick="closeShopModal()" style="padding: 8px 16px; border-radius: 9px; font-weight: 600; font-size: 13px;">ยกเลิก</button>
                <button type="button" class="btn btn-primary" onclick="saveShopModalData()" style="padding: 8px 20px; border-radius: 9px; font-weight: 600; font-size: 13px; background: linear-gradient(135deg, #072542 0%, #0d4b85 100%); border: none; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                    <i class='bx bx-check-circle'></i> <span>บันทึกและสลับไปใช้งาน</span>
                </button>
            </div>
        </div>
    </div>'''

BOXICONS_LINK = '<link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">'
DUAL_SIDEBAR_CSS_LINK = '<link rel="stylesheet" href="../../assets/css/dashboard-dual-sidebar.css">'
DUAL_SIDEBAR_JS_SCRIPT = '<script src="../../assets/js/dashboard-dual-sidebar.js"></script>'

def update_page(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)

    # 1. Update <head>
    head_additions = []
    if 'boxicons.min.css' not in content:
        head_additions.append('    ' + BOXICONS_LINK)
    if 'dashboard-dual-sidebar.css' not in content:
        head_additions.append('    ' + DUAL_SIDEBAR_CSS_LINK)
    
    if head_additions:
        content = content.replace('</head>', '\n'.join(head_additions) + '\n</head>')

    # 2. Replace Sidebar & Overlay
    # Pattern matches optional overlay comment, overlay div, optional sidebar comment, and aside tag
    pattern = re.compile(
        r'(?:[ \t]*<!--\s*SIDEBAR OVERLAY[^\n]*-->[ \t]*\n)?'
        r'(?:[ \t]*<div[^>]*id=["\']sidebarOverlay["\'][^>]*></div>[ \t]*\n)?'
        r'(?:[ \t]*<!--\s*={3,}\s*SIDEBAR\s*={3,}\s*-->[ \t]*\n)?'
        r'[ \t]*<aside[^>]*class=["\'][^"\']*sidebar[^"\']*["\'][^>]*>.*?</aside>',
        re.DOTALL | re.I
    )

    if pattern.search(content):
        content = pattern.sub(CANONICAL_SIDEBAR, content, count=1)
    else:
        print(f"WARNING: No <aside class='sidebar'> matched in {file_path}")
        return False

    # 3. Add Shop Management Modal if missing
    if 'id="shopManageModal"' not in content:
        # Insert before </body>
        if '</body>' in content:
            content = content.replace('</body>', '\n' + CANONICAL_SHOP_MODAL + '\n\n</body>')
        else:
            content += '\n' + CANONICAL_SHOP_MODAL

    # 4. Add dashboard-dual-sidebar.js if missing
    if 'dashboard-dual-sidebar.js' not in content:
        if '</body>' in content:
            content = content.replace('</body>', '    ' + DUAL_SIDEBAR_JS_SCRIPT + '\n</body>')
        else:
            content += '\n' + DUAL_SIDEBAR_JS_SCRIPT

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully updated: {file_path} (len: {original_len} -> {len(content)})")
    return True

if __name__ == '__main__':
    target_files = [
        "pages/admin/crm.html",
        "pages/admin/business_card.html",
        "pages/accounting/ocr_table.html",
        "pages/accounting/quotation.html",
        "pages/accounting/sales_dashboard.html",
        "pages/accounting/sales_invoice.html",
        "pages/accounting/sales_receipt.html",
        "pages/purchasing/equipments.html",
        "pages/purchasing/materials_purchasing.html",
        "pages/purchasing/materials_purchasing_company.html",
        "pages/purchasing/products.html",
        "pages/schedule/calendar.html",
        "pages/schedule/external_training.html",
        "pages/schedule/internship_journal.html",
        "pages/schedule/tasks.html"
    ]
    for tf in target_files:
        update_page(tf)
