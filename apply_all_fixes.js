const fs = require('fs');
let content = fs.readFileSync('assets/js/app-ui.js', 'utf8');

// 1. Remove Dark Mode logic
content = content.replace(/const THEME_KEY = 'mentra_ui_theme';[\s\S]*?function injectThemeToggle\(\) \{[\s\S]*?\r?\n    \}/, '');
content = content.replace(/if \(e\.altKey && e\.key\.toLowerCase\(\) === 't'\) toggleTheme\(\);\r?\n/, '');
content = content.replace(/console\.log\('  Alt\+T  : Toggle Theme'\);\r?\n/, '');
content = content.replace(/\/\/ Create Right Container with Quick Dark Toggle[\s\S]*?rightDiv\.appendChild\(mThemeBtn\);/, '// Create Right Container (Empty, as dark mode button is removed)\n            const rightDiv = document.createElement(\'div\');\n            rightDiv.className = \'topbar-m-right\';');
content = content.replace(/\/\/ Set initial theme icon[\s\S]*?mThemeBtn\.innerHTML = initialTheme === 'dark' \? '☀️' : '🌙';/, '');
content = content.replace(/[ \t]*injectThemeToggle\(\);\r?\n/, '');
content = content.replace(/,\s*toggleTheme,\s*applyTheme/, '');

// 2. Add initSmoothTransitions missing function at the end
const transitionScript = `
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
`;

if (!content.includes('function initSmoothTransitions')) {
    content = content.replace(/init\(\);\s*\}\)\(\);/, transitionScript + '\n    init();\n})();');
}

// 3. Add exception for index.html in initMobileNav
content = content.replace('const search = location.search;', 'const search = location.search;\n\n        if (page === \'index.html\' || page === \'\') return;');

// 4. Also ADD initSmoothTransitions() call inside boot() if it's missing (it wasn't in commit 15 because I reverted)
if (!content.includes('initSmoothTransitions();')) {
    content = content.replace(/initMobileNav\(\);/, 'initMobileNav();\n        initSmoothTransitions();');
}

fs.writeFileSync('assets/js/app-ui.js', content);
console.log('Fixed app-ui.js perfectly 2');
