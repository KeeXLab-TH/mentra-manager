import socket
import base64
import hashlib
import os
import json
import urllib.request
import subprocess
import time
import sys

def create_ws_client(ws_url):
    # ws_url looks like ws://localhost:9222/devtools/page/XYZ
    parts = ws_url.replace("ws://", "").split("/", 1)
    host, port = parts[0].split(":")
    path = "/" + parts[1]
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, int(port)))
    
    key = base64.b64encode(os.urandom(16)).decode()
    handshake = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(handshake.encode())
    
    # Read response
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(1024)
    
    return s

def send_ws_message(s, msg_obj):
    data = json.dumps(msg_obj).encode('utf-8')
    length = len(data)
    
    # Frame header
    header = bytearray([0x81]) # FIN + text
    mask = os.urandom(4)
    
    if length <= 125:
        header.append(0x80 | length)
    elif length <= 65535:
        header.append(0x80 | 126)
        header.extend(length.to_bytes(2, 'big'))
    else:
        header.append(0x80 | 127)
        header.extend(length.to_bytes(8, 'big'))
        
    header.extend(mask)
    masked_data = bytearray(b ^ mask[i % 4] for i, b in enumerate(data))
    s.sendall(header + masked_data)

def recv_ws_message(s):
    b1, b2 = s.recv(2)
    opcode = b1 & 0x0f
    is_masked = bool(b2 & 0x80)
    length = b2 & 0x7f
    if length == 126:
        length = int.from_bytes(s.recv(2), 'big')
    elif length == 127:
        length = int.from_bytes(s.recv(8), 'big')
        
    mask = s.recv(4) if is_masked else None
    data = b""
    while len(data) < length:
        chunk = s.recv(length - len(data))
        if not chunk: break
        data += chunk
        
    if is_masked:
        data = bytearray(b ^ mask[i % 4] for i, b in enumerate(data))
    return json.loads(data.decode('utf-8', errors='ignore'))

# Run Edge test
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9223",
    "--disable-gpu",
    "http://localhost:8000/pages/admin/dashboard.html"
])
time.sleep(2)

try:
    tabs_resp = urllib.request.urlopen("http://localhost:9223/json")
    tabs = json.loads(tabs_resp.read().decode())
    target = None
    for t in tabs:
        if t.get("type") == "page":
            target = t
            break
    if not target: target = tabs[0]
    ws_url = target.get("webSocketDebuggerUrl")
    print("Connecting to ws_url:", ws_url)
    
    ws = create_ws_client(ws_url)
    print("WebSocket connected!")
    
    # 1. Enable Page & Runtime
    send_ws_message(ws, {"id": 1, "method": "Page.enable"})
    send_ws_message(ws, {"id": 2, "method": "Runtime.enable"})
    
    # Navigate explicitly
    send_ws_message(ws, {"id": 20, "method": "Page.navigate", "params": {"url": "http://localhost:8000/pages/admin/dashboard.html"}})
    time.sleep(2)
    
    # 2. Check sidebar classes and dimensions before click
    eval_cmd = """
    (function() {
        var sidebar = document.getElementById('sidebar');
        var railCollapseBtn = document.getElementById('railCollapseBtn');
        var mainWrapper = document.querySelector('.main-wrapper') || document.querySelector('.flex-1');
        return {
            sidebarExists: !!sidebar,
            btnExists: !!railCollapseBtn,
            sidebarClasses: sidebar ? sidebar.className : null,
            sidebarWidth: sidebar ? sidebar.offsetWidth : null,
            wrapperMargin: mainWrapper ? window.getComputedStyle(mainWrapper).marginLeft : null,
            wrapperWidth: mainWrapper ? window.getComputedStyle(mainWrapper).width : null,
            railSecondaryDisplay: sidebar ? window.getComputedStyle(sidebar.querySelector('.rail-secondary')).display : null
        };
    })()
    """
    send_ws_message(ws, {"id": 3, "method": "Runtime.evaluate", "params": {"expression": eval_cmd, "returnByValue": True}})
    
    # Read responses until id 3
    while True:
        msg = recv_ws_message(ws)
        if msg.get("id") == 3:
            print("FULL MSG 3:", json.dumps(msg))
            break
            
    # 3. Simulate clicking railCollapseBtn
    click_cmd = """
    (function() {
        var btn = document.getElementById('railCollapseBtn');
        if (btn) {
            btn.click();
            return "Clicked button!";
        }
        return "Button not found!";
    })()
    """
    send_ws_message(ws, {"id": 4, "method": "Runtime.evaluate", "params": {"expression": click_cmd, "returnByValue": True}})
    while True:
        msg = recv_ws_message(ws)
        if msg.get("id") == 4:
            print("FULL MSG 4:", json.dumps(msg))
            break
            
    time.sleep(0.5)
    
    # 4. Check sidebar classes and dimensions AFTER click
    send_ws_message(ws, {"id": 5, "method": "Runtime.evaluate", "params": {"expression": eval_cmd, "returnByValue": True}})
    while True:
        msg = recv_ws_message(ws)
        if msg.get("id") == 5:
            print("FULL MSG 5:", json.dumps(msg))
            break

    # 5. Check console errors
    check_errors = """
    (function() {
        return window.__errors || [];
    })()
    """
    send_ws_message(ws, {"id": 6, "method": "Runtime.evaluate", "params": {"expression": check_errors, "returnByValue": True}})
    while True:
        msg = recv_ws_message(ws)
        if msg.get("id") == 6:
            break

finally:
    proc.terminate()
