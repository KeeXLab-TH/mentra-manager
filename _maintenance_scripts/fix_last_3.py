# 1. quotation.html
with open('pages/accounting/quotation.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the function and the window.toggleSidebarCollapse = toggleSidebarCollapse assignment
c = c.replace('''        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');

            const wrapper = document.querySelector('.main-wrapper');
            if (isCollapsed) {
                wrapper.style.marginLeft = 'var(--sidebar-w-collapsed)';
            } else {
                wrapper.style.marginLeft = 'var(--sidebar-w)';
            }
        }

        // Expose to window scope
        window.handleLogout = handleLogout;
        window.toggleSidebarCollapse = toggleSidebarCollapse;''', '''        // Expose to window scope
        window.handleLogout = handleLogout;
        // toggleSidebarCollapse handled by dashboard-dual-sidebar.js''')

with open('pages/accounting/quotation.html', 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated quotation.html")

# 2. materials_purchasing.html
with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('''    <script>
        function toggleSidebarCollapse() {
            document.getElementById('sidebar').classList.toggle('collapsed');
            const mainWrapper = document.querySelector('.flex-1');
            if (mainWrapper) {
                // Not perfectly matching Mentra's logic but prevents errors
            }
        }
    </script>''', '    <!-- toggleSidebarCollapse handled by dashboard-dual-sidebar.js -->')

with open('pages/purchasing/materials_purchasing.html', 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated materials_purchasing.html")

# 3. materials_purchasing_company.html
with open('pages/purchasing/materials_purchasing_company.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('''    <script>
        function toggleSidebarCollapse() {
            document.getElementById('sidebar').classList.toggle('collapsed');
            const mainWrapper = document.querySelector('.flex-1');
            if (mainWrapper) {
                // Not perfectly matching Mentra's logic but prevents errors
            }
        }
    </script>''', '    <!-- toggleSidebarCollapse handled by dashboard-dual-sidebar.js -->')

with open('pages/purchasing/materials_purchasing_company.html', 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated materials_purchasing_company.html")
