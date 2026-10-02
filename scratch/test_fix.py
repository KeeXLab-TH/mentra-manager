import re
import subprocess
import os

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 7378 (index 7377) is extra '}'
# Line 8181 (index 8180) is extra '});'
print(f'Line 7378 was: {repr(lines[7377])}')
print(f'Line 8181 was: {repr(lines[8180])}')

del lines[8180]
del lines[7377]

fixed_content = ''.join(lines)
scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', fixed_content, re.DOTALL)

for i, s in enumerate(scripts):
    s = s.strip()
    if not s:
        continue
    test_file = f'scratch/test_fixed_script_{i}.js'
    with open(test_file, 'w', encoding='utf-8') as sf:
        sf.write(s)
    
    # check syntax
    res = subprocess.run(['node', '--check', test_file], capture_output=True, text=True)
    if res.returncode == 0:
        print(f'Script {i}: JS syntax OK!')
    else:
        print(f'Script {i} ERROR:\n{res.stderr}')
