
        /* ============================================
           MENTRA MANAGER — UI ENHANCEMENT LAYER
           Pure UI/UX JS — no Firebase logic touched
           ============================================ */

        // ===== TAB SWITCHER WITH ANIMATED INDICATOR =====
        function switchTab(tab) {
            document.getElementById('loginTab').classList.toggle('active', tab === 'login');
            document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
            document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
            document.getElementById('signupTabBtn').classList.toggle('active', tab === 'signup');

            // Animate the gliding pill indicator
            const indicator = document.getElementById('tabIndicator');
            if (indicator) {
                indicator.classList.toggle('right', tab === 'signup');
            }

            document.getElementById('formHeading').textContent = tab === 'login' ? 'ยินดีต้อนรับ' : 'สร้างบัญชีใหม่';
            document.getElementById('formSubheading').textContent = tab === 'login'
                ? 'เข้าสู่ระบบเพื่อจัดการโครงการของคุณ'
                : 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้';
            document.getElementById('alertBox').className = 'alert';
        }

        // ===== TOGGLE PASSWORD VISIBILITY =====
        function togglePw(inputId, btn) {
            const input = document.getElementById(inputId);
            const isText = input.type === 'text';
            input.type = isText ? 'password' : 'text';
            btn.innerHTML = isText
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        }

        // ===== FLOATING PARTICLES GENERATOR =====
        (function initParticles() {
            const container = document.getElementById('brandParticles');
            if (!container) return;
            const count = 18;
            for (let i = 0; i < count; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                const size = Math.random() * 12 + 5;
                const left = Math.random() * 100;
                const delay = Math.random() * 12;
                const dur = Math.random() * 10 + 8;
                p.style.cssText = `
                    width: ${size}px; height: ${size}px;
                    left: ${left}%;
                    animation-duration: ${dur}s;
                    animation-delay: -${delay}s;
                    opacity: ${Math.random() * 0.5 + 0.1};
                `;
                container.appendChild(p);
            }
        })();

        // ===== ENTER KEY SUPPORT =====
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeTab = document.getElementById('loginTab').classList.contains('active');
                if (activeTab) { if (typeof handleLogin === 'function') handleLogin(); }
                else { if (typeof handleSignup === 'function') handleSignup(); }
            }
        });

        // ===== INPUT FOCUS COLOR SYNC (icon tint) =====
        document.querySelectorAll('.input-wrap input').forEach(input => {
            input.addEventListener('focus', () => {
                const icon = input.parentElement.querySelector('svg');
                if (icon) icon.style.color = 'var(--primary)';
            });
            input.addEventListener('blur', () => {
                const icon = input.parentElement.querySelector('svg');
                if (icon) icon.style.color = '';
            });
        });

    