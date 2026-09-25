import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

replacements = [
    # 1. ocr_table.html
    ("pages/accounting/ocr_table.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 2. quotation.html
    ("pages/accounting/quotation.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*wrapper\.style\.marginLeft[^{}]*\}[ \t]*\n[ \t]*window\.handleLogout\s*=\s*handleLogout;[ \t]*\n[ \t]*window\.toggleSidebarCollapse\s*=\s*toggleSidebarCollapse;',
     'window.handleLogout = handleLogout;\n        // toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 3. sales_dashboard.html
    ("pages/accounting/sales_dashboard.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 4. sales_invoice.html
    ("pages/accounting/sales_invoice.html",
     r'window\.toggleSidebarCollapse\s*=\s*function\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\};',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 5. sales_receipt.html
    ("pages/accounting/sales_receipt.html",
     r'window\.toggleSidebarCollapse\s*=\s*function\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\};',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 6. business_card.html
    ("pages/admin/business_card.html",
     r'window\.toggleSidebarCollapse\s*=\s*function\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\};',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 7. dashboard.html
    ("pages/admin/dashboard.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'panel-collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 8. materials_purchasing.html
    ("pages/purchasing/materials_purchasing.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*document\.getElementById\(\'sidebar\'\)\.classList\.toggle\(\'collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 9. materials_purchasing_company.html
    ("pages/purchasing/materials_purchasing_company.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*document\.getElementById\(\'sidebar\'\)\.classList\.toggle\(\'collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 10. external_training.html
    ("pages/schedule/external_training.html",
     r'function\s+toggleSidebarCollapse\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\}',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),

    # 11. internship_journal.html
    ("pages/schedule/internship_journal.html",
     r'window\.toggleSidebarCollapse\s*=\s*function\(\)\s*\{[^{}]*sidebar\.classList\.toggle\(\'collapsed\'\);[^{}]*\};',
     '// toggleSidebarCollapse handled by dashboard-dual-sidebar.js'),
]

for fpath, pattern, repl in replacements:
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    new_c, count = re.subn(pattern, repl, c)
    if count > 0:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_c)
        print(f"✅ Replaced in {fpath} (count: {count})")
    else:
        print(f"⚠️ Pattern not matched in {fpath}")
