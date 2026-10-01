import re

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Search for any assignment to app or main or body
for m in re.finditer(r'(document\.(?:body|documentElement|getElementById\([\'"]app[\'"]\)|querySelector\([^)]*\))(?:\.innerHTML|\.outerHTML|\.style)?\s*=[^;\n]+;)', text):
    print("Found DOM override:", m.group(1)[:120])
