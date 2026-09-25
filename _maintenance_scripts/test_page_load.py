import urllib.request, json, time
import subprocess
from cdp_client import create_ws_client, send_ws_message, recv_ws_message

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
proc = subprocess.Popen([edge_path, '--headless=new', '--remote-debugging-port=9224', '--disable-gpu'])
time.sleep(2)
try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9224/json').read().decode())
    target = [t for t in tabs if t.get('type') == 'page'][0]
    ws = create_ws_client(target['webSocketDebuggerUrl'])
    send_ws_message(ws, {'id': 1, 'method': 'Page.enable'})
    send_ws_message(ws, {'id': 2, 'method': 'Runtime.enable'})
    send_ws_message(ws, {'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8000/pages/admin/dashboard.html'}})
    
    # Wait for Page.loadEventFired
    while True:
        m = recv_ws_message(ws)
        if m.get('method') == 'Page.loadEventFired':
            print('Page loaded!')
            break
            
    # Check url & title
    expr = 'JSON.stringify({url: location.href, title: document.title, bodyLen: document.body.innerHTML.length, sidebar: !!document.getElementById("sidebar")})'
    send_ws_message(ws, {'id': 4, 'method': 'Runtime.evaluate', 'params': {'expression': expr, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 4:
            print('Page info:', m['result']['result']['value'])
            break
finally:
    proc.terminate()
