import subprocess, time, urllib.request, json, os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--headless",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "http://127.0.0.1:5500/pages/purchasing/materials_purchasing.html"
])

time.sleep(3)

try:
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as resp:
        tabs = json.loads(resp.read().decode('utf-8'))
        print("Chrome tabs:", len(tabs))
        for t in tabs:
            print("  Tab:", t.get('title'), t.get('url'))
finally:
    proc.terminate()
