import re

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html = f.read()

print(f"Total length: {len(html)}")

# Find all id's containing view or main
view_ids = re.findall(r'id=["\']([^"\']*(?:view|main|app)[^"\']*)["\']', html, re.I)
print("Matching IDs:", view_ids)

# Check scripts inside the html
scripts = re.findall(r'<script.*?</script>', html, re.DOTALL | re.I)
print(f"Found {len(scripts)} script tags")

# Check for window.onload or DOMContentLoaded or init
for i, s in enumerate(scripts):
    if 'DOMContentLoaded' in s or 'init' in s or 'appData' in s:
        print(f"Script {i} matches keywords, length {len(s)}")
