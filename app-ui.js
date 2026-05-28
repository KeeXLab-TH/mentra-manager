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
                e.currentTarget = btn;
                createRipple({ currentTarget: btn, clientX: e.clientX, clientY: e.clientY });
            }
        });
    }


    /* ────────────────────────────────────────────
       II. DARK / LIGHT MODE TOGGLE
       ──────────────────────────────────────────── */
    const THEME_KEY = 'mentra_ui_theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        const btn = document.querySelector('.theme-toggle-btn');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
            btn.title = theme === 'dark' ? 'สลับเป็น Light Mode' : 'สลับเป็น Dark Mode';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    function injectThemeToggle() {
        // Don't inject on login page
        if (!document.querySelector('.sidebar')) return;

        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', 'Toggle Dark Mode');
        btn.addEventListener('click', toggleTheme);
        document.body.appendChild(btn);

        // Apply saved theme
        applyTheme(getPreferredTheme());

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(THEME_KEY)) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }


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
            `;
            document.head.appendChild(style);
        }
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
        injectThemeToggle();
        initAutoLoading();
        initTopbarScroll();
        initKeyboardShortcuts();
        initFocusManagement();

        // Delayed entrance animations (after page settles)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initStaggeredEntrance();
            });
        });

        // Expose API on window for existing code to call
        window.MentraUI = {
            toast: showToast,
            setLoading,
            toggleTheme,
            applyTheme
        };

        console.log('%c✦ Mentra UI Layer loaded', 'color: #1A6FBF; font-weight: bold; font-size: 12px;');
    }

    init();

})();
