import glob

pages = sorted(glob.glob('pages/**/*.html', recursive=True))

for p in pages:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # Update CSS link with cache buster
    c = c.replace('dashboard-dual-sidebar.css"', 'dashboard-dual-sidebar.css?v=2.0"')
    c = c.replace("dashboard-dual-sidebar.css'", "dashboard-dual-sidebar.css?v=2.0'")

    # Update JS script with cache buster
    c = c.replace('dashboard-dual-sidebar.js"', 'dashboard-dual-sidebar.js?v=2.0"')
    c = c.replace("dashboard-dual-sidebar.js'", "dashboard-dual-sidebar.js?v=2.0'")

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

print("Added cache buster ?v=2.0 across all pages!")
