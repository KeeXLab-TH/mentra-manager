import re

with open('pages/accounting/quotation.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'<script\s+type="module">(.*?)</script>', text, re.DOTALL)
if not m:
    print("No module script found")
    exit(0)

script = m.group(1)

# Let's find functions
func_matches = list(re.finditer(r'function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{', script))
for idx, fm in enumerate(func_matches):
    fn_name = fm.group(1)
    params = [p.strip().split('=')[0].strip() for p in fm.group(2).split(',') if p.strip()]
    start_pos = fm.end()
    
    # find matching closing brace
    depth = 1
    i = start_pos
    while i < len(script) and depth > 0:
        if script[i] == '{':
            depth += 1
        elif script[i] == '}':
            depth -= 1
        i += 1
    
    body = script[start_pos:i-1]
    
    # Check declared vars in function
    declared = set(params)
    # top-level window/globals
    declared.update(['window', 'document', 'console', 'localStorage', 'sessionStorage', 'Math', 'Date', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'RegExp', 'Error', 'Promise', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'alert', 'confirm', 'prompt', 'encodeURIComponent', 'decodeURIComponent', 'URL', 'URLSearchParams', 'Sortable'])
    
    # Find all let/const/var/function in body
    for m_decl in re.finditer(r'\b(let|const|var|function)\s+([a-zA-Z0-9_$]+)', body):
        declared.add(m_decl.group(2))
    
    # Also catch catch(err) and for (let x of/in)
    for m_catch in re.finditer(r'\bcatch\s*\(\s*([a-zA-Z0-9_$]+)\s*\)', body):
        declared.add(m_catch.group(1))

    # Also check globals in script outside functions
    # Check assignments in body
    for m_assign in re.finditer(r'(?:^|[;{}(,]\s*)([a-zA-Z0-9_$]+)\s*=(?!=)', body):
        v = m_assign.group(1)
        # Check if v is declared or global
        if v not in declared:
            # check if declared in outer script
            if not re.search(r'\b(?:let|const|var|function)\s+' + re.escape(v) + r'\b', script[:fm.start()]):
                print(f"In function {fn_name}(): Undeclared assignment to '{v}'")

print("Undeclared check complete.")
