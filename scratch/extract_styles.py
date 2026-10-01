with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
styles = re.findall(r'<style(?:\s+[^>]*)?>([\s\S]*?)</style>', html, re.IGNORECASE)
print(f"Found {len(styles)} style tags")

with open('scratch/all_styles.css', 'w', encoding='utf-8') as out:
    for idx, s in enumerate(styles):
        out.write(f"\n/* === STYLE TAG {idx} === */\n")
        out.write(s)

print("Saved all styles to scratch/all_styles.css")
