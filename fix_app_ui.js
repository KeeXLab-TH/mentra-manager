const fs = require('fs');
const appUiPath = 'assets/js/app-ui.js';
let content = fs.readFileSync(appUiPath, 'utf8');

const transitionScript = `
    /* ==========================================
       SMOOTH PAGE TRANSITIONS
       ========================================== */
    function initSmoothTransitions() {
        // Prevent "white flash" by adding a preloader overlay on navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            // Check if it's an internal HTML link and not opening in a new tab
            if (href && href.endsWith('.html') && !href.startsWith('http') && link.target !== '_blank') {
                e.preventDefault();
                showGlobalPreloader();
                
                // Allow UI to paint the preloader before navigating
                setTimeout(() => {
                    window.location.href = href;
                }, 150);
            }
        });

        // Hide preloader when page finishes loading (handles back/forward cache too)
        window.addEventListener('pageshow', () => {
            hideGlobalPreloader();
        });
    }

    function showGlobalPreloader() {
        let loader = document.getElementById('mentra-global-transition');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'mentra-global-transition';
            loader.innerHTML = '<div class="spinner"></div>';
            
            // Inline styles to avoid CSS dependency issues
            Object.assign(loader.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                zIndex: '999999', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: '0', transition: 'opacity 0.15s ease'
            });
            
            const spinnerStyle = document.createElement('style');
            spinnerStyle.textContent = \`
                #mentra-global-transition .spinner {
                    width: 40px; height: 40px;
                    border: 4px solid var(--primary-glow, rgba(26,111,191,0.2));
                    border-top-color: var(--primary, #1A6FBF);
                    border-radius: 50%;
                    animation: mentra-spin 0.8s linear infinite;
                }
                @keyframes mentra-spin { to { transform: rotate(360deg); } }
            \`;
            document.head.appendChild(spinnerStyle);
            document.body.appendChild(loader);
        }
        
        loader.style.pointerEvents = 'all';
        requestAnimationFrame(() => {
            loader.style.opacity = '1';
        });
    }

    function hideGlobalPreloader() {
        const loader = document.getElementById('mentra-global-transition');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
        }
    }
`;

// Insert the missing functions right before the final closing IIFE }
// We can find the last 'init();' and replace it with transitionScript + '\n    init();'
if (!content.includes('function initSmoothTransitions')) {
    content = content.replace(/init\(\);\s*\}\)\(\);/s, transitionScript + '\n\n    init();\n})();');
    fs.writeFileSync(appUiPath, content);
    console.log('Fixed app-ui.js');
}
