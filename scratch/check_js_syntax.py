import sys, re, subprocess

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.findall(r'<script(?:\s+[^>]*)?>([\s\S]*?)</script>', html, re.IGNORECASE)

print(f"Found {len(scripts)} script tags in materials_purchasing.html")

for idx, script in enumerate(scripts):
    code = script.strip()
    if not code:
        continue
    # write to temp file and test with node
    temp_file = f"scratch/test_script_{idx}.js"
    with open(temp_file, 'w', encoding='utf-8') as tf:
        tf.write(code)
    try:
        res = subprocess.run(["node", "--check", temp_file], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[ERROR] Script #{idx} has syntax error:")
            print(res.stderr[:500])
        else:
            print(f"[OK] Script #{idx} passed syntax check.")
    except Exception as e:
        print(f"Could not run node: {e}")
