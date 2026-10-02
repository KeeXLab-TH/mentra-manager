with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
for idx in range(7789, 7925):
    line = lines[idx]
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    clean_line = line.strip().encode('ascii', 'replace').decode('ascii')
    print(f'{idx+1}: (depth={depth}) {clean_line[:80]}')
