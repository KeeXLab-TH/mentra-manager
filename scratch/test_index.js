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
        '--remote-debugging-port=9227',
        `--user-data-dir=${tmpDir}`,
        'about:blank'
    ]);

    try {
        let version = null;
        for (let i = 0; i < 30; i++) {
            await wait(200);
            try {
                version = await getJson('http://127.0.0.1:9227/json/version');
                if (version && version.webSocketDebuggerUrl) break;
            } catch(e) {}
        }

        const targets = await getJson('http://127.0.0.1:9227/json/list');
        const pageTarget = targets.find(t => t.type === 'page');
        const wsUrl = pageTarget.webSocketDebuggerUrl;
        const ws = new WebSocket(wsUrl);

        await new Promise(res => ws.onopen = res);

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

        // Listen for console and exceptions
        ws.addEventListener('message', (msg) => {
            const data = JSON.parse(typeof msg.data === 'string' ? msg.data : msg);
            if (data.method === 'Runtime.consoleAPICalled') {
                console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
            }
            if (data.method === 'Runtime.exceptionThrown') {
                console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
            }
        });

        await send('Runtime.enable');
        await send('Page.enable');
        await send('Page.navigate', { url: 'http://127.0.0.1:5500/index.html' });

        await wait(3000);

        // Check if window.handleLogin exists
        const res = await send('Runtime.evaluate', {
            expression: `({
                handleLoginType: typeof window.handleLogin,
                handleSignupType: typeof window.handleSignup,
                inlineAlertDisplay: document.getElementById('inlineAlert')?.style.display,
                loginBtn: !!document.getElementById('loginBtn'),
                loginIdentifier: !!document.getElementById('loginIdentifier'),
                loginPassword: !!document.getElementById('loginPassword'),
                signupConfirmPassword: !!document.getElementById('signupConfirmPassword'),
                signupConfirm: !!document.getElementById('signupConfirm'),
            })`,
            returnByValue: true
        });

        console.log('DOM & Window Check RAW:', JSON.stringify(res, null, 2));

        // Test clicking login with empty fields
        console.log('Testing handleLogin with empty fields...');
        const clickRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                try {
                    await window.handleLogin();
                    const alertEl = document.getElementById('inlineAlert');
                    const msgEl = document.getElementById('alertMsg');
                    return {
                        alertVisible: alertEl ? getComputedStyle(alertEl).display : 'none',
                        alertText: msgEl ? msgEl.textContent : '',
                        alertClass: alertEl ? alertEl.className : ''
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        // Query users in firestore
        console.log('Querying existing users...');
        const usersListRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                try {
                    const snap = await window.getDocsTest?.() || null;
                    return snap;
                } catch(e) {
                    return e.message;
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        // Test forgot password
        console.log('Testing handleForgotPassword...');
        const forgotRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                try {
                    if (typeof window.handleForgotPassword !== 'function') {
                        return { error: 'window.handleForgotPassword is not a function: ' + typeof window.handleForgotPassword };
                    }
                    document.getElementById('loginIdentifier').value = 'test@example.com';
                    await window.handleForgotPassword();
                    const alertEl = document.getElementById('inlineAlert');
                    const msgEl = document.getElementById('alertMsg');
                    return {
                        alertVisible: alertEl ? getComputedStyle(alertEl).display : 'none',
                        alertText: msgEl ? msgEl.textContent : '',
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('Forgot Password Test Result:', JSON.stringify(forgotRes.result?.result?.value, null, 2));

        // Test signup
        console.log('Testing handleSignup...');
        const signupRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                try {
                    // switch tab
                    switchTab('signup');
                    await new Promise(r => setTimeout(r, 200));
                    // fill fields
                    document.getElementById('signupFirstName').value = 'สมชาย';
                    document.getElementById('signupLastName').value = 'ใจดี';
                    document.getElementById('signupUsername').value = 'somchai_test';
                    document.getElementById('signupEmail').value = 'somchai@test.com';
                    document.getElementById('signupPassword').value = 'password123';
                    const confirmInput = document.getElementById('signupConfirmPassword') || document.getElementById('signupConfirm');
                    if (confirmInput) confirmInput.value = 'password123';

                    const sBtn = document.getElementById('signupBtn');
                    sBtn.click();
                    await new Promise(r => setTimeout(r, 1500));

                    const alertEl = document.getElementById('inlineAlert');
                    const msgEl = document.getElementById('alertMsg');
                    return {
                        alertVisible: alertEl ? getComputedStyle(alertEl).display : 'none',
                        alertText: msgEl ? msgEl.textContent : '',
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('Signup Test Result:', JSON.stringify(signupRes.result?.result?.value, null, 2));

        ws.close();
    } finally {
        chrome.kill();
    }
}

run().catch(console.error);
