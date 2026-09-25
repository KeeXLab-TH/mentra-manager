import os
import glob
import re

files = glob.glob('pages/**/*.html', recursive=True)
files = [f.replace('\\', '/') for f in sorted(files)]

print(f"Total HTML files in pages/: {len(files)}")
for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {fpath}: {e}")
        continue
    
    has_aside = '<aside' in content.lower()
    has_sidebar_class = 'class="sidebar' in content or "class='sidebar" in content
    has_main_wrapper = 'main-wrapper' in content
    has_dual_sidebar_css = 'dashboard-dual-sidebar.css' in content
    has_dual_sidebar_js = 'dashboard-dual-sidebar.js' in content
    has_boxicons = 'boxicons' in content.lower()
    
    # find sidebar tag
    m = re.search(r'(<aside[^>]*class=["\'][^"\']*sidebar[^"\']*["\'][^>]*>|<div[^>]*class=["\'][^"\']*sidebar[^"\']*["\'][^>]*>)', content, re.I)
    sidebar_tag = m.group(1) if m else "NONE"
    
    print(f"File: {fpath}")
    print(f"  Sidebar Tag: {sidebar_tag[:60]}")
    print(f"  has_aside: {has_aside} | has_main_wrapper: {has_main_wrapper}")
    print(f"  has_css: {has_dual_sidebar_css} | has_js: {has_dual_sidebar_js} | boxicons: {has_boxicons}")
