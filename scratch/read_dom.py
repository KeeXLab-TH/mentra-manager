import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/rendered_dom.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print('Rendered DOM length:', len(text))
print('Has topbar:', 'class="topbar"' in text)
print('Has main:', '<main' in text)
print('Has institutions-grid:', 'id="institutions-grid"' in text)
print('Has body style:', 'style=' in text[:text.find('<body')+100])

body_start = text.find('<body')
print('Body tag:', text[body_start:body_start+150])

# Check URL redirect
if 'index.html' in text and len(text) < 10000:
    print("Redirected to index.html!")
