const { spawn } = require('child_process');
const http = require('http');

async function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    const tmpDir = 'C:\\Users\\Thanapoom\\AppData\\Local\\Temp\\chrome-debug-' + Date.now();
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless=new',
        '--remote-debugging-port=9225',
        `--user-data-dir=${tmpDir}`,
        'about:blank'
    ]);

    let version = null;
    for (let i = 0; i < 30; i++) {
        await wait(200);
        try {
            version = await getJson('http://127.0.0.1:9225/json/version');
            if (version && version.webSocketDebuggerUrl) break;
        } catch(e) {}
    }

    const targets = await getJson('http://127.0.0.1:9225/json/list');
    const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const reqId = id++;
            const handler = (msg) => {
                const data = JSON.parse(typeof msg.data === 'string' ? msg.data : msg);
                if (data.id === reqId) {
                    ws.removeEventListener('message', handler);
                    resolve(data);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: reqId, method, params }));
        });
    }

    ws.onopen = async () => {
        await send('Page.enable');
        await send('Runtime.enable');

        ws.addEventListener('message', (msg) => {
            const data = JSON.parse(typeof msg.data === 'string' ? msg.data : msg);
            if (data.method === 'Runtime.consoleAPICalled') {
                console.log('[CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
            } else if (data.method === 'Runtime.exceptionThrown') {
                console.error('[EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
            }
        });

        await send('Page.navigate', { url: 'http://127.0.0.1:5500/pages/accounting/quotation.html' });
        await wait(4000);

        const checkLoc = await send('Runtime.evaluate', {
            expression: `window.location.href + ' ||| ' + document.title + ' ||| ' + document.body?.innerHTML?.substring(0, 300)`,
            returnByValue: true
        });
        console.log('Current Page Info:', checkLoc.result.result.value);

        const check1 = await send('Runtime.evaluate', {
            expression: `document.readyState`,
            returnByValue: true
        });
        console.log('readyState:', check1.result.result.value);

        const check2 = await send('Runtime.evaluate', {
            expression: `document.getElementById('issuerSelectionModal') ? 'FOUND' : 'NOT FOUND'`,
            returnByValue: true
        });
        console.log('issuerSelectionModal:', check2.result.result.value);

        const check3 = await send('Runtime.evaluate', {
            expression: `document.getElementById('currentIssuerBanner') ? 'FOUND' : 'NOT FOUND'`,
            returnByValue: true
        });
        console.log('currentIssuerBanner:', check3.result.result.value);

        const check4 = await send('Runtime.evaluate', {
            expression: `document.querySelector('.issuer-switch-btn') ? 'FOUND' : 'NOT FOUND'`,
            returnByValue: true
        });
        console.log('issuer-switch-btn:', check4.result.result.value);

        // Check if there is an error when calling openIssuerSelectionModal()
        const check5 = await send('Runtime.evaluate', {
            expression: `(() => {
                try {
                    window.openIssuerSelectionModal();
                    return 'SUCCESS: modal display is ' + document.getElementById('issuerSelectionModal').style.display;
                } catch(e) {
                    return 'ERROR: ' + e.message + '\\n' + e.stack;
                }
            })()`,
            returnByValue: true
        });
        console.log('Call openIssuerSelectionModal():', check5.result.result.value);

        ws.close();
        chrome.kill();
    };
}

run().catch(console.error);
