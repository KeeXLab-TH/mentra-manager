with open('assets/js/dashboard-dual-sidebar.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, l in enumerate(lines):
    stripped = l.strip()
    # Check lines at top level indentation (4 spaces or less)
    if (l.startswith('    ') and not l.startswith('        ')) or (not l.startswith(' ')):
        if any(w in stripped for w in ['document.', 'window.addEventListener', 'initSidebar', 'getElementById']):
            print(f"Line {idx+1}: {stripped[:80]}")
