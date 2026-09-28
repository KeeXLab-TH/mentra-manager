import glob

for f in sorted(glob.glob('pages/**/*.html', recursive=True)):
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    if '<aside class="sidebar"' not in c:
        continue
    has_check_page = 'checkPageAccess' in c
    has_apply_perm = 'applySidebarPermissions' in c
    has_app_ui = 'app-ui.js' in c
    print(f"{f:50} | app_ui: {has_app_ui} | checkPageAccess: {has_check_page} | applyPerm: {has_apply_perm}")
