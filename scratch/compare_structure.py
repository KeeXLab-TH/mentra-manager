with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f1:
    lines1 = f1.readlines()

with open('pages/purchasing/materials_purchasing_company.html', 'r', encoding='utf-8') as f2:
    lines2 = f2.readlines()

print(f"materials_purchasing.html lines: {len(lines1)}")
print(f"materials_purchasing_company.html lines: {len(lines2)}")

# Compare head scripts and styles
def get_tags(lines):
    tags = []
    for i, l in enumerate(lines):
        if any(x in l for x in ['<link', '<script', '<header', '<main', '</main', 'class="main-wrapper']):
            tags.append((i+1, l.strip()[:80]))
    return tags

t1 = get_tags(lines1)
t2 = get_tags(lines2)

print("--- Tags in materials_purchasing.html ---")
for idx, l in t1:
    print(f"  L{idx}: {l}")

print("\n--- Tags in materials_purchasing_company.html ---")
for idx, l in t2:
    print(f"  L{idx}: {l}")
