import re
import subprocess
import tempfile
import os

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract script tags with inline js
script_matches = list(re.finditer(r'<script(?:\s+[^>]*)?>(.*?)</script>', html, re.DOTALL | re.I))

for i, match in enumerate(script_matches):
    tag = match.group(0)
    # Check if it has src
    src_match = re.search(r'src=["\']([^"\']+)["\']', tag[:tag.find('>')])
    if src_match:
        print(f"Script {i}: external src = {src_match.group(1)}")
        continue
    
    code = match.group(1)
    if not code.strip():
        continue
        
    print(f"Script {i}: inline code length {len(code)}")
    # write to temp file and test syntax with node -c
    temp_path = f"scratch/test_script_{i}.js"
    with open(temp_path, "w", encoding="utf-8") as tf:
        tf.write(code)
    
    res = subprocess.run(["node", "-c", temp_path], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERROR in script {i}:")
        print(res.stderr)
    else:
        print(f"Script {i}: JS syntax OK")
