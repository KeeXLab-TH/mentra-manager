import glob
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

pages = [
    "pages/admin/dashboard.html",
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

SCRIPT_HEAD = '<script src="../../assets/js/dashboard-dual-sidebar.js"></script>'
CSS_LINK = '<link rel="stylesheet" href="../../assets/css/dashboard-dual-sidebar.css">'
COLLAPSE_BTN = 'id="railCollapseBtn"'

for p in pages:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    has_script_in_head = False
    head_match = re.search(r'<head>(.*?)</head>', c, re.DOTALL | re.I)
    if head_match and 'dashboard-dual-sidebar.js' in head_match.group(1):
        has_script_in_head = True

    has_btn = COLLAPSE_BTN in c
    has_css = 'dashboard-dual-sidebar.css' in c
    has_sidebar = '<aside class="sidebar" id="sidebar">' in c
    has_main_wrapper = ('class="main-wrapper' in c or 'class="flex-1' in c or "class='main-wrapper" in c)

    # Check for legacy inline functions that might conflict
    has_legacy_fn = bool(re.search(r'function\s+toggleSidebarCollapse\s*\(|window\.toggleSidebarCollapse\s*=\s*function', c))

    status = "OK" if (has_script_in_head and has_btn and has_css and has_sidebar and not has_legacy_fn) else "FAIL"
    print(f"[{status}] {p}")
    if status == "FAIL":
        print(f"    script_in_head: {has_script_in_head}, btn: {has_btn}, css: {has_css}, legacy: {has_legacy_fn}")
