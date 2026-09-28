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
    const tmpDir = 'C:\\Users\\Thanapoom\\AppData\\Local\\Temp\\chrome-cdp-' + Date.now();
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless=new',
        '--remote-debugging-port=9222',
        `--user-data-dir=${tmpDir}`,
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'about:blank'
    ]);

    // Wait for Chrome to open debugging port
    let version = null;
    for (let i = 0; i < 30; i++) {
        await wait(200);
        try {
            version = await getJson('http://127.0.0.1:9222/json/version');
            if (version && version.webSocketDebuggerUrl) break;
        } catch(e) {}
    }

    if (!version) {
        console.error('Could not connect to Chrome port 9222');
        chrome.kill();
        return;
    }

    console.log('Connected to Chrome!', version.Browser);
    const targets = await getJson('http://127.0.0.1:9222/json/list');
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);

    let id = 1;
    function send(method, params = {}) {
        const msgId = id++;
        ws.send(JSON.stringify({ id: msgId, method, params }));
        return msgId;
    }

    ws.addEventListener('open', () => {
        console.log('WebSocket opened');
        send('Runtime.enable');
        send('Page.enable');
        send('Console.enable');
        
        // Navigate
        const targetUrl = 'http://127.0.0.1:5500/pages/accounting/quotation.html?projectId=proj_1788249624189&source=school&shop=%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A9%E0%B8%B1%E0%B8%97%20%E0%B9%80%E0%B8%A1%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B9%89%E0%B8%B2%20%E0%B9%82%E0%B8%8B%E0%B8%A5%E0%B8%B9%E0%B8%8A%E0%B8%B1%E0%B9%88%E0%B8%99%20%E0%B8%88%E0%B8%B3%E0%B8%81%E0%B8%B1%E0%B8%94%20(%E0%B8%AA%E0%B8%B3%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%83%E0%B8%AB%E0%B8%8D%E0%B9%88)&testBypassAuth=true';
        console.log('Navigating to:', targetUrl);
        send('Page.navigate', { url: targetUrl });
    });

    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
            console.log(`[CONSOLE ${msg.params.type.toUpperCase()}]`, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[UNCAUGHT EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
        } else if (msg.method === 'Page.loadEventFired') {
            console.log('[PAGE LOAD EVENT FIRED]');
        } else if (msg.result && msg.result.result) {
            console.log('[EVAL RESULT]', msg.result.result.value);
        }
    });

    // Wait 8 seconds to capture everything
    await wait(8000);

    // Test clicking currentIssuerBanner and selecting a shop
    send('Runtime.evaluate', {
        expression: `(() => {
            const banner = document.getElementById('currentIssuerBanner');
            if (banner) banner.click();
            
            const firstShopCard = document.querySelector('#issuerCardsContainer > div:nth-child(2)');
            const shopNameBefore = document.getElementById('currentIssuerDisplay')?.innerText;
            if (firstShopCard) firstShopCard.click();
            const shopNameAfter = document.getElementById('currentIssuerDisplay')?.innerText;
            const modalStyle = document.getElementById('issuerSelectionModal')?.style?.display;
            
            return JSON.stringify({
                shopNameBefore,
                shopNameAfter,
                modalClosed: modalStyle === 'none',
                shopCardClicked: !!firstShopCard
            });
        })()`
    });

    await wait(1000);

    ws.close();
    chrome.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
