/**
 * Mentra Manager - Telegram Notification Service
 * Handles Telegram Bot alerts for Quotations and System Events.
 * Settings are configured in Admin Console and stored in Firestore (`system_settings/telegram_notification`).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TelegramService = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const STORAGE_KEY = 'mentra_telegram_config';
    const FIRESTORE_COLLECTION = 'system_settings';
    const FIRESTORE_DOC = 'telegram_notification';

    let lastSentCache = {
        key: '',
        timestamp: 0
    };

    /**
     * Get default settings structure
     */
    function getDefaultConfig() {
        return {
            enabled: false,
            botToken: '',
            chatId: '',
            notifyOnQuotation: true,
            updatedAt: null,
            updatedBy: ''
        };
    }

    /**
     * Read config from LocalStorage cache
     */
    function getLocalConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...getDefaultConfig(), ...parsed };
            }
        } catch (e) {
            console.warn('[TelegramService] Error reading localStorage:', e);
        }
        return getDefaultConfig();
    }

    /**
     * Save config to LocalStorage cache
     */
    function setLocalConfig(config) {
        try {
            const safeConfig = { ...getDefaultConfig(), ...config };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
            return safeConfig;
        } catch (e) {
            console.warn('[TelegramService] Error saving to localStorage:', e);
            return config;
        }
    }

    /**
     * Fetch config from Firestore with fallback to LocalStorage
     * Supports both modular Firestore SDK and standard object
     */
    async function getRemoteConfig(db, firestoreHelpers = {}) {
        let config = getLocalConfig();
        if (!db) return config;

        try {
            let docSnap = null;
            if (firestoreHelpers.getDoc && firestoreHelpers.doc) {
                // Modular SDK
                const docRef = firestoreHelpers.doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
                docSnap = await firestoreHelpers.getDoc(docRef);
            } else if (typeof db.collection === 'function') {
                // Compat SDK
                docSnap = await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
            }

            if (docSnap && (typeof docSnap.exists === 'function' ? docSnap.exists() : docSnap.exists)) {
                const remoteData = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
                config = setLocalConfig({ ...config, ...remoteData });
            }
        } catch (err) {
            console.warn('[TelegramService] Could not fetch remote config from Firestore, using local cache:', err);
        }

        return config;
    }

    /**
     * Save config to Firestore and LocalStorage
     */
    async function saveConfig(db, config, user = null, firestoreHelpers = {}) {
        const payload = {
            enabled: Boolean(config.enabled),
            botToken: (config.botToken || '').trim(),
            chatId: (config.chatId || '').trim(),
            notifyOnQuotation: config.notifyOnQuotation !== false,
            updatedAt: new Date().toISOString(),
            updatedBy: user ? (user.displayName || user.email || 'Admin') : 'Admin'
        };

        // Cache locally first for instant access
        setLocalConfig(payload);

        if (db) {
            try {
                if (firestoreHelpers.setDoc && firestoreHelpers.doc) {
                    const docRef = firestoreHelpers.doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
                    await firestoreHelpers.setDoc(docRef, payload, { merge: true });
                } else if (typeof db.collection === 'function') {
                    await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).set(payload, { merge: true });
                }
            } catch (err) {
                console.error('[TelegramService] Failed to save config to Firestore:', err);
                throw err;
            }
        }

        return payload;
    }

    /**
     * Low-level method to send a message via Telegram Bot API
     * Telegram allows direct client-side fetch from browsers (CORS enabled)
     */
    async function sendMessage(botToken, chatId, text, options = {}) {
        const token = (botToken || '').trim();
        const chat = (chatId || '').trim();

        if (!token) {
            return { success: false, error: 'ยังไม่ได้ระบุ Telegram Bot Token' };
        }
        if (!chat) {
            return { success: false, error: 'ยังไม่ได้ระบุ Telegram Chat ID' };
        }

        const parseMode = options.parseMode || 'HTML';
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chat,
                    text: text,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const json = await res.json();
            if (res.ok && json.ok) {
                return { success: true, result: json.result };
            } else {
                const errMsg = json.description || `HTTP ${res.status}: ${res.statusText}`;
                return { success: false, error: errMsg };
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                return { success: false, error: 'การเชื่อมต่อไปยัง Telegram หมดเวลา (Request Timeout 10s)' };
            }
            return { success: false, error: err.message || 'ไม่สามารถเชื่อมต่อกับ Telegram Bot API ได้' };
        }
    }

    /**
     * Send a test message to verify Bot Token and Chat ID
     */
    async function testConnection(botToken, chatId) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('th-TH');

        const message = 
`🔔 <b>Mentra Manager - ทดสอบการเชื่อมต่อ Telegram สำเร็จ!</b>
━━━━━━━━━━━━━━━━━━
✅ <b>สถานะ:</b> ระบบเชื่อมต่อกับ Telegram Bot เรียบร้อยแล้ว
📅 <b>วันที่:</b> ${dateStr}
⏰ <b>เวลา:</b> ${timeStr}
📌 <b>บริการ:</b> พร้อมส่งการแจ้งเตือนเมื่อมีการออกใบเสนอราคา (Quotation)
━━━━━━━━━━━━━━━━━━
<i>Mentra Manager Cloud Executive System</i>`;

        return await sendMessage(botToken, chatId, message);
    }

    /**
     * Escape special HTML characters for Telegram HTML parse mode
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Send Quotation Issued alert
     * Automatically reads config from local cache or Firestore
     */
    async function sendQuotationAlert(quotationData, db = null, firestoreHelpers = {}) {
        try {
            // 1. Get current config
            let config = getLocalConfig();
            if (!config.botToken && db) {
                config = await getRemoteConfig(db, firestoreHelpers);
            }

            // 2. Check if active and configured
            if (!config.enabled) {
                return { skipped: true, reason: 'Telegram notification is disabled in Admin Console' };
            }
            if (!config.notifyOnQuotation) {
                return { skipped: true, reason: 'Quotation notifications are disabled in settings' };
            }
            if (!config.botToken || !config.chatId) {
                return { skipped: true, reason: 'Bot Token or Chat ID is not configured' };
            }

            // 3. Debounce duplicates (same refNo within 10 seconds)
            const refNo = quotationData.refNo || 'QT-DRAFT';
            const now = Date.now();
            if (lastSentCache.key === refNo && (now - lastSentCache.timestamp) < 10000) {
                console.log('[TelegramService] Skipped duplicate alert for:', refNo);
                return { skipped: true, reason: 'Duplicate alert within 10s cooldown' };
            }

            // 4. Format clean message
            const toCompany = escapeHtml(quotationData.toCompany || quotationData.customerName || '-');
            const issuer = escapeHtml(quotationData.issuer || quotationData.sellerCompany || 'Mentra Manager');
            const grandTotal = quotationData.grandTotal ? String(quotationData.grandTotal).trim() : '0.00';
            const itemsCount = quotationData.itemsCount || (Array.isArray(quotationData.items) ? quotationData.items.length : 0);
            const userDisplayName = escapeHtml(quotationData.signer || quotationData.userName || quotationData.createdBy || 'ผู้ดูแลระบบ');
            
            const docDate = quotationData.docDate || new Date().toLocaleDateString('th-TH');
            const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            const message = 
`📄 <b>แจ้งเตือนการออกใบเสนอราคา (Quotation)</b>
━━━━━━━━━━━━━━━━━━
🔢 <b>เลขที่:</b> <code>${escapeHtml(refNo)}</code>
🏢 <b>ลูกค้า:</b> <b>${toCompany}</b>
🏷 <b>ผู้เสนอราคา:</b> ${issuer}
💰 <b>ยอดรวมสุทธิ:</b> <b>${escapeHtml(grandTotal)} บาท</b>
📦 <b>จำนวนรายการ:</b> ${itemsCount} รายการ
👤 <b>ผู้ออกเอกสาร:</b> ${userDisplayName}
📅 <b>วันที่:</b> ${escapeHtml(docDate)} (${timeStr} น.)
━━━━━━━━━━━━━━━━━━
<i>ส่งจากระบบ Mentra Manager Cloud</i>`;

            // 5. Send message
            const result = await sendMessage(config.botToken, config.chatId, message);
            if (result.success) {
                lastSentCache = { key: refNo, timestamp: now };
                console.log('[TelegramService] Quotation notification sent successfully:', refNo);
            } else {
                console.warn('[TelegramService] Quotation notification failed:', result.error);
            }
            return result;
        } catch (err) {
            console.error('[TelegramService] Unexpected error sending quotation alert:', err);
            return { success: false, error: err.message };
        }
    }

    return {
        STORAGE_KEY,
        FIRESTORE_COLLECTION,
        FIRESTORE_DOC,
        getDefaultConfig,
        getLocalConfig,
        setLocalConfig,
        getRemoteConfig,
        saveConfig,
        sendMessage,
        testConnection,
        sendQuotationAlert,
        escapeHtml
    };
}));
