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

all_passed = True

for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        c = f.read()

    checks = {
        "boxicons": 'boxicons.min.css' in c,
        "dashboard-dual-sidebar.css": 'dashboard-dual-sidebar.css' in c,
        "dashboard-dual-sidebar.js": 'dashboard-dual-sidebar.js' in c,
        "sidebarOverlay": 'id="sidebarOverlay"' in c,
        "aside_sidebar": '<aside class="sidebar" id="sidebar">' in c,
        "rail-primary": '<div class="rail-primary">' in c,
        "rail-secondary": '<div class="rail-secondary"' in c,
        "orgSwitcherPopover": 'id="orgSwitcherPopover"' in c,
        "shopManageModal": 'id="shopManageModal"' in c,
        "sidebarQuickSearch": 'id="sidebarQuickSearch"' in c,
    }

    failed = [k for k, v in checks.items() if not v]
    if failed:
        print(f"❌ {page} FAILED checks: {failed}")
        all_passed = False
    else:
        print(f"✅ {page} - 100% verified (All {len(checks)} critical elements present)")

if all_passed:
    print("\n🎉 ALL 16 PAGES SUCCESSFULLY VERIFIED AND 100% CONSISTENT!")
else:
    print("\n⚠️ SOME PAGES HAVE MISSING ELEMENTS")
