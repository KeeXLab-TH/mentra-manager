/**
 * ==============================================================================
 * ERP SMART INITIAL R1 — CORE MULTI-TENANT & BRANDING ENGINE
 * assets/js/erp-core.js
 *
 * ระบบสถาปัตยกรรมแกนกลาง (Core Platform Engine):
 * 1. Base Platform Engine: "ERP SMART INITIAL R1"
 * 2. White-Labeling System: รองรับการตั้งชื่อระบบอิสระตามแต่ละบริษัท (Company Custom System Name)
 * 3. 0ms Instant Cache: แคชการตั้งค่าใน localStorage โหลดได้ทันที ไม่กระพริบ
 * 4. Multi-Tab Real-time Synchronization: ซิงค์ชื่อระบบและโลโก้ข้ามทุกแท็บทันทีด้วย BroadcastChannel
 * 5. Automatic DOM Injection: อัปเดต <title>, Sidebar, Header, Breadcrumbs แบบอัตโนมัติ
 * ==============================================================================
 */

(function (global) {
    'use strict';

    if (global.ERPCore) return;

    const PLATFORM_DEFAULT_NAME = 'ERP SMART INITIAL R1';
    const PLATFORM_DEFAULT_TAGLINE = 'ระบบบริหารจัดการธุรกิจและโครงการระดับองค์กร (Next-Gen Multi-Tenant ERP)';
    const BRANDING_STORAGE_KEY = 'erp_system_branding';
    const CHANNEL_NAME = 'erp_system_branding_channel';

    let broadcastChannel = null;
    try {
        if ('BroadcastChannel' in global) {
            broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
            broadcastChannel.onmessage = function (event) {
                if (event && event.data && event.data.type === 'BRANDING_UPDATED') {
                    applyBrandingToDOM();
                }
            };
        }
    } catch (e) {
        console.warn('[ERPCore] BroadcastChannel unavailable:', e);
    }

    /**
     * ดึงข้อมูลการตั้งค่าแบรนด์ระบบปัจจุบัน
     */
    function getBranding() {
        let branding = null;
        try {
            const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
            if (raw) branding = JSON.parse(raw);
        } catch (e) {
            console.error('[ERPCore] Failed to parse branding:', e);
        }

        // หากยังไม่มีการตั้งค่าไว้เฉพาะ ให้ตรวจสอบว่าบริษัทปัจจุบันคืออะไร
        let activeWs = null;
        try {
            const activeWsName = localStorage.getItem('mentra_active_workspace') || 'Mentra Solution';
            const rawWs = localStorage.getItem('mentra_managed_workspaces');
            if (rawWs) {
                const wsList = JSON.parse(rawWs);
                if (Array.isArray(wsList)) {
                    activeWs = wsList.find(w => w.name === activeWsName) || wsList[0];
                }
            }
        } catch (e) {}

        if (!branding) {
            // Default สำหรับระบบเดิม Mentra Solution
            const isMentra = !activeWs || activeWs.name === 'Mentra Solution' || activeWs.isDefault;
            branding = {
                platformName: PLATFORM_DEFAULT_NAME,
                // หากเป็นบริษัทเดิม Mentra Solution ให้คงชื่อ Mentra Manager ไว้เพื่อความต่อเนื่อง
                systemTitle: isMentra ? 'Mentra Manager' : PLATFORM_DEFAULT_NAME,
                systemSubtitle: isMentra ? 'ระบบบริหารจัดการธุรกิจและโครงการ' : PLATFORM_DEFAULT_TAGLINE,
                systemLogo: isMentra ? '../../assets/img/logo.png' : '',
                companyName: activeWs ? activeWs.name : 'Mentra Solution',
                companyTaxId: activeWs ? (activeWs.taxId || '') : '',
                primaryAdmin: activeWs ? (activeWs.primaryAdmin || 'Admin') : 'Admin',
                isCustomized: false
            };
        } else {
            branding.platformName = PLATFORM_DEFAULT_NAME;
            if (!branding.systemTitle || branding.systemTitle.trim() === '') {
                branding.systemTitle = PLATFORM_DEFAULT_NAME;
            }
        }

        return branding;
    }

    /**
     * บันทึกการตั้งค่าแบรนด์ระบบโดย Admin ของบริษัท
     */
    function setBranding(newConfig, triggerSync = true) {
        if (!newConfig || typeof newConfig !== 'object') return false;

        const current = getBranding();
        const merged = Object.assign({}, current, newConfig, {
            platformName: PLATFORM_DEFAULT_NAME,
            updatedAt: new Date().toISOString(),
            isCustomized: true
        });

        try {
            localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(merged));

            // Sync เข้ากับ Workspace ที่ Active อยู่ด้วย
            const activeWsName = localStorage.getItem('mentra_active_workspace') || merged.companyName;
            const rawWs = localStorage.getItem('mentra_managed_workspaces');
            if (rawWs) {
                let wsList = JSON.parse(rawWs);
                if (Array.isArray(wsList)) {
                    wsList = wsList.map(w => {
                        if (w.name === activeWsName || w.name === merged.companyName) {
                            return Object.assign({}, w, {
                                systemTitle: merged.systemTitle,
                                systemSubtitle: merged.systemSubtitle,
                                logo: merged.systemLogo || w.logo
                            });
                        }
                        return w;
                    });
                    localStorage.setItem('mentra_managed_workspaces', JSON.stringify(wsList));
                }
            }
        } catch (e) {
            console.error('[ERPCore] Save branding error:', e);
            return false;
        }

        // นำการเปลี่ยนแปลงไปใช้ใน DOM ทันที
        applyBrandingToDOM();

        // แจ้งเตือนแท็บอื่นผ่าน BroadcastChannel
        if (triggerSync && broadcastChannel) {
            try {
                broadcastChannel.postMessage({
                    type: 'BRANDING_UPDATED',
                    branding: merged,
                    timestamp: Date.now()
                });
            } catch (e) {}
        }

        // ยิง CustomEvent ในหน้าปัจจุบัน
        try {
            global.dispatchEvent(new CustomEvent('erp:branding-changed', { detail: merged }));
        } catch (e) {}

        return true;
    }

    /**
     * นำชื่อระบบ โลโก้ และแบรนด์ ไปอัปเดตลงในหน้าเว็บอัตโนมัติ
     */
    function applyBrandingToDOM() {
        const branding = getBranding();
        const titleName = branding.systemTitle || PLATFORM_DEFAULT_NAME;

        // 1. ปรับ document.title
        try {
            const currentTitle = document.title || '';
            if (currentTitle) {
                if (currentTitle.includes('— Mentra Manager')) {
                    document.title = currentTitle.replace('— Mentra Manager', `— ${titleName}`);
                } else if (currentTitle.includes('— ERP SMART INITIAL R1')) {
                    document.title = currentTitle.replace('— ERP SMART INITIAL R1', `— ${titleName}`);
                } else if (currentTitle.includes('Mentra Manager')) {
                    document.title = currentTitle.replace(/Mentra Manager/g, titleName);
                } else if (!currentTitle.includes(titleName)) {
                    // หากไม่มี ให้เพิ่มต่อท้ายถ้ามีขีด
                    if (currentTitle.includes('—')) {
                        const parts = currentTitle.split('—');
                        document.title = `${parts[0].trim()} — ${titleName}`;
                    }
                }
            }
        } catch (e) {}

        // 2. อัปเดต Tooltip และชื่อของ Rail Logo
        const railLogos = document.querySelectorAll('.rail-logo-wrap');
        railLogos.forEach(wrap => {
            wrap.setAttribute('title', `${titleName} (${PLATFORM_DEFAULT_NAME})`);
            const img = wrap.querySelector('.rail-logo-img');
            if (img && branding.systemLogo && branding.systemLogo.trim() !== '') {
                img.src = branding.systemLogo;
            }
        });

        // 3. อัปเดต Breadcrumb Sub / System Tagline
        const breadcrumbSubs = document.querySelectorAll('.breadcrumb-sub');
        breadcrumbSubs.forEach(el => {
            if (el.textContent && el.textContent.includes('Mentra Manager')) {
                el.textContent = el.textContent.replace(/Mentra Manager/g, titleName);
            }
        });

        // 4. อัปเดต Element ที่ผูก Class พิเศษไว้
        document.querySelectorAll('.erp-system-title').forEach(el => {
            el.textContent = titleName;
        });

        document.querySelectorAll('.erp-system-subtitle').forEach(el => {
            el.textContent = branding.systemSubtitle || PLATFORM_DEFAULT_TAGLINE;
        });

        document.querySelectorAll('.erp-platform-name').forEach(el => {
            el.textContent = PLATFORM_DEFAULT_NAME;
        });

        document.querySelectorAll('.erp-company-name').forEach(el => {
            if (branding.companyName) el.textContent = branding.companyName;
        });
    }

    // Auto Apply เมื่อ DOM โหลดเสร็จ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyBrandingToDOM);
    } else {
        applyBrandingToDOM();
    }

    // Export API
    global.ERPCore = {
        PLATFORM_DEFAULT_NAME,
        PLATFORM_DEFAULT_TAGLINE,
        getBranding,
        setBranding,
        applyBrandingToDOM
    };

})(typeof window !== 'undefined' ? window : this);
