import subprocess
import time
import json
import urllib.request
import asyncio
import sys

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Launch Edge with remote debugging
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "http://localhost:8000/pages/admin/dashboard.html"
])

print("Edge launched, waiting 2s...")
time.sleep(2)

try:
    # Get WebSocket debugger URL
    resp = urllib.request.urlopen("http://localhost:9222/json")
    tabs = json.loads(resp.read().decode())
    print("Found tabs:", len(tabs))
    target = tabs[0]
    ws_url = target.get("webSocketDebuggerUrl")
    print("ws_url:", ws_url)
finally:
    proc.terminate()
