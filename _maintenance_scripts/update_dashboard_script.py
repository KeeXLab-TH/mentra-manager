with open('pages/admin/dashboard.html', 'r', encoding='utf-8') as f:
    c = f.read()

if 'dashboard-dual-sidebar.js' not in c:
    pos = c.rfind('</body>')
    if pos != -1:
        c = c[:pos] + '    <script src="../../assets/js/dashboard-dual-sidebar.js"></script>\n' + c[pos:]
        with open('pages/admin/dashboard.html', 'w', encoding='utf-8') as f:
            f.write(c)
        print("Updated dashboard.html successfully")
    else:
        print("Could not find </body>")
else:
    print("Already in dashboard.html")
