
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
        import { initializeFirestore, doc, setDoc, getDoc, collection, query, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // Load config from firebase-config.js (ใช้ globalThis เพราะ module scope)
        const configScript = await import('./firebase-config.js').catch(() => null);

        let firebaseConfig = null;
        if (configScript) {
            firebaseConfig = configScript.FIREBASE_CONFIG || configScript.default?.FIREBASE_CONFIG;
        }
        if (!firebaseConfig) {
            firebaseConfig = {
                apiKey: "AIzaSyDRGKOGn4v7of-AH8HuZTtk8FfI24NHdCU",
                authDomain: "mentra-manager-e039f.firebaseapp.com",
                projectId: "mentra-manager-e039f",
                storageBucket: "mentra-manager-e039f.firebasestorage.app",
                messagingSenderId: "563604754745",
                appId: "1:563604754745:web:ea0892fafb48b74dcf58e8"
            };
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = initializeFirestore(app, {
            experimentalAutoDetectLongPolling: true
        });

        // ===== SHOW ALERT =====
        function showAlert(message, type = 'error') {
            const box = document.getElementById('alertBox');
            const text = document.getElementById('alertText');
            const icon = document.getElementById('alertIcon');
            text.textContent = message;
            icon.textContent = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
            box.className = `alert show ${type}`;
        }

        function hideAlert() {
            document.getElementById('alertBox').className = 'alert';
        }

        function setLoading(btn, spinner, btnText, loading) {
            btn.disabled = loading;
            spinner.style.display = loading ? 'block' : 'none';
            btnText.style.display = loading ? 'none' : 'inline';
        }

        // ===== CHECK IF FIRST USER =====
        async function isFirstUser() {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, limit(1));
            const snap = await getDocs(q);
            return snap.empty;
        }

        // ===== LOGIN =====
        window.handleLogin = async function () {
            const identifier = document.getElementById('loginIdentifier').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            const spinner = document.getElementById('loginSpinner');
            const btnText = document.getElementById('loginBtnText');

            hideAlert();
            if (!identifier || !password) {
                showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
                return;
            }

            setLoading(btn, spinner, btnText, true);

            try {
                let email = identifier;

                // ถ้าเป็น email ให้หาและตรวจใน Firestore ก่อนเพื่อความปลอดภัย
                if (identifier.includes('@')) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('email', '==', identifier.toLowerCase()));
                    const querySnapshot = await getDocs(q);
                    if (querySnapshot.empty) {
                        showAlert('ไม่พบชื่อผู้ใช้นี้ในระบบ หรือบัญชีถูกลบแล้ว', 'error');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    }
                    const userData = querySnapshot.docs[0].data();
                    const status = userData.status || 'approved';
                    if (status === 'pending') {
                        showAlert('บัญชีของคุณอยู่ระหว่างการรออนุมัติจากผู้ดูแลระบบ', 'warning');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    } else if (status === 'rejected') {
                        showAlert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ', 'error');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    }
                    email = userData.email;
                } else {
                    // ถ้าไม่ใช่ email ให้หา email จาก username
                    const usernameDoc = await getDoc(doc(db, 'usernames', identifier.toLowerCase()));
                    if (!usernameDoc.exists()) {
                        showAlert('ไม่พบชื่อผู้ใช้นี้ในระบบ', 'error');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    }
                    
                    // ตรวจสอบข้อมูลใน users เพิ่มเติมเพื่อความปลอดภัย
                    const userDoc = await getDoc(doc(db, 'users', usernameDoc.data().uid));
                    if (!userDoc.exists()) {
                        showAlert('ไม่พบชื่อผู้ใช้นี้ในระบบ หรือบัญชีถูกลบแล้ว', 'error');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    }
                    const userData = userDoc.data();
                    const status = userData.status || 'approved';
                    if (status === 'pending') {
                        showAlert('บัญชีของคุณอยู่ระหว่างการรออนุมัติจากผู้ดูแลระบบ', 'warning');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    } else if (status === 'rejected') {
                        showAlert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ', 'error');
                        setLoading(btn, spinner, btnText, false);
                        return;
                    }
                    email = usernameDoc.data().email;
                }

                await signInWithEmailAndPassword(auth, email, password);
                showAlert('เข้าสู่ระบบสำเร็จ กำลังโหลด...', 'success');
                setTimeout(() => { window.location.href = 'quotation.html'; }, 800);

            } catch (err) {
                const msgs = {
                    'auth/user-not-found': 'ไม่พบบัญชีผู้ใช้นี้',
                    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
                    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
                    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
                    'auth/too-many-requests': 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง',
                };
                showAlert(msgs[err.code] || `เกิดข้อผิดพลาด: ${err.message}`, 'error');
                setLoading(btn, spinner, btnText, false);
            }
        };

        // ===== SIGNUP =====
        window.handleSignup = async function () {
            const firstName = document.getElementById('signupFirstName').value.trim();
            const lastName = document.getElementById('signupLastName').value.trim();
            const username = document.getElementById('signupUsername').value.trim().toLowerCase();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirm').value;
            const btn = document.getElementById('signupBtn');
            const spinner = document.getElementById('signupSpinner');
            const btnText = document.getElementById('signupBtnText');

            hideAlert();

            if (!firstName || !lastName || !username || !email || !password || !confirm) {
                showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
                return;
            }
            if (!/^[a-z0-9_]+$/.test(username)) {
                showAlert('Username ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ เท่านั้น', 'error');
                return;
            }
            if (password.length < 8) {
                showAlert('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'error');
                return;
            }
            if (password !== confirm) {
                showAlert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
                return;
            }

            setLoading(btn, spinner, btnText, true);
            window.isSigningUp = true;

            try {
                // ตรวจสอบว่า username ถูกใช้แล้วหรือยัง
                const usernameSnap = await getDoc(doc(db, 'usernames', username));
                if (usernameSnap.exists()) {
                    showAlert('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น', 'error');
                    setLoading(btn, spinner, btnText, false);
                    window.isSigningUp = false;
                    return;
                }

                // ตรวจสอบว่าเป็นคนแรกหรือไม่ → กำหนด role และ status
                const firstUser = await isFirstUser();
                const role = firstUser ? 'admin' : 'user';
                const status = firstUser ? 'approved' : 'pending';

                // สร้างบัญชีใน Firebase Auth
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                const uid = cred.user.uid;

                // บันทึกข้อมูลใน Firestore
                await Promise.all([
                    setDoc(doc(db, 'users', uid), {
                        uid,
                        firstName,
                        lastName,
                        displayName: `${firstName} ${lastName}`,
                        username,
                        email,
                        role,
                        status,
                        createdAt: new Date().toISOString(),
                    }),
                    setDoc(doc(db, 'usernames', username), { email, uid }),
                ]);

                window.isSigningUp = false;
                const roleMsg = role === 'admin'
                    ? ' (คุณได้รับสิทธิ์ Admin เนื่องจากเป็นผู้ลงทะเบียนคนแรก)'
                    : ' (อยู่ระหว่างรอผู้ดูแลระบบอนุมัติบัญชี)';
                showAlert(`สมัครสมาชิกสำเร็จ!${roleMsg} กำลังเข้าสู่ระบบ...`, 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

            } catch (err) {
                window.isSigningUp = false;
                const msgs = {
                    'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
                    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
                    'auth/weak-password': 'รหัสผ่านไม่แข็งแรงพอ',
                };
                showAlert(msgs[err.code] || `เกิดข้อผิดพลาด: ${err.message}`, 'error');
                setLoading(btn, spinner, btnText, false);
            }
        };

        // ===== FORGOT PASSWORD =====
        window.forgotPassword = async function () {
            const identifier = document.getElementById('loginIdentifier').value.trim();
            if (!identifier || !identifier.includes('@')) {
                showAlert('กรุณากรอกอีเมลในช่องด้านบนก่อน', 'info');
                return;
            }
            try {
                await sendPasswordResetEmail(auth, identifier);
                // Bug-08 fix: ambiguous success message — don't reveal if email exists (OWASP best practice)
                showAlert('ถ้าอีเมลนี้มีอยู่ในระบบ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของคุณเร็วๆ นี้', 'success');
            } catch (err) {
                if (err.code === 'auth/user-not-found') {
                    // Keep same ambiguous message to avoid user enumeration
                    showAlert('ถ้าอีเมลนี้มีอยู่ในระบบ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของคุณเร็วๆ นี้', 'success');
                } else {
                    showAlert('ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบการเชื่อมต่ออินเตอร์เน็ตและลองใหม่', 'error');
                }
            }
        };


        // ===== CHECK URL QUERY PARAMETERS & AUTO REDIRECT =====
        window.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const msg = params.get('msg');
            if (msg === 'pending') {
                showAlert('บัญชีของคุณอยู่ระหว่างการรออนุมัติจากผู้ดูแลระบบ โปรดลองเข้าสู่ระบบอีกครั้งในภายหลัง', 'warning');
            } else if (msg === 'rejected') {
                showAlert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ', 'error');
            } else if (msg === 'deleted') {
                showAlert('บัญชีผู้ใช้นี้ถูกลบออกจากระบบแล้ว หรือไม่มีสิทธิ์เข้าใช้งาน', 'error');
            }
        });

        // ===== AUTO REDIRECT IF LOGGED IN WITH VALIDATION =====
        auth.onAuthStateChanged(async (user) => {
            if (user && !window.isSigningUp) {
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (!snap.exists()) {
                        await signOut(auth);
                        showAlert('บัญชีผู้ใช้นี้ถูกลบออกจากระบบแล้ว', 'error');
                        return;
                    }
                    const userData = snap.data();
                    const status = userData.status || 'approved';
                    if (status === 'pending') {
                        await signOut(auth);
                        showAlert('บัญชีของคุณอยู่ระหว่างการรออนุมัติจากผู้ดูแลระบบ โปรดลองเข้าสู่ระบบอีกครั้งในภายหลัง', 'warning');
                    } else if (status === 'rejected') {
                        await signOut(auth);
                        showAlert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ', 'error');
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } catch (e) {
                    console.error("Auth redirect validation failed:", e);
                }
            }
        });
    