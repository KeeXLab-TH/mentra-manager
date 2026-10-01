/**
 * ==============================================================================
 * MENTRA MANAGER — ENTERPRISE SESSION SECURITY GUARD
 * assets/js/session-guard.js
 * 
 * ระบบความปลอดภัยและการจัดการเซสชันระดับองค์กร:
 * 1. Absolute Timeout (5 ชั่วโมง): บังคับออกจากระบบเมื่อล็อกอินครบ 5 ชั่วโมง
 * 2. Inactivity / Idle Timeout (2 ชั่วโมง): ออกจากระบบเมื่อไม่มีการขยับ/ใช้งานเกิน 2 ชม.
 * 3. Browser / Tab Close Detection: เมื่อปิดเบราว์เซอร์หรือปิดแท็บทั้งหมด เซสชันจะสิ้นสุด
 * 4. Multi-Tab Synchronization: ซิงค์สถานะล็อกอิน-ล็อกเอาต์ข้ามทุกแท็บด้วย BroadcastChannel
 * 5. Instant Wakeup Check: ตรวจสอบทันทีเมื่อเปิดแท็บกลับมา (focus / visibilitychange)
 * 6. Clean URL Redirects: แจ้งเตือนข้อความภาษาไทยที่ชัดเจนเมื่อเซสชันหมดอายุ
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // Prevent duplicate initialization
    if (global.MentraSessionGuard) return;

    // --- Configuration & Storage Keys ---
    const CONFIG = Object.assign({
        ABSOLUTE_TIMEOUT_MS: 5 * 60 * 60 * 1000,  // 5 Hours
        IDLE_TIMEOUT_MS: 2 * 60 * 60 * 1000,      // 2 Hours
        CHECK_INTERVAL_MS: 15 * 1000,              // Check every 15s
        ACTIVITY_THROTTLE_MS: 30 * 1000,           // Throttle activity writes to 30s
        HANDSHAKE_TIMEOUT_MS: 250,                 // Multi-tab ping wait time
        CHANNEL_NAME: 'mentra_security_session_channel'
    }, global.MENTRA_SECURITY_CONFIG || {});

    const KEYS = {
        SESSION_START: 'mentra_session_start',
        LAST_ACTIVITY: 'mentra_last_activity',
        SESSION_ALIVE: 'mentra_session_alive',
        USER_PERMS: 'mentra_user_permissions'
    };

    // Generate unique ID for this browser tab
    const TAB_ID = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    let broadcastChannel = null;
    let isTerminating = false;
    let lastThrottledActivity = 0;

    // --- Path & Page Helpers ---
    function getNormalizedPath() {
        return (global.location.pathname || '').replace(/\\/g, '/');
    }

    function isLoginPage() {
        const path = getNormalizedPath();
        return path.endsWith('/index.html') || path.endsWith('/') || (!path.includes('/pages/') && (path.endsWith('index.html') || path.split('/').pop() === ''));
    }

    function isExemptPage() {
        const path = getNormalizedPath();
        const search = global.location.search || '';

        // 1. Login page itself is exempt from guard enforcement
        if (isLoginPage()) return true;

        // 2. Public registration form for external attendees
        if (path.includes('register_training.html')) return true;

        // 3. Public shared project view (Guest mode)
        if (path.includes('materials_purchasing.html')) {
            const params = new URLSearchParams(search);
            if (params.get('mode') === 'view' && params.get('projectId')) {
                return true;
            }
        }

        return false;
    }

    function getLoginUrl(reason) {
        const path = getNormalizedPath();
        let prefix = 'index.html';

        if (path.includes('/pages/admin/') || path.includes('/pages/purchasing/') ||
            path.includes('/pages/accounting/') || path.includes('/pages/schedule/')) {
            prefix = '../../index.html';
        } else if (path.includes('/pages/')) {
            prefix = '../index.html';
        }

        return prefix + (reason ? ('?msg=' + encodeURIComponent(reason)) : '');
    }

    // --- BroadcastChannel for Multi-Tab Sync ---
    function initBroadcastChannel() {
        if ('BroadcastChannel' in global) {
            try {
                broadcastChannel = new BroadcastChannel(CONFIG.CHANNEL_NAME);
                broadcastChannel.onmessage = handleBroadcastMessage;
            } catch (err) {
                console.warn('[MentraSessionGuard] BroadcastChannel init error:', err);
            }
        }
    }

    function handleBroadcastMessage(event) {
        if (!event || !event.data) return;
        const msg = event.data;

        // Handle Ping from a newly opened tab
        if (msg.type === 'PING_SESSION') {
            const isAlive = sessionStorage.getItem(KEYS.SESSION_ALIVE) === '1';
            const sessionStart = localStorage.getItem(KEYS.SESSION_START);
            if (isAlive && sessionStart) {
                // Respond to pinging tab that an active session exists
                broadcastChannel.postMessage({
                    type: 'PONG_SESSION',
                    targetTabId: msg.tabId,
                    start: sessionStart,
                    lastActivity: localStorage.getItem(KEYS.LAST_ACTIVITY) || Date.now().toString()
                });
            }
        }

        // Handle global logout triggered by another tab
        if (msg.type === 'LOGOUT_ALL') {
            if (!isTerminating && !isLoginPage()) {
                isTerminating = true;
                sessionStorage.removeItem(KEYS.SESSION_ALIVE);
                global.location.href = getLoginUrl(msg.reason || 'logged_out');
            }
        }
    }

    function broadcastLogout(reason) {
        if (broadcastChannel) {
            try {
                broadcastChannel.postMessage({
                    type: 'LOGOUT_ALL',
                    senderTabId: TAB_ID,
                    reason: reason
                });
            } catch (e) {}
        }
    }

    // --- Session Life-cycle Management ---
    function startSession() {
        const now = Date.now().toString();
        sessionStorage.setItem(KEYS.SESSION_ALIVE, '1');
        localStorage.setItem(KEYS.SESSION_START, now);
        localStorage.setItem(KEYS.LAST_ACTIVITY, now);
    }

    function clearSessionData() {
        sessionStorage.removeItem(KEYS.SESSION_ALIVE);
        localStorage.removeItem(KEYS.SESSION_START);
        localStorage.removeItem(KEYS.LAST_ACTIVITY);
        localStorage.removeItem(KEYS.USER_PERMS);
    }

    async function terminateSession(reason) {
        if (isTerminating) return;
        isTerminating = true;

        clearSessionData();
        broadcastLogout(reason);

        // Best effort: Attempt to sign out if Firebase Auth instance is available
        try {
            if (global._auth && typeof global._auth.signOut === 'function') {
                await global._auth.signOut().catch(() => {});
            } else if (global.auth && typeof global.auth.signOut === 'function') {
                await global.auth.signOut().catch(() => {});
            }
        } catch (e) {}

        global.location.href = getLoginUrl(reason);
    }

    // --- Activity Tracking (Throttled) ---
    function recordUserActivity() {
        const now = Date.now();
        if (now - lastThrottledActivity > CONFIG.ACTIVITY_THROTTLE_MS) {
            lastThrottledActivity = now;
            localStorage.setItem(KEYS.LAST_ACTIVITY, now.toString());
        }
    }

    function setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(function (eventName) {
            global.addEventListener(eventName, recordUserActivity, { passive: true });
        });
    }

    // --- Timeout Verifications ---
    function checkTimeouts() {
        if (isExemptPage() || isTerminating) return;

        const sessionStart = parseInt(localStorage.getItem(KEYS.SESSION_START), 10);
        const lastActivity = parseInt(localStorage.getItem(KEYS.LAST_ACTIVITY), 10);
        const now = Date.now();

        // 1. Check Absolute Timeout (5 Hours)
        if (sessionStart && !isNaN(sessionStart)) {
            const sessionElapsed = now - sessionStart;
            if (sessionElapsed >= CONFIG.ABSOLUTE_TIMEOUT_MS) {
                console.warn('[MentraSessionGuard] Absolute session timeout (5 hrs) exceeded.');
                terminateSession('session_expired');
                return;
            }
        }

        // 2. Check Inactivity / Idle Timeout (2 Hours)
        if (lastActivity && !isNaN(lastActivity)) {
            const idleElapsed = now - lastActivity;
            if (idleElapsed >= CONFIG.IDLE_TIMEOUT_MS) {
                console.warn('[MentraSessionGuard] Inactivity timeout (2 hrs) exceeded.');
                terminateSession('idle_timeout');
                return;
            }
        }
    }

    // --- Browser / Tab Close Handshake (Multi-Tab Aware) ---
    async function verifySessionAlive() {
        if (isExemptPage()) return;

        // If sessionStorage has the session flag, this tab is alive and healthy
        if (sessionStorage.getItem(KEYS.SESSION_ALIVE) === '1') {
            return;
        }

        // If localStorage has NO session start, the user was never logged in
        const storedStart = localStorage.getItem(KEYS.SESSION_START);
        if (!storedStart) {
            // Unauthenticated state -> let regular page auth redirect to login
            return;
        }

        // Stored start exists, but this tab has no sessionStorage.
        // Did the user just open a new tab while another tab is active? Or reopen browser after closing?
        // Ask other tabs via BroadcastChannel
        if (broadcastChannel) {
            const hasOtherActiveTab = await new Promise(function (resolve) {
                let resolved = false;

                function onMessage(event) {
                    if (event && event.data && event.data.type === 'PONG_SESSION' && event.data.targetTabId === TAB_ID) {
                        resolved = true;
                        broadcastChannel.removeEventListener('message', onMessage);
                        resolve(true);
                    }
                }

                broadcastChannel.addEventListener('message', onMessage);
                broadcastChannel.postMessage({ type: 'PING_SESSION', tabId: TAB_ID });

                setTimeout(function () {
                    if (!resolved) {
                        broadcastChannel.removeEventListener('message', onMessage);
                        resolve(false);
                    }
                }, CONFIG.HANDSHAKE_TIMEOUT_MS);
            });

            if (hasOtherActiveTab) {
                // Another tab is actively open! Inherit session state.
                sessionStorage.setItem(KEYS.SESSION_ALIVE, '1');
                return;
            }
        }

        // No other tab responded -> The user closed all previous tabs / closed browser!
        console.warn('[MentraSessionGuard] No active tabs found. Session ended upon browser/tab close.');
        terminateSession('browser_closed');
    }

    // --- Public API ---
    const MentraSessionGuard = {
        CONFIG: CONFIG,
        KEYS: KEYS,
        startSession: startSession,
        clearSessionData: clearSessionData,
        logout: function (reason) {
            terminateSession(reason || 'logged_out');
        },
        checkNow: checkTimeouts,
        getLoginUrl: getLoginUrl,
        // Simulation helper for QA / Developer testing
        simulateTimeout: function (reason) {
            terminateSession(reason || 'session_expired');
        }
    };

    global.MentraSessionGuard = MentraSessionGuard;

    // --- Initialization ---
    initBroadcastChannel();

    if (!isExemptPage()) {
        setupActivityListeners();

        // 1. Initial Handshake & Timeout Check
        verifySessionAlive().then(function () {
            checkTimeouts();
        });

        // 2. Periodic background verification
        setInterval(checkTimeouts, CONFIG.CHECK_INTERVAL_MS);

        // 3. Instant verification when user wakes computer or switches tabs
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                checkTimeouts();
            }
        });

        global.addEventListener('focus', function () {
            checkTimeouts();
        });

        global.addEventListener('pageshow', function () {
            checkTimeouts();
        });
    }

})(typeof window !== 'undefined' ? window : this);
