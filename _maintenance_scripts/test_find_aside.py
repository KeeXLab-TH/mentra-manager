import glob
import re

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

for fpath in target_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for <aside ... </aside>
    aside_match = re.search(r'(<!--\s*={3,}\s*SIDEBAR\s*={3,}\s*-->\s*)?<aside[^>]*class=["\']sidebar["\'][^>]*>.*?</aside>', content, re.DOTALL | re.I)
    
    # Check for sidebarOverlay
    overlay_match = re.search(r'<div[^>]*id=["\']sidebarOverlay["\'][^>]*></div>', content, re.I)
    
    # Check for toastContainer
    toast_match = re.search(r'<div[^>]*id=["\']toastContainer["\'][^>]*></div>', content, re.I)
    
    # Check for shopManageModal
    modal_match = re.search(r'id=["\']shopManageModal["\']', content, re.I)
    
    print(f"File: {fpath}")
    print(f"  aside found: {bool(aside_match)} (length: {len(aside_match.group(0)) if aside_match else 0})")
    print(f"  overlay found: {bool(overlay_match)} | toast: {bool(toast_match)} | modal: {bool(modal_match)}")
