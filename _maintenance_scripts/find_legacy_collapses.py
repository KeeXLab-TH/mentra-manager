import glob
import re

files = sorted(glob.glob('pages/**/*.html', recursive=True))

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Find scripts defining toggleSidebarCollapse
    matches = list(re.finditer(r'(?:function\s+toggleSidebarCollapse|window\.toggleSidebarCollapse\s*=)', c))
    if matches:
        print(f"File: {fpath}")
        for m in matches:
            start = max(0, m.start() - 30)
            end = min(len(c), m.start() + 150)
            snippet = c[start:end].replace('\n', ' ')
            print(f"  Line ~: {c[:m.start()].count(chr(10))+1} -> {snippet[:120]}")
