import re
import subprocess

with open('pages/purchasing/materials_purchasing_company.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'exportColumns' in line:
        print(f'exportColumns around line {idx+1}')
    if idx > len(lines) - 150 and '});' in line:
        print(f'}}); around line {idx+1}: {repr(line)}')
