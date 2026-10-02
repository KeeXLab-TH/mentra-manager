/**
 * ==============================================================================
 * MENTRA MANAGER — ENTERPRISE SESSION SECURITY GUARD
 * assets/js/session-guard.js
 * 
 * ระบบความปลอดภัยและการจัดการเซสชันระดับองค์กร:
 * 1. Absolute Timeout (12 ชั่วโมง): ครอบคลุมการทำงานตลอดวัน (พร้อม Sliding Session สำหรับผู้ใช้งานต่อเนื่อง)
 * 2. Inactivity / Idle Timeout (6 ชั่วโมง): ออกจากระบบเมื่อไม่มีการขยับ/ใช้งานเกิน 6 ชม. (ปลอดภัยเมื่อพักเที่ยง/ประชุม)
 * 3. Multi-Tab Session Inheritance: ถ่ายทอดเซสชันข้ามแท็บอัตโนมัติ ไม่เด้งหลุดเมื่อเปิดดูเอกสารหรือแท็บใหม่
 * 4. Multi-Tab Synchronization: ซิงค์สถานะล็อกเอาต์ข้ามทุกแท็บด้วย BroadcastChannel เมื่อกดออกจากระบบ
 * 5. Instant Wakeup Check: ตรวจสอบความถูกต้องเมื่อเปิดแท็บกลับมา (focus / visibilitychange)
 * 6. Clean URL Redirects: แจ้งเตือนข้อความภาษาไทยที่ชัดเจนเมื่อเซสชันหมดอายุ
 * ==============================================================================
 */

(function (global) {
    'use strict';

    // Prevent duplicate initialization
    if (global.MentraSessionGuard) return;

    // --- Configuration & Storage Keys ---
    const CONFIG = Object.assign({
        ABSOLUTE_TIMEOUT_MS: 12 * 60 * 60 * 1000, // 12 Hours (covers full workday)
        IDLE_TIMEOUT_MS: 6 * 60 * 60 * 1000,      // 6 Hours (safe idle window for meetings/lunch)
        CHECK_INTERVAL_MS: 30 * 1000,             // Check every 30s
        ACTIVITY_THROTTLE_MS: 30 * 1000,          // Throttle activity writes to 30s
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

    // --- Activity Tracking (Throttled & Sliding Session) ---
    function recordUserActivity() {
        const now = Date.now();
        if (now - lastThrottledActivity > CONFIG.ACTIVITY_THROTTLE_MS) {
            lastThrottledActivity = now;
            localStorage.setItem(KEYS.LAST_ACTIVITY, now.toString());
            sessionStorage.setItem(KEYS.SESSION_ALIVE, '1');

            // Sliding session: If user is actively working, keep session active
            // so active data entry / document viewing is never cut short
            const sessionStart = parseInt(localStorage.getItem(KEYS.SESSION_START) || '0', 10);
            if (!sessionStart || isNaN(sessionStart)) {
                localStorage.setItem(KEYS.SESSION_START, now.toString());
            } else if (now - sessionStart > 8 * 60 * 60 * 1000) {
                // If user has been working continuously past 8 hours, advance start to now - 4 hours
                localStorage.setItem(KEYS.SESSION_START, (now - 4 * 60 * 60 * 1000).toString());
            }
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

        // 1. Check Absolute Timeout (12 Hours)
        if (sessionStart && !isNaN(sessionStart)) {
            const sessionElapsed = now - sessionStart;
            if (sessionElapsed >= CONFIG.ABSOLUTE_TIMEOUT_MS) {
                console.warn('[MentraSessionGuard] Absolute session timeout exceeded.');
                terminateSession('session_expired');
                return;
            }
        }

        // 2. Check Inactivity / Idle Timeout (6 Hours)
        if (lastActivity && !isNaN(lastActivity)) {
            const idleElapsed = now - lastActivity;
            if (idleElapsed >= CONFIG.IDLE_TIMEOUT_MS) {
                console.warn('[MentraSessionGuard] Inactivity timeout exceeded.');
                terminateSession('idle_timeout');
                return;
            }
        }
    }

    // --- Tab Session Inheritance & Verification ---
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

        const sessionStart = parseInt(storedStart, 10);
        const lastActivity = parseInt(localStorage.getItem(KEYS.LAST_ACTIVITY) || storedStart, 10);
        const now = Date.now();

        // Check if session has genuinely expired
        const isAbsoluteExpired = sessionStart && (now - sessionStart >= CONFIG.ABSOLUTE_TIMEOUT_MS);
        const isIdleExpired = lastActivity && (now - lastActivity >= CONFIG.IDLE_TIMEOUT_MS);

        if (isAbsoluteExpired) {
            console.warn('[MentraSessionGuard] Absolute session timeout exceeded.');
            terminateSession('session_expired');
            return;
        }

        if (isIdleExpired) {
            console.warn('[MentraSessionGuard] Inactivity timeout exceeded.');
            terminateSession('idle_timeout');
            return;
        }

        // Valid active session on this device! Inherit session state into this tab seamlessly
        sessionStorage.setItem(KEYS.SESSION_ALIVE, '1');
        localStorage.setItem(KEYS.LAST_ACTIVITY, now.toString());
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
