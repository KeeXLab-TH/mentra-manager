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
            btn.dataset.page = cfg.href.split('?')[0]; // Tag page for permission hide
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
            card.dataset.page = cfg.href.split('?')[0]; // Tag page for permission hide
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

/* ────────────────────────────────────────────
   IV-B. DYNAMIC USER PROFILE DROPDOWN
   ──────────────────────────────────────────── */
function initAccountDropdown(userData) {
    const topbarRight = document.querySelector('.topbar-right-menu');
    if (!topbarRight) return;

    // Avoid duplicate initialization
    if (document.querySelector('.user-dropdown-wrapper')) return;

    const sidebarUser = topbarRight.querySelector('.sidebar-user');
    if (!sidebarUser) return;

    const userCard = sidebarUser.querySelector('.user-card');
    const oldLogoutBtn = sidebarUser.querySelector('.btn-logout');
    const oldAdminMenu = topbarRight.querySelector('#adminMenu');

    if (!userCard) return;

    // Sync profile details to the DOM user card dynamically
    const nameEl = userCard.querySelector('.user-name') || document.getElementById('userName');
    const avatarEl = userCard.querySelector('.user-avatar') || document.getElementById('userAvatar');
    const badgeEl = userCard.querySelector('.role-badge') || document.getElementById('userRoleBadge');

    if (nameEl && userData.name) {
        nameEl.textContent = userData.name;
    }
    if (avatarEl && userData.name) {
        avatarEl.textContent = userData.name.substring(0, 1).toUpperCase();
    }
    if (badgeEl && userData.role) {
        badgeEl.textContent = userData.role === 'admin' ? 'Administrator' : userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'user-dropdown-wrapper';

    // Insert wrapper into sidebar-user
    sidebarUser.insertBefore(wrapper, userCard);
    wrapper.appendChild(userCard);

    // Add caret to user-card
    const caret = document.createElement('i');
    caret.className = 'fa-solid fa-chevron-down user-card-caret';
    userCard.appendChild(caret);

    // Create dropdown menu element
    const dropdown = document.createElement('div');
    dropdown.className = 'user-profile-dropdown';

    // 1. Add Dropdown Header
    const dropdownHeader = document.createElement('div');
    dropdownHeader.className = 'user-dropdown-header';
    
    const headerName = document.createElement('div');
    headerName.className = 'user-dropdown-header-name';
    headerName.textContent = userData.name || 'User Profile';
    
    const headerRole = document.createElement('div');
    headerRole.className = 'user-dropdown-header-role';
    headerRole.textContent = userData.role === 'admin' ? 'Administrator' : userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    
    dropdownHeader.appendChild(headerName);
    dropdownHeader.appendChild(headerRole);
    dropdown.appendChild(dropdownHeader);

    // Divider
    const headerDivider = document.createElement('div');
    headerDivider.className = 'user-dropdown-divider';
    dropdown.appendChild(headerDivider);

    // Add Admin items if user is admin
    const isAdmin = userData && userData.role === 'admin';

    if (isAdmin) {
        // 1. Manage Users
        const itemUsers = document.createElement('button');
        itemUsers.className = 'user-dropdown-item';
        itemUsers.innerHTML = `
            <svg class="dropdown-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>จัดการผู้ใช้งาน</span>
        `;
        itemUsers.onclick = () => window.location.href = 'dashboard.html?view=users';
        dropdown.appendChild(itemUsers);

        // 2. Add New Project
        const itemAdd = document.createElement('button');
        itemAdd.className = 'user-dropdown-item';
        itemAdd.innerHTML = `
            <svg class="dropdown-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            <span>เพิ่มโครงการใหม่</span>
        `;
        itemAdd.onclick = () => window.location.href = 'dashboard.html';
        dropdown.appendChild(itemAdd);

        // 3. Admin Console
        const itemConsole = document.createElement('button');
        itemConsole.className = 'user-dropdown-item';
        itemConsole.innerHTML = `
            <svg class="dropdown-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
            </svg>
            <span>Admin Console (สิทธิ์ด่วน)</span>
        `;
        itemConsole.onclick = () => window.location.href = 'console_admin.html';
        dropdown.appendChild(itemConsole);

        // Divider
        const divider = document.createElement('div');
        divider.className = 'user-dropdown-divider';
        dropdown.appendChild(divider);
    }

    // Add Logout Item
    const itemLogout = document.createElement('button');
    itemLogout.className = 'user-dropdown-item logout-item';
    itemLogout.innerHTML = `
        <svg class="dropdown-item-icon" style="color: #ef4444;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        <span>ออกจากระบบ</span>
    `;
    itemLogout.onclick = () => {
        if (oldLogoutBtn) {
            oldLogoutBtn.click();
        } else if (typeof handleLogout === 'function') {
            handleLogout();
        } else if (window.handleLogout) {
            window.handleLogout();
        } else {
            window.location.href = 'index.html';
        }
    };
    dropdown.appendChild(itemLogout);

    wrapper.appendChild(dropdown);

    // Hide old elements
    if (oldLogoutBtn) oldLogoutBtn.style.display = 'none';
    if (oldAdminMenu) oldAdminMenu.style.display = 'none';

    // Toggling behaviour
    userCard.onclick = (e) => {
        e.stopPropagation();
        const show = dropdown.classList.toggle('show');
        wrapper.classList.toggle('active', show);
    };

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
            wrapper.classList.remove('active');
        }
    });
}

/* ────────────────────────────────────────────
   V. GLOBAL SIDEBAR & PAGE PERMISSION GUARD
   ──────────────────────────────────────────── */
window.applySidebarPermissions = function(userData) {
    if (!userData) return;

    // Initialize the account dropdown menu (moving admin menu items and logout inside it)
    try {
        initAccountDropdown(userData);
    } catch(err) {
        console.error('Dropdown init error:', err);
    }

    // 1. Hide/Show Admin Console menu based on Role
    const adminMenus = document.querySelectorAll('#adminMenu, a[href*="console_admin.html"], button[onclick*="console_admin.html"], [data-page*="console_admin.html"]');
    adminMenus.forEach(el => {
        if (userData.role === 'admin') {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // 2. Hide navigation items for pages that are disabled for this user (including admins if explicitly configured)
    if (userData.allowedPages) {
        const PAGE_SELECTOR_MAP = {
            'dashboard.html': [
                '#nav-dashboard', '#nav-projects', '#nav-items', 
                'a[href*="dashboard.html"]', 'button[onclick*="dashboard"]',
                'button[onclick*="navigateTo(\'dashboard\')"]', 'button[onclick*="navigateTo(\'projects\')"]', 'button[onclick*="navigateTo(\'items\')"]',
                '[data-page*="dashboard.html"]'
            ],
            'materials_purchasing.html': [
                '#nav-purchasing', '#nav-purchasing-school', 'a[href*="materials_purchasing.html"]', 'button[onclick*="materials_purchasing.html"]',
                '[data-page*="materials_purchasing.html"]'
            ],
            'materials_purchasing_company.html': [
                '#nav-purchasing-company', 'a[href*="materials_purchasing_company.html"]', 'button[onclick*="materials_purchasing_company.html"]',
                '[data-page*="materials_purchasing_company.html"]'
            ],
            'quotation.html': [
                '#nav-quotation', 'a[href*="quotation.html"]', 'button[onclick*="quotation.html"]',
                '[data-page*="quotation.html"]'
            ],
            'products.html': [
                '#nav-products', 'a[href*="products.html"]', 'button[onclick*="products.html"]',
                '[data-page*="products.html"]'
            ],
            'equipments.html': [
                '#nav-equipments', 'a[href*="equipments.html"]', 'button[onclick*="equipments.html"]',
                '[data-page*="equipments.html"]'
            ],
            'external_training.html': [
                '#nav-training', 'a[href*="external_training.html"]', 'button[onclick*="external_training.html"]',
                '[data-page*="external_training.html"]'
            ],
            'calendar.html': [
                '#nav-calendar', 'a[href*="calendar.html"]', 'button[onclick*="calendar.html"]',
                '[data-page*="calendar.html"]'
            ],
            'crm.html': [
                '#nav-crm', 'a[href*="crm.html"]', 'button[onclick*="crm.html"]',
                '[data-page*="crm.html"]'
            ],
            'register_training.html': [
                '#nav-register-training', 'a[href*="register_training.html"]', 'button[onclick*="register_training.html"]',
                '[data-page*="register_training.html"]'
            ],
            'ocr_table.html': [
                '#nav-ocr', 'a[href*="ocr_table.html"]', 'button[onclick*="ocr_table.html"]',
                '[data-page*="ocr_table.html"]'
            ],
            'certificate_template.html': [
                '#nav-certificate', 'a[href*="certificate_template.html"]', 'button[onclick*="certificate_template.html"]',
                '[data-page*="certificate_template.html"]'
            ]
        };

        Object.keys(userData.allowedPages).forEach(pageKey => {
            if (userData.allowedPages[pageKey] === false) {
                const selectors = PAGE_SELECTOR_MAP[pageKey] || [];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });
                });
            }
        });

        // Hide main group if both sub-pages are disabled
        const isSchoolDisabled = userData.allowedPages['materials_purchasing.html'] === false;
        const isCompanyDisabled = userData.allowedPages['materials_purchasing_company.html'] === false;
        if (isSchoolDisabled && isCompanyDisabled) {
            document.querySelectorAll('#nav-purchasing-group').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        }
    }

    // 3. Highlight current active sidebar item based on current page URL
    try {
        let currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
        currentFile = currentFile.split('?')[0].split('#')[0];
        if (currentFile === '' || currentFile === '/') currentFile = 'dashboard.html';

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(el => {
            const href = el.getAttribute('href') || '';
            const onclick = el.getAttribute('onclick') || '';
            if ((href && href.includes(currentFile)) || (onclick && onclick.includes(currentFile))) {
                el.classList.add('active');
            }
        });
    } catch(e) {}
};

window.checkPageAccess = function(userData) {
    if (!userData) return true;

    let currentFile = window.location.pathname.split('/').pop() || 'index.html';
    if (!currentFile || currentFile === '' || currentFile === '/') currentFile = 'dashboard.html';
    currentFile = currentFile.split('?')[0].split('#')[0];

    // If current page is explicitly set to false in allowedPages (applies to ALL accounts including Admin)
    if (userData.allowedPages && userData.allowedPages[currentFile] === false) {
        alert('ขออภัย บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้าเว็บนี้ กรุณาติดต่อผู้ดูแลระบบ');
        window.location.href = 'dashboard.html';
        return false;
    }

    // Apply sidebar permissions & menu display
    window.applySidebarPermissions(userData);

    return true;
};

/* ================================================================
   SIDEBAR SUB-MENU TOGGLE & AUTO-EXPAND LOGIC
   ================================================================ */
window.toggleSubmenu = function(submenuId, btn) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;

    const isOpen = submenu.classList.contains('open');
    if (isOpen) {
        submenu.classList.remove('open');
        if (btn) btn.classList.remove('open');
    } else {
        submenu.classList.add('open');
        if (btn) btn.classList.add('open');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        let path = window.location.pathname.split('/').pop() || '';
        if (path.includes('materials_purchasing')) {
            const submenu = document.getElementById('purchasingSubmenu');
            const mainBtn = document.getElementById('nav-purchasing-main');
            if (submenu) submenu.classList.add('open');
            if (mainBtn) mainBtn.classList.add('open');

            if (path.includes('materials_purchasing_company.html')) {
                const companyItem = document.getElementById('nav-purchasing-company');
                if (companyItem) companyItem.classList.add('active');
            } else if (path.includes('materials_purchasing.html')) {
                const schoolItem = document.getElementById('nav-purchasing-school');
                if (schoolItem) schoolItem.classList.add('active');
            }
        }
    } catch(e) {}
});
