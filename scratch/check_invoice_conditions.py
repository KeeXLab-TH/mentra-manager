import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('pages/accounting/quotation.html', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()
for idx, line in enumerate(lines):
    if "currentDocType === 'invoice'" in line or "type === 'invoice'" in line or "docType === 'invoice'" in line:
        print(f"{idx+1}: {line.strip()}")
