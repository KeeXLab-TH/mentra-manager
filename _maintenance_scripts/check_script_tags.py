import glob

files = sorted(glob.glob('pages/**/*.html', recursive=True))
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()
    if '<aside' in c:
        has_script = '<script src="../../assets/js/dashboard-dual-sidebar.js"></script>' in c or "<script src='../../assets/js/dashboard-dual-sidebar.js'></script>" in c
        print(f"{f}: script tag = {has_script}")
