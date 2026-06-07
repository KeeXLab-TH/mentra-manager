/* ================================================================
   MENTRA MANAGER — PREMIUM UI INTERACTION LAYER
   app-ui.js

   Vanilla JavaScript (ES6+) — UI enhancements only.
   ไม่ยุ่งกับ Business Logic ใดๆ ทั้งสิ้น

   Features:
   ✦ Ripple Effect on buttons (Material-style)
   ✦ Dark / Light Mode toggle + persistence
   ✦ Loading state management (.is-loading)
   ✦ Enhanced Toast Notifications (replaces alert())
   ✦ Scroll-based topbar enhancement
   ✦ Keyboard shortcuts (Ctrl+D = Dark Mode)
   ================================================================ */

(function MentraUI() {
    'use strict';

    /* ────────────────────────────────────────────
       I. RIPPLE EFFECT
       ──────────────────────────────────────────── */
    function createRipple(e) {
        const btn = e.currentTarget;
        if (btn.disabled || btn.classList.contains('is-loading')) return;

        // Remove previous ripples
        const existing = btn.querySelectorAll('.ripple-effect');
        existing.forEach(el => {
            if (el.dataset.removing) return;
            el.dataset.removing = '1';
            el.remove();
        });

        const rect = btn.getBoundingClientRect();
        const diameter = Math.max(rect.width, rect.height) * 2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${e.clientX - rect.left - diameter / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - diameter / 2}px`;

        btn.appendChild(ripple);

        // Auto-cleanup
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    function initRipple() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .btn-primary, .btn-orange, .btn-outline, .btn-danger, .btn-sm, .nav-item, button[class*="btn"]');
            if (btn && !btn.classList.contains('collapse-btn') && !btn.classList.contains('hamburger') && !btn.classList.contains('modal-close')) {
                createRipple({ currentTarget: btn, clientX: e.clientX, clientY: e.clientY });
            }
        });
    }


    /* ────────────────────────────────────────────
       II. DARK / LIGHT MODE TOGGLE
       ──────────────────────────────────────────── */
    


    /* ────────────────────────────────────────────
       III. LOADING STATE MANAGER
       ──────────────────────────────────────────── */
    /**
     * Usage (from existing code):
     *   MentraUI.setLoading(buttonEl, true)    → adds .is-loading
     *   MentraUI.setLoading(buttonEl, false)   → removes .is-loading
     */
    function setLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.classList.add('is-loading');
            btn.dataset.originalText = btn.textContent;
            btn.disabled = true;
        } else {
            btn.classList.remove('is-loading');
            btn.disabled = false;
        }
    }

    // Auto-attach to forms: on submit, set the submit button to loading
    function initAutoLoading() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"], .btn-primary');
            if (submitBtn && !submitBtn.classList.contains('is-loading')) {
                setLoading(submitBtn, true);
                // Safety timeout: auto-release after 15s
                setTimeout(() => setLoading(submitBtn, false), 15000);
            }
        }, true);
    }


    /* ────────────────────────────────────────────
       IV. ENHANCED TOAST NOTIFICATION SYSTEM
       ──────────────────────────────────────────── */
    /**
     * Drop-in replacement for window.alert()
     * Usage: MentraUI.toast('สำเร็จ!', 'success')
     *        MentraUI.toast('เกิดข้อผิดพลาด', 'error')
     * Types: 'success' | 'error' | 'warning' | 'info'
     */
    const TOAST_ICONS = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    const TOAST_TITLES = {
        success: 'สำเร็จ',
        error: 'เกิดข้อผิดพลาด',
        warning: 'คำเตือน',
        info: 'ข้อมูล'
    };

    function ensureToastContainer() {
        let container = document.getElementById('mentraToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mentraToastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                max-width: 380px;
                width: 100%;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type = 'success', duration = 4000) {
        const container = ensureToastContainer();
        const item = document.createElement('div');
        item.className = `toast-item ${type}`;
        item.style.pointerEvents = 'all';
        item.innerHTML = `
            <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ️'}</span>
            <div class="toast-body">
                <div class="toast-title">${TOAST_TITLES[type] || 'แจ้งเตือน'}</div>
                <div class="toast-msg">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">✕</button>
            <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
        `;

        container.appendChild(item);

        // Trigger enter animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                item.classList.add('show');
            });
        });

        // Close button
        const closeBtn = item.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => dismissToast(item));

        // Auto-dismiss
        const timer = setTimeout(() => dismissToast(item), duration);
        item.dataset.timer = timer;

        return item;
    }

    function dismissToast(item) {
        if (item.dataset.dismissed) return;
        item.dataset.dismissed = '1';
        clearTimeout(Number(item.dataset.timer));
        item.classList.remove('show');
        item.classList.add('hiding');
        item.addEventListener('transitionend', () => item.remove(), { once: true });
        // Fallback removal
        setTimeout(() => item.remove(), 500);
    }


    /* ────────────────────────────────────────────
       V. TOPBAR SCROLL SHADOW
       ──────────────────────────────────────────── */
    function initTopbarScroll() {
        const contentArea = document.querySelector('.content-area, .workspace');
        const topbar = document.querySelector('.topbar');
        if (!contentArea || !topbar) return;

        let ticking = false;
        contentArea.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (contentArea.scrollTop > 10) {
                        topbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
                    } else {
                        topbar.style.boxShadow = '0 1px 12px rgba(0,0,0,0.05)';
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }


    /* ────────────────────────────────────────────
       VI. KEYBOARD SHORTCUTS
       ──────────────────────────────────────────── */
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + D → Toggle Dark Mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                toggleTheme();
                showToast(
                    document.documentElement.getAttribute('data-theme') === 'dark'
                        ? 'เปลี่ยนเป็น Dark Mode แล้ว'
                        : 'เปลี่ยนเป็น Light Mode แล้ว',
                    'info',
                    2000
                );
            }
        });
    }


    /* ────────────────────────────────────────────
       VII. FOCUS MANAGEMENT
       ──────────────────────────────────────────── */
    function initFocusManagement() {
        // Add focus-visible polyfill behavior:
        // Differentiates keyboard vs mouse focus
        document.addEventListener('mousedown', () => {
            document.body.classList.add('using-mouse');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.remove('using-mouse');
            }
        });
    }


    /* ────────────────────────────────────────────
       VIII. STAGGERED ENTRANCE ANIMATION
       ──────────────────────────────────────────── */
    function initStaggeredEntrance() {
        // Animate stat cards on first view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    el.style.animationDelay = `${i * 0.06}s`;
                    el.classList.add('ui-animate-in');
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.15 });

        // Observe stat cards and section cards
        document.querySelectorAll('.stat-card, .section-card').forEach(el => {
            el.style.opacity = '0';
            observer.observe(el);
        });

        // Inject keyframe if not exists
        if (!document.getElementById('mentraUIAnimations')) {
            const style = document.createElement('style');
            style.id = 'mentraUIAnimations';
            style.textContent = `
                .ui-animate-in {
                    animation: uiFadeSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
                }
                @keyframes uiFadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(16px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Focus ring only on keyboard navigation */
                body.using-mouse *:focus {
                    outline: none !important;
                }

                /* Fix ripple effect expanding buttons */
                .ripple-effect {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(0);
                    animation: rippleAnim 0.6s linear;
                    pointer-events: none;
                }
                @keyframes rippleAnim {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                .nav-item, .btn {
                    overflow: hidden;
                    position: relative;
                }
            `;
            document.head.appendChild(style);
        }
    }




    /* ────────────────────────────────────────────
       VIII-B. PREMIUM MOBILE BOTTOM NAVIGATION
       ──────────────────────────────────────────── */

    // Nav item configs
    const MNAV_ITEMS_LEFT = [
        { icon: '🏠', label: 'หน้าหลัก', href: 'dashboard.html' },
        { icon: '📁', label: 'โครงการ',  href: 'dashboard.html?view=projects' },
    ];
    const MNAV_ITEMS_RIGHT = [
        { icon: '📄', label: 'ใบเสนอราคา', href: 'quotation.html' },
        { icon: '🎓', label: 'อบรม',        href: 'external_training.html' },
    ];
    const MNAV_SHEET_ITEMS = [
        { icon: '📦', label: 'ราคาทุน/สิ่งของ', href: 'dashboard.html?view=items' },
        { icon: '👥', label: 'จัดการผู้ใช้',    href: 'dashboard.html?tab=users' },
        { icon: '➕', label: 'โครงการใหม่',     href: 'dashboard.html?action=new-project' },
        { icon: '🛠️', label: 'Admin Console',   href: 'console_admin.html' },
    ];

    function isMobile() { return window.innerWidth <= 900; }

    function initMobileNav() {
        if (!isMobile()) return;
        if (document.getElementById('mnavBar')) return;

        const page   = location.pathname.split('/').pop() || 'index.html';
        const search = location.search;

        if (page === 'index.html' || page === '') return;

        // Removed to allow mobile nav to appear on dynamically loaded pages

        function isActive(href) {
            const parts = href.split('?');
            const hPage = parts[0]; const hQ = parts[1] ? '?' + parts[1] : '';
            if (!page.includes(hPage)) return false;
            if (hQ && !search.includes(parts[1])) return false;
            return true;
        }

        /* ══ Bottom Bar ══ */
        const bar = document.createElement('nav');
        bar.className = 'mnav-bar'; bar.id = 'mnavBar';
        bar.setAttribute('aria-label', 'เมนูหลัก');

        function makeNavItem(cfg) {
            const btn = document.createElement('button');
            btn.className = 'mnav-item' + (isActive(cfg.href) ? ' active' : '');
            btn.setAttribute('aria-label', cfg.label);
            btn.innerHTML = `<span class="mnav-icon-wrap"><span class="mnav-icon">${cfg.icon}</span><span class="mnav-dot"></span></span><span class="mnav-label">${cfg.label}</span>`;
            btn.addEventListener('click', (e) => {
                addMnavRipple(e, btn);
                setTimeout(() => { window.location.href = cfg.href; }, 160);
            });
            return btn;
        }

        MNAV_ITEMS_LEFT.forEach(c => bar.appendChild(makeNavItem(c)));
        const fabSpacer = document.createElement('div');
        fabSpacer.className = 'mnav-item mnav-fab-spacer';
        bar.appendChild(fabSpacer);
        MNAV_ITEMS_RIGHT.forEach(c => bar.appendChild(makeNavItem(c)));
        document.body.appendChild(bar);

        /* ══ FAB ══ */
        const fab = document.createElement('button');
        fab.className = 'mnav-fab'; fab.id = 'mnavFab';
        fab.setAttribute('aria-label', 'เมนูเพิ่มเติม');
        fab.innerHTML = '<div class="mnav-fab-icon-wrap"><img src="logo.png" alt="Logo" class="mnav-fab-logo"><span class="mnav-fab-close">✕</span></div>';
        document.body.appendChild(fab);

        /* ══ Sheet Overlay ══ */
        const sheetOverlay = document.createElement('div');
        sheetOverlay.className = 'mnav-sheet-overlay'; sheetOverlay.id = 'mnavSheetOverlay';
        document.body.appendChild(sheetOverlay);

        /* ══ Slide-up Sheet ══ */
        const sheet = document.createElement('div');
        sheet.className = 'mnav-sheet'; sheet.id = 'mnavSheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');

        sheet.innerHTML = '<div class="mnav-sheet-handle" aria-hidden="true"></div>';

        // User card
        const userCard = document.createElement('div');
        userCard.className = 'mnav-sheet-user'; userCard.id = 'mnavSheetUser';
        userCard.innerHTML = `
            <div class="mnav-sheet-avatar" id="mnavSheetAvatar">M</div>
            <div><div class="mnav-sheet-user-name" id="mnavSheetName">กำลังโหลด...</div>
            <div class="mnav-sheet-user-role" id="mnavSheetRole">—</div></div>`;
        sheet.appendChild(userCard);

        // Section title
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'mnav-sheet-section-title';
        sectionTitle.textContent = 'เมนูทั้งหมด';
        sheet.appendChild(sectionTitle);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'mnav-sheet-grid';
        MNAV_SHEET_ITEMS.forEach((cfg, i) => {
            const card = document.createElement('button');
            card.className = 'mnav-sheet-card';
            card.style.animationDelay = `${0.13 + i * 0.045}s`;
            card.innerHTML = `<div class="mnav-sheet-card-icon">${cfg.icon}</div><div class="mnav-sheet-card-label">${cfg.label}</div>`;
            card.addEventListener('click', () => { closeSheet(); setTimeout(() => { window.location.href = cfg.href; }, 220); });
            grid.appendChild(card);
        });
        sheet.appendChild(grid);

        // Logout
        const logoutRow = document.createElement('button');
        logoutRow.className = 'mnav-sheet-logout';
        logoutRow.innerHTML = '🚪 &nbsp;ออกจากระบบ';
        logoutRow.addEventListener('click', () => {
            closeSheet();
            setTimeout(() => {
                const orig = document.querySelector('.btn-logout');
                if (orig) orig.click();
                else if (typeof handleLogout === 'function') handleLogout();
                else window.location.href = 'index.html';
            }, 200);
        });
        sheet.appendChild(logoutRow);
        document.body.appendChild(sheet);

        /* ══ Open / Close ══ */
        function openSheet() {
            fab.classList.add('open');
            sheetOverlay.classList.add('show');
            sheet.classList.add('show');
            document.body.style.overflow = 'hidden';
            syncUserInfo();
        }
        function closeSheet() {
            fab.classList.remove('open');
            sheetOverlay.classList.remove('show');
            sheet.classList.remove('show');
            document.body.style.overflow = '';
        }

        fab.addEventListener('click', () => sheet.classList.contains('show') ? closeSheet() : openSheet());
        sheetOverlay.addEventListener('click', closeSheet);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

        /* ══ Inject Topbar Elements (Avatar & Toggle) ══ */
        function injectTopbarDecorations() {
            const topbar = document.querySelector('.topbar');
            if (!topbar || topbar.querySelector('.topbar-m-left')) return;

            // Create Left Container with Avatar
            const leftDiv = document.createElement('div');
            leftDiv.className = 'topbar-m-left';
            leftDiv.innerHTML = `<div class="topbar-avatar" id="topbarMavatar">M</div>`;
            leftDiv.addEventListener('click', () => {
                openSheet();
            });

            // Create Right Container (Empty, as dark mode button is removed)
            const rightDiv = document.createElement('div');
            rightDiv.className = 'topbar-m-right';

            // Prepend Left and Append Right
            topbar.insertBefore(leftDiv, topbar.firstChild);
            topbar.appendChild(rightDiv);

            
        }

        /* ══ Live User Info Sync ══ */
        function syncUserInfo() {
            const nameEl   = document.getElementById('userName')        || document.querySelector('.user-name');
            const roleEl   = document.getElementById('userRoleBadge')   || document.querySelector('.role-badge');
            const avatarEl = document.getElementById('userAvatar')      || document.querySelector('.user-avatar');
            const nEl = document.getElementById('mnavSheetName');
            const rEl = document.getElementById('mnavSheetRole');
            const aEl = document.getElementById('mnavSheetAvatar');
            const topAvatar = document.getElementById('topbarMavatar');

            if (nEl && nameEl)   nEl.textContent = nameEl.textContent.trim()   || 'กำลังโหลด...';
            if (rEl && roleEl)   rEl.textContent = roleEl.textContent.trim()   || '—';
            if (aEl && avatarEl) aEl.textContent = avatarEl.textContent.trim() || 'M';
            
            // Sync topbar avatar character
            if (topAvatar && avatarEl) {
                topAvatar.textContent = avatarEl.textContent.trim().substring(0, 1) || 'M';
            }
        }

        injectTopbarDecorations();
        setInterval(syncUserInfo, 1500);
        setTimeout(syncUserInfo, 600);
    }

    /* ── Ripple helper for nav items ── */
    function addMnavRipple(e, el) {
        const r = document.createElement('span');
        r.className = 'mnav-ripple';
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        r.style.width = r.style.height = `${size}px`;
        r.style.left  = `${e.clientX - rect.left - size / 2}px`;
        r.style.top   = `${e.clientY - rect.top  - size / 2}px`;
        el.appendChild(r);
        r.addEventListener('animationend', () => r.remove(), { once: true });
    }




    /* ────────────────────────────────────────────
       IX. INITIALIZATION
       ──────────────────────────────────────────── */
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    }

    function boot() {
        initRipple();
        initAutoLoading();
        initTopbarScroll();
        initKeyboardShortcuts();
        initFocusManagement();
        initMobileNav();
        initResponsiveTables();
        initSmoothTransitions();

        // Delayed entrance animations (after page settles)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initStaggeredEntrance();
            });
        });

        // Expose API on window for existing code to call
        window.MentraUI = {
            toast: showToast,
            setLoading
        };

        console.log('%c✦ Mentra UI Layer loaded', 'color: #1A6FBF; font-weight: bold; font-size: 12px;');
    }

    
    /* ==========================================
       SMOOTH PAGE TRANSITIONS
       ========================================== */
    function initSmoothTransitions() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (href && href.endsWith('.html') && !href.startsWith('http') && link.target !== '_blank') {
                e.preventDefault();
                showGlobalPreloader();
                setTimeout(() => { window.location.href = href; }, 150);
            }
        });
        window.addEventListener('pageshow', () => hideGlobalPreloader());
    }

    function showGlobalPreloader() {
        let loader = document.getElementById('mentra-global-transition');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'mentra-global-transition';
            loader.innerHTML = '<div class="spinner"></div>';
            Object.assign(loader.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                zIndex: '999999', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: '0', transition: 'opacity 0.15s ease'
            });
            const spinnerStyle = document.createElement('style');
            spinnerStyle.textContent = '#mentra-global-transition .spinner { width: 40px; height: 40px; border: 4px solid var(--primary-glow, rgba(26,111,191,0.2)); border-top-color: var(--primary, #1A6FBF); border-radius: 50%; animation: mentra-spin 0.8s linear infinite; } @keyframes mentra-spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(spinnerStyle);
            document.body.appendChild(loader);
        }
        loader.style.pointerEvents = 'all';
        requestAnimationFrame(() => loader.style.opacity = '1');
    }

    function hideGlobalPreloader() {
        const loader = document.getElementById('mentra-global-transition');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
        }
    }

    
    /* ==========================================
       RESPONSIVE MOBILE TABLES
       ========================================== */
    
        function applyDataLabels(table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index] && !cell.hasAttribute('data-label')) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    }

    function initResponsiveTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            // Apply initially
            applyDataLabels(table);
            
            // Watch for dynamic data loads
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const observer = new MutationObserver(() => applyDataLabels(table));
                observer.observe(tbody, { childList: true, subtree: true });
            }
        });
    }
    init();
})();
