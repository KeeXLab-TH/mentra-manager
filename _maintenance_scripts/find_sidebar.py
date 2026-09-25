with open('pages/admin/dashboard.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if any(keyword in line for keyword in ['rail-primary', 'id="sidebar"', 'class="sidebar', '<aside']):
            print(f"{i+1}: {line.strip()[:120]}")
