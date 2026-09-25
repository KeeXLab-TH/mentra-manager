import glob

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

SCRIPT_TAG = '<script src="../../assets/js/dashboard-dual-sidebar.js"></script>'
CSS_TAG = '<link rel="stylesheet" href="../../assets/css/dashboard-dual-sidebar.css">'

for p in pages:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    modified = False

    # 1. Ensure script is in <head>
    if SCRIPT_TAG not in c:
        if CSS_TAG in c:
            c = c.replace(CSS_TAG, CSS_TAG + '\n    ' + SCRIPT_TAG)
            modified = True
        elif '</head>' in c:
            c = c.replace('</head>', '    ' + SCRIPT_TAG + '\n</head>')
            modified = True

    # 2. Also ensure script is before </body>
    if c.count(SCRIPT_TAG) < 2 and '</body>' in c:
        pos = c.rfind('</body>')
        c = c[:pos] + '    ' + SCRIPT_TAG + '\n' + c[pos:]
        modified = True

    if modified:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Injected script into {p}")
    else:
        print(f"Script already properly in {p}")
