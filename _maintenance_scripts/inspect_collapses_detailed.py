import re

files = [
    "pages/accounting/ocr_table.html",
    "pages/accounting/quotation.html",
    "pages/accounting/sales_dashboard.html",
    "pages/accounting/sales_invoice.html",
    "pages/accounting/sales_receipt.html",
    "pages/admin/business_card.html",
    "pages/admin/dashboard.html",
    "pages/purchasing/materials_purchasing.html",
    "pages/purchasing/materials_purchasing_company.html",
    "pages/schedule/external_training.html",
    "pages/schedule/internship_journal.html"
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # find lines with toggleSidebarCollapse
    lines = c.split('\n')
    for idx, l in enumerate(lines):
        if 'toggleSidebarCollapse' in l:
            start = max(0, idx - 2)
            end = min(len(lines), idx + 18)
            print(f"=== {fpath} (around line {idx+1}) ===")
            print('\n'.join(lines[start:end]))
            print("="*40)
            break
