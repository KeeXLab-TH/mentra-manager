import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
        import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
        import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        let FIREBASE_CONFIG;
        window.GAS_URL = null;
        window.DRIVE_ROOT_FOLDER_ID = null;
        try {
            const cfg = await import('../../assets/js/firebase-config.js');
            FIREBASE_CONFIG = cfg.FIREBASE_CONFIG || cfg.default?.FIREBASE_CONFIG;
            window.GAS_URL = cfg.GAS_URL || null;
            window.DRIVE_ROOT_FOLDER_ID = cfg.DRIVE_ROOT_FOLDER_ID || null;
        } catch (e) {
        }
        if (!FIREBASE_CONFIG || !window.GAS_URL) {
            throw new Error('ไม่พบไฟล์ firebase-config.js กรุณาติดต่อผู้ดูแลระบบ');
        }

        const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Instant user display from local cache to prevent seeing "กำลังโหลด..."
        try {
            const cachedStr = localStorage.getItem('mentra_cached_user_profile') || localStorage.getItem('mentra_user_permissions');
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                const name = cached.displayName || (cached.firstName ? `${cached.firstName} ${cached.lastName || ''}`.trim() : '') || cached.name || cached.username || cached.email;
                if (name) {
                    const uName = document.getElementById('userName');
                    const uAvatar = document.getElementById('userAvatar');
                    const uBadge = document.getElementById('userRoleBadge');
                    if (uName) uName.textContent = name;
                    if (uAvatar) uAvatar.textContent = name.charAt(0).toUpperCase();
                    if (uBadge && cached.role) {
                        uBadge.textContent = cached.role === 'admin' ? 'Administrator' : (cached.role.charAt(0).toUpperCase() + cached.role.slice(1));
                        uBadge.className = `role-badge ${cached.role}`;
                    }
                }
            }
        } catch(e) {}

        let firestoreSyncInitialized = false;

        function setupFirestoreSync() {
            if (firestoreSyncInitialized) return;
            firestoreSyncInitialized = true;

            const projectsRef = collection(db, 'material_projects');
            let initialSnapshotDone = false;

            function processProjectsSnapshot(querySnapshot) {
                initialSnapshotDone = true;
                if (fallbackTimer) clearTimeout(fallbackTimer);
                appData.isLoadingProjects = false;

                const docs = [];
                querySnapshot.forEach(docSnap => {
                    const data = docSnap.data() || {};
                    // Sanitize corrupted project data where school was mistakenly set as company/shop
                    if (data.company && data.institution && data.company === data.institution) {
                        data.company = '';
                    }
                    if (data.shop && data.institution && data.shop === data.institution) {
                        data.shop = '';
                    }
                    docs.push({ id: docSnap.id, ...data });
                });
                
                // Sort by date or created descending
                docs.sort((a, b) => b.id.localeCompare(a.id));
                
                appData.projects = docs;
                
                // Cache lightweight projects list in localStorage for instant access across tabs
                try {
                    const lightProjects = docs.map(p => {
                        const pCopy = { ...p };
                        if (Array.isArray(pCopy.items)) {
                            pCopy.items = pCopy.items.map(it => {
                                const { images, ...lightItem } = it;
                                return lightItem;
                            });
                        }
                        return pCopy;
                    });
                    localStorage.setItem('material_projects', JSON.stringify(lightProjects));
                } catch(e) {}
                
                // Check if opened via Shared Link URL params
                const urlParams = new URLSearchParams(window.location.search);
                const paramProjId = urlParams.get('projectId');
                const paramMode = urlParams.get('mode');
                
                if (paramMode === 'view') {
                    appData.isReadOnly = true;
                } else if (paramMode === 'edit') {
                    appData.isReadOnly = false;
                }
                
                if (paramProjId && !appData.hasAutoOpenedSharedProject) {
                    const sharedProj = docs.find(p => p.id === paramProjId);
                    if (sharedProj) {
                        appData.hasAutoOpenedSharedProject = true;
                        appData.showProjectDetails(paramProjId);
                        return;
                    }
                }
                
                // Trigger view updates based on what is active
                if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                    appData.renderInstitutions();
                } else if (!document.getElementById('view-projects').classList.contains('hidden')) {
                    appData.renderProjects();
                } else if (!document.getElementById('view-project-details').classList.contains('hidden')) {
                    const currentProj = docs.find(p => p.id === appData.currentProjectId);
                    if (currentProj) {
                        appData.updateProjectDetailsUI(currentProj);
                        appData.renderExcelTable();
                    } else {
                        // Project was deleted
                        appData.showInstitutionsView();
                    }
                }
            }

            // Fallback: If real-time snapshot doesn't fire within 5 seconds, use direct getDocs
            const fallbackTimer = setTimeout(async () => {
                if (initialSnapshotDone) return;
                console.warn('[materials_purchasing] onSnapshot delayed — fetching via getDocs fallback');
                try {
                    const snap = await getDocs(projectsRef);
                    if (!initialSnapshotDone) {
                        processProjectsSnapshot(snap);
                    }
                } catch (err) {
                    console.error('[materials_purchasing] getDocs fallback error:', err);
                    appData.isLoadingProjects = false;
                    if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                        appData.renderInstitutions();
                    }
                }
            }, 5000);

            // Real-time Firestore sync
            try {
                onSnapshot(projectsRef, processProjectsSnapshot, (err) => {
                    console.error('[materials_purchasing] onSnapshot error:', err);
                    if (!initialSnapshotDone) {
                        getDocs(projectsRef).then(snap => processProjectsSnapshot(snap)).catch(e => {
                            console.error('[materials_purchasing] fallback getDocs failed:', e);
                            appData.isLoadingProjects = false;
                            if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                                appData.renderInstitutions();
                            }
                        });
                    }
                });
            } catch (err) {
                console.error('[materials_purchasing] onSnapshot setup error:', err);
            }

            // Listen for institution logos
            onSnapshot(doc(db, 'material_settings', 'institution_logos'), (docSnap) => {
                if (docSnap.exists()) {
                    appData.institutionLogos = docSnap.data() || {};
                    try { localStorage.setItem('material_institution_logos', JSON.stringify(appData.institutionLogos)); } catch(e){}
                    if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                        appData.renderInstitutions();
                    }
                }
            }, (e) => console.warn('institution_logos sync issue:', e));
            
            // Listen for institution details
            onSnapshot(doc(db, 'material_settings', 'institution_details'), (docSnap) => {
                if (docSnap.exists()) {
                    appData.institutionDetails = docSnap.data() || {};
                    try { localStorage.setItem('material_institution_details', JSON.stringify(appData.institutionDetails)); } catch(e){}
                    if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                        appData.renderInstitutions();
                    }
                }
            }, (e) => console.warn('institution_details sync issue:', e));
            
            // Listen for registered shops
            onSnapshot(doc(db, 'material_settings', 'registered_shops'), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data && data.shops && Array.isArray(data.shops)) {
                        appData.registeredShops = data.shops;
                        try { localStorage.setItem('material_registered_shops', JSON.stringify(appData.registeredShops)); } catch(e){}
                    }
                }
            }, (e) => console.warn('registered_shops sync issue:', e));
        }

        onAuthStateChanged(auth, async (user) => {
            const urlParams = new URLSearchParams(window.location.search);
            const paramProjId = urlParams.get('projectId');
            const paramMode = urlParams.get('mode');
            const isPublicView = Boolean(paramProjId && paramMode === 'view');

            if (!user) {
                if (isPublicView) {
                    // Allow unauthenticated guest access for Read-Only shared link
                    appData.isReadOnly = true;
                    document.body.style.setProperty('display', 'flex', 'important');
                    
                    document.body.classList.add('no-sidebar');
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.style.display = 'none';
                    
                    // Update Topbar UI for Guest
                    const userNameEl = document.getElementById('userName');
                    const userAvatarEl = document.getElementById('userAvatar');
                    const userRoleBadge = document.getElementById('userRoleBadge');
                    if (userNameEl) userNameEl.innerText = 'ผู้เข้าชมทั่วไป (Guest)';
                    if (userAvatarEl) userAvatarEl.innerText = '👁️';
                    if (userRoleBadge) {
                        userRoleBadge.innerText = 'View Only';
                        userRoleBadge.className = 'role-badge bg-amber-100 text-amber-800 border border-amber-200';
                    }
                    
                    // Replace Logout button with Login button
                    const logoutBtn = document.querySelector('.btn-logout');
                    if (logoutBtn) {
                        logoutBtn.onclick = () => window.location.href = '../../index.html';
                        logoutBtn.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                <polyline points="10 17 15 12 10 7"></polyline>
                                <line x1="15" y1="12" x2="3" y2="12"></line>
                            </svg>
                            <span class="btn-logout-text">เข้าสู่ระบบ</span>
                        `;
                    }

                    // Start Firestore sync for Guest
                    setupFirestoreSync();
                } else {
                    window.location.href = '../../index.html';
                    return;
                }
            } else {
                // Immediately start Firestore sync in parallel with profile load
                setupFirestoreSync();

                // Show body right away if cached profile exists
                document.body.style.setProperty('display', 'flex', 'important');

                // Load user profile in background
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (!snap.exists()) {
                        await signOut(auth);
                        window.location.href = '../../index.html?msg=deleted';
                        return;
                    }
                    const userData = snap.data();
                    if (userData.status === 'pending') {
                        await signOut(auth);
                        window.location.href = '../../index.html?msg=pending';
                        return;
                    } else if (userData.status === 'rejected') {
                        await signOut(auth);
                        window.location.href = '../../index.html?msg=rejected';
                        return;
                    }

                    if (window.checkPageAccess && !window.checkPageAccess(userData)) return;

                    appData.currentUserId = user.uid;
                    appData.currentUserRole = userData.role || 'user';

                    // Update Topbar User UI
                    const resolvedName = userData.displayName 
                        || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : '') 
                        || userData.name 
                        || userData.username 
                        || user.displayName 
                        || user.email 
                        || 'ผู้ใช้งาน';
                    const userNameEl = document.getElementById('userName');
                    const userAvatarEl = document.getElementById('userAvatar');
                    const userRoleBadge = document.getElementById('userRoleBadge');
                    if (userNameEl) userNameEl.textContent = resolvedName;
                    if (userAvatarEl) userAvatarEl.textContent = resolvedName.charAt(0).toUpperCase();
                    if (userRoleBadge) {
                        const r = userData.role || 'user';
                        userRoleBadge.textContent = r === 'admin' ? 'Administrator' : (r.charAt(0).toUpperCase() + r.slice(1));
                        userRoleBadge.className = `role-badge ${r}`;
                    }

                    // Cache profile for fast subsequent page loads
                    try {
                        localStorage.setItem('mentra_cached_user_profile', JSON.stringify({
                            ...userData,
                            displayName: resolvedName
                        }));
                    } catch(e) {}

                    if (!document.getElementById('view-institutions').classList.contains('hidden')) {
                        appData.renderInstitutions();
                    }
                } catch (e) {
                    console.warn('User load issue:', e);
                }
            }
            });

            window.recompressImage = function(base64Str, maxWidth = 800, quality = 0.5) {
                return new Promise((resolve) => {
                    if (!base64Str || !base64Str.startsWith('data:image')) {
                        resolve(base64Str);
                        return;
                    }
                    const img = new Image();
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxWidth) {
                                width = Math.round((width * maxWidth) / height);
                                height = maxWidth;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        
                        // Fill white background to prevent transparent areas turning black in JPEG
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    img.onerror = () => resolve(base64Str);
                    img.src = base64Str;
                });
            };

            window.driveIntegration = {
                _folderCache: {},
                async getOrCreateFolder(folderName, parentFolderId) {
                    if (!window.GAS_URL) throw new Error("GAS_URL not configured");
                    const cacheKey = `${folderName}_${parentFolderId || 'root'}`;
                    if (this._folderCache[cacheKey]) {
                        return this._folderCache[cacheKey];
                    }
                    const res = await fetch(window.GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: 'createFolder', folderName, parentFolderId })
                    });
                    const data = await res.json();
                    if (data.status === 'error') throw new Error(data.message);
                    this._folderCache[cacheKey] = data.folderId;
                    return data.folderId;
                },
                async uploadImage(base64, filename, folderId) {
                    if (!window.GAS_URL) throw new Error("GAS_URL not configured");
                    const base64Data = base64.split(',')[1] || base64;
                    const res = await fetch(window.GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: 'legacyUpload', base64: base64Data, filename, folderId, mimeType: 'image/jpeg' })
                    });
                    const data = await res.json();
                    if (data.status === 'error') throw new Error(data.message);
                    return `https://drive.google.com/uc?id=${data.fileId}`;
                },
                async uploadFileDirect(fileOrBlob, filename, folderId, onProgress) {
                    if (!window.GAS_URL) throw new Error("GAS_URL not configured");
                    
                    // 1. Convert to base64
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const res = e.target.result;
                            const pureBase64 = res.includes(',') ? res.split(',')[1] : res;
                            resolve(pureBase64);
                        };
                        reader.onerror = err => reject(err);
                        reader.readAsDataURL(fileOrBlob);
                    });

                    if (typeof onProgress === 'function') {
                        onProgress(15, Math.round(fileOrBlob.size * 0.15), fileOrBlob.size, 'กำลังส่งข้อมูลไปยัง Google Drive...');
                    }

                    // 2. Upload via XHR to GAS URL with real-time stream progress
                    return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', window.GAS_URL, true);
                        xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
                        xhr.timeout = 75000; // 75s timeout

                        let smoothTimer = null;
                        let currentPct = 15;

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable && e.total > 0) {
                                const streamPct = Math.round((e.loaded / e.total) * 100);
                                currentPct = Math.min(85, Math.round(15 + (streamPct * 0.70)));
                                const sentBytes = Math.min(fileOrBlob.size, Math.round((e.loaded / e.total) * fileOrBlob.size));
                                if (typeof onProgress === 'function') {
                                    onProgress(currentPct, sentBytes, fileOrBlob.size, `กำลังส่งข้อมูล... ${currentPct}%`);
                                }
                            }
                        };

                        xhr.onload = () => {
                            if (smoothTimer) clearInterval(smoothTimer);
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    const data = JSON.parse(xhr.responseText);
                                    if (data.status === 'error') {
                                        reject(new Error(data.message || 'Google Drive error'));
                                        return;
                                    }
                                    if (typeof onProgress === 'function') {
                                        onProgress(100, fileOrBlob.size, fileOrBlob.size, 'บันทึกสำเร็จ!');
                                    }
                                    resolve(data.fileUrl || `https://drive.google.com/uc?id=${data.fileId}`);
                                } catch (parseErr) {
                                    reject(new Error('Invalid response from Google Drive: ' + xhr.responseText.slice(0, 100)));
                                }
                            } else {
                                reject(new Error('Upload failed with status: ' + xhr.status));
                            }
                        };

                        xhr.onerror = () => {
                            if (smoothTimer) clearInterval(smoothTimer);
                            reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive'));
                        };

                        xhr.ontimeout = () => {
                            if (smoothTimer) clearInterval(smoothTimer);
                            reject(new Error('การเชื่อมต่อ Google Drive หมดเวลา (Timeout)'));
                        };

                        // When stream finishes, tick 85% -> 96% so UI is lively while Drive writes
                        xhr.upload.onload = () => {
                            currentPct = 85;
                            if (typeof onProgress === 'function') {
                                onProgress(85, fileOrBlob.size, fileOrBlob.size, 'Google Drive กำลังประมวลผล...');
                            }
                            smoothTimer = setInterval(() => {
                                if (currentPct < 96) {
                                    currentPct++;
                                    if (typeof onProgress === 'function') {
                                        onProgress(currentPct, fileOrBlob.size, fileOrBlob.size, 'กำลังบันทึกไฟล์...');
                                    }
                                }
                            }, 400);
                        };

                        const payload = JSON.stringify({
                            action: 'legacyUpload',
                            base64: base64Data,
                            filename: filename,
                            folderId: folderId,
                            mimeType: fileOrBlob.type || 'application/octet-stream'
                        });

                        xhr.send(payload);
                    });
                },
                async uploadImageResumable(blob, filename, targetFolderId, onProgress) {
                    // Forward directly to high-speed uploadFileDirect
                    return this.uploadFileDirect(blob, filename, targetFolderId, onProgress);
                },
                async deleteFile(fileId) {
                    if (!window.GAS_URL) return;
                    await fetch(window.GAS_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'deleteFile', fileId })
                    });
                }
            };

            // Make global Firebase save methods available to appData
            window.saveProjectToFirestore = async function(projData) {
                try {
                    let cleanedData = JSON.parse(JSON.stringify(projData)); // Ensure no undefined or proxies
                    if (cleanedData.company && cleanedData.institution && cleanedData.company === cleanedData.institution) {
                        cleanedData.company = '';
                    }
                    if (cleanedData.shop && cleanedData.institution && cleanedData.shop === cleanedData.institution) {
                        cleanedData.shop = '';
                    }

                    // Clean any temporary/optimistic blob: or data: URLs before saving to Firebase
                    if (cleanedData.items) {
                        const isArr = Array.isArray(cleanedData.items);
                        const itemList = isArr ? cleanedData.items : Object.values(cleanedData.items);
                        for (let item of itemList) {
                            if (item.images && Array.isArray(item.images)) {
                                item.images = item.images.filter(img => typeof img === 'string' && !img.startsWith('blob:'));
                            }
                            if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('blob:')) {
                                item.imageUrl = '';
                            }
                        }
                    }

                    let sizeBytes = new Blob([JSON.stringify(cleanedData)]).size;
                    
                    // Emergency compression if document approaches 1MB Firebase limit
                    if (sizeBytes > 900000) {
                        for (let item of cleanedData.items) {
                            if (item.images && item.images.length > 0) {
                                for (let i = 0; i < item.images.length; i++) {
                                    if (item.images[i] && item.images[i].length > 50000) {
                                        item.images[i] = await window.recompressImage(item.images[i], 800, 0.5);
                                    }
                                }
                            }
                            if (item.imageUrl && item.imageUrl.length > 50000) {
                                item.imageUrl = await window.recompressImage(item.imageUrl, 800, 0.5);
                            }
                        }
                    }
                    
                    await setDoc(doc(db, 'material_projects', cleanedData.id), cleanedData);
                } catch (e) {
                    console.error("Firebase Save Error:", e);
                    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่\nสาเหตุ: ' + e.message);
                }
            };

            window.deleteProjectFromFirestore = async function(projectId) {
                try {
                    await deleteDoc(doc(db, 'material_projects', projectId));
                } catch (e) {
                    console.error("Firebase Delete Error:", e);
                    alert('เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่');
                }
            };

            window.deleteInstitutionFromFirestore = async function(instName) {
                try {
                    await setDoc(doc(db, 'material_settings', 'institution_logos'), {
                        [instName]: deleteField()
                    }, { merge: true });
                } catch (e) {
                    console.error("Firebase Delete Institution Error:", e);
                }
            };
            
            window.saveInstitutionLogoToFirestore = async function(instName, logoUrl) {
                try {
                    await setDoc(doc(db, 'material_settings', 'institution_logos'), {
                        [instName]: logoUrl
                    }, { merge: true });
                } catch (e) {
                    console.error("Firebase Save Logo Error:", e);
                }
            };
            
            window.saveInstitutionDetailsToFirestore = async function(detailsObj) {
                try {
                    await setDoc(doc(db, 'material_settings', 'institution_details'), detailsObj);
                } catch (e) {
                    console.error("Firebase Save Inst Details Error:", e);
                }
            };
            
            window.saveShopToFirestore = async function(shopsArray) {
                try {
                    await setDoc(doc(db, 'material_settings', 'registered_shops'), {
                        shops: shopsArray
                    }, { merge: true });
                } catch (e) {
                    console.error("Firebase Save Shop Error:", e);
                }
            };