import urllib.request, json, time
import subprocess
from cdp_client import create_ws_client, send_ws_message, recv_ws_message

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
proc = subprocess.Popen([edge_path, '--headless=new', '--remote-debugging-port=9225', '--disable-gpu'])
time.sleep(2)
try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9225/json').read().decode())
    target = None
    for t in tabs:
        if t.get('type') == 'page':
            target = t
            break
    if not target: target = tabs[0]
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
            
    # Wait 1s for DOMContentLoaded / init scripts
    time.sleep(1)

    eval_state = '''
    JSON.stringify((function() {
        var sidebar = document.getElementById('sidebar');
        var btn = document.getElementById('railCollapseBtn');
        var wrapper = document.querySelector('.main-wrapper') || document.querySelector('.flex-1');
        var sec = sidebar ? sidebar.querySelector('.rail-secondary') : null;
        return {
            sidebarClasses: sidebar ? sidebar.className : null,
            sidebarWidth: sidebar ? sidebar.offsetWidth : null,
            wrapperMargin: wrapper ? window.getComputedStyle(wrapper).marginLeft : null,
            wrapperWidth: wrapper ? window.getComputedStyle(wrapper).width : null,
            secDisplay: sec ? window.getComputedStyle(sec).display : null,
            secWidth: sec ? sec.offsetWidth : null,
            btnTitle: btn ? btn.title : null
        };
    })())
    '''
    
    # 1. State Before Click
    send_ws_message(ws, {'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': eval_state, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 10:
            print('1. BEFORE CLICK:', m['result']['result']['value'])
            break

    # 2. Click Collapse Button
    click_expr = '''
    (function() {
        var btn = document.getElementById('railCollapseBtn');
        if (!btn) return "Button not found!";
        btn.click();
        return "Clicked!";
    })()
    '''
    send_ws_message(ws, {'id': 20, 'method': 'Runtime.evaluate', 'params': {'expression': click_expr, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 20:
            print('2. CLICK 1 RESULT:', m['result']['result']['value'])
            break

    time.sleep(0.5)

    # 3. State After Click 1 (Should be Collapsed!)
    send_ws_message(ws, {'id': 30, 'method': 'Runtime.evaluate', 'params': {'expression': eval_state, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 30:
            print('3. AFTER CLICK 1 (COLLAPSED):', m['result']['result']['value'])
            break

    # 4. Click Again (Should Expand!)
    send_ws_message(ws, {'id': 40, 'method': 'Runtime.evaluate', 'params': {'expression': click_expr, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 40:
            print('4. CLICK 2 RESULT:', m['result']['result']['value'])
            break

    time.sleep(0.5)

    # 5. State After Click 2 (Should be Expanded!)
    send_ws_message(ws, {'id': 50, 'method': 'Runtime.evaluate', 'params': {'expression': eval_state, 'returnByValue': True}})
    while True:
        m = recv_ws_message(ws)
        if m.get('id') == 50:
            print('5. AFTER CLICK 2 (EXPANDED):', m['result']['result']['value'])
            break

finally:
    proc.terminate()
