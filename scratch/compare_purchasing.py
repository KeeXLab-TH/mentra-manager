with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html_school = f.read()

with open('pages/purchasing/materials_purchasing_company.html', 'r', encoding='utf-8') as f:
    html_comp = f.read()

print("School length:", len(html_school))
print("Company length:", len(html_comp))

# Check for differences in main wrapper / topbar / workspace
import re
def get_main_content(html):
    m = re.search(r'(<!-- ===== MAIN WRAPPER ===== -->.*?<footer)', html, re.DOTALL)
    return m.group(1) if m else "NOT FOUND"

print("School main wrapper head:")
print(get_main_content(html_school)[:500])
print("\nCompany main wrapper head:")
print(get_main_content(html_comp)[:500])
