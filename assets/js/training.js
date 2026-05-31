
        import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
        import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
        import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // โหลด config
        let FIREBASE_CONFIG;
        try {
            const cfg = await import('./firebase-config.js');
            FIREBASE_CONFIG = cfg.FIREBASE_CONFIG || cfg.default?.FIREBASE_CONFIG;
        } catch (e) {
            console.warn('firebase-config.js not found, using defaults');
        }
        if (!FIREBASE_CONFIG) {
            FIREBASE_CONFIG = {
                apiKey: "AIzaSyDRGKOGn4v7of-AH8HuZTtk8FfI24NHdCU",
                authDomain: "mentra-manager-e039f.firebaseapp.com",
                projectId: "mentra-manager-e039f",
                storageBucket: "mentra-manager-e039f.firebasestorage.app",
                messagingSenderId: "563604754745",
                appId: "1:563604754745:web:ea0892fafb48b74dcf58e8"
            };
        }

        // ใช้ default app instance เดียวกับ index.html/dashboard.html (สำคัญมาก!)
        const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            // ดึงข้อมูล user จาก Firestore
            let userData = null;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    userData = snap.data();
                } else {
                    alert('ไม่พบบัญชีผู้ใช้นี้ในระบบ หรือบัญชีของคุณถูกลบแล้ว');
                    await signOut(auth);
                    window.location.href = 'index.html?msg=deleted';
                    return;
                }
            } catch (e) {
                // Bug-02 fix: Firestore network timeout/rules error must NOT leave user on a blank page
                console.warn('Could not load user data:', e);
                document.body.style.opacity = '1';
                document.body.style.pointerEvents = 'auto';
                if (typeof showToast === 'function') {
                    showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ กรุณารีเฟรชหน้าเว็บและลองใหม่', 'info');
                }
                return;
            }

            if (userData) {
                // Check approval status
                const userStatus = userData.status || 'approved';
                if (userStatus === 'pending') {
                    alert('บัญชีของคุณอยู่ระหว่างการรออนุมัติสิทธิ์เข้าใช้งานจากผู้ดูแลระบบ');
                    await signOut(auth);
                    window.location.href = 'index.html?msg=pending';
                    return;
                } else if (userStatus === 'rejected') {
                    alert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ');
                    await signOut(auth);
                    window.location.href = 'index.html?msg=rejected';
                    return;
                }

                // แสดงชื่อและ role ใน sidebar
                const { displayName, firstName, role } = userData;
                const name = displayName || firstName || user.email || '-';
                const initials = name.charAt(0).toUpperCase();

                document.getElementById('userAvatar').textContent = initials;
                document.getElementById('userName').textContent = name;

                const badge = document.getElementById('userRoleBadge');
                badge.textContent = role === 'admin' ? 'Admin' : 'User';
                badge.className = `role-badge ${role === 'admin' ? 'admin' : 'user'}`;

                // แสดง adminMenu ถ้าเป็น admin
                if (role === 'admin') {
                    const adminMenu = document.getElementById('adminMenu');
                    if (adminMenu) adminMenu.style.display = 'block';
                }

                // ===== FIRESTORE REAL-TIME SYNCHRONISATION =====
                // 1. Establish Real-time database listener on training_requests collection
                onSnapshot(collection(db, 'training_requests'), (querySnapshot) => {
                    trainingRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    localStorage.setItem('mentra_training_requests', JSON.stringify(trainingRequests));
                    
                    // Rerender all UI views in real-time
                    checkDatabaseState();
                    renderTable();
                    calculateSummary();
                    renderCalendarGrid();

                    // Real-time update for open Certificate Creator
                    if (window.certActiveRecordId) {
                        const activeReq = trainingRequests.find(r => r.id === window.certActiveRecordId);
                        if (activeReq) {
                            const dbParticipants = activeReq.participants && activeReq.participants.length > 0 ? [...activeReq.participants] : [""];
                            const isDifferent = JSON.stringify(window.currentParticipants) !== JSON.stringify(dbParticipants);
                            if (isDifferent) {
                                window.currentParticipants = dbParticipants;
                                currentParticipants = dbParticipants; // Sync local global
                                if (window.activeParticipantIndex >= currentParticipants.length) {
                                    window.activeParticipantIndex = Math.max(0, currentParticipants.length - 1);
                                    activeParticipantIndex = window.activeParticipantIndex;
                                }
                                document.getElementById("bulkParticipantInput").value = currentParticipants.join("\n");
                                renderParticipantRows();
                                updateCertPreview();
                            }
                        }
                    }
                }, (err) => {
                    console.error("Firestore onSnapshot error:", err);
                });

                // 2. Override saveDatabase to save locally and write to Firestore
                window.saveDatabase = async function() {
                    localStorage.setItem('mentra_training_requests', JSON.stringify(trainingRequests));
                    try {
                        for (const req of trainingRequests) {
                            await setDoc(doc(db, 'training_requests', req.id), req);
                        }
                    } catch (e) {
                        console.error("Failed to sync saveDatabase to Firestore:", e);
                    }
                };

                // Bug-06 fix: targeted single-document update (used by debouncedSaveParticipants)
                // Only writes the 'participants' field — avoids full write storm on every keystroke
                window.saveParticipantDoc = async function(reqId, participants) {
                    try {
                        await updateDoc(doc(db, 'training_requests', reqId), { participants });
                    } catch (e) {
                        console.error('Failed to save participants to Firestore:', e);
                    }
                };

                // 3. Override delete database method to include Firestore deletion
                window.executeDeleteRecord = async function() {
                    if (!pendingDeleteId) return;
                    const idToDelete = pendingDeleteId;
                    
                    trainingRequests = trainingRequests.filter(r => r.id !== idToDelete);
                    localStorage.setItem('mentra_training_requests', JSON.stringify(trainingRequests));
                    
                    closeModal('deleteConfirmModal');
                    closeModal('detailModal');
                    
                    checkDatabaseState();
                    renderTable();
                    calculateSummary();
                    renderCalendarGrid();
                    
                    showToast("ลบรายการอบรมออกจากระบบเรียบร้อยแล้ว", "info");
                    pendingDeleteId = null;

                    try {
                        await deleteDoc(doc(db, 'training_requests', idToDelete));
                    } catch (e) {
                        console.error("Failed to delete request from Firestore:", e);
                    }
                };

                // Show body now that the user is fully verified and database listener is live
                setTimeout(() => {
                    document.body.style.opacity = '1';
                    document.body.style.pointerEvents = 'auto';
                }, 100);
            }
        });

        // Logout ผ่าน Firebase Auth
        window.handleLogout = async function () {
            await signOut(auth);
            window.location.href = 'index.html';
        };
    
