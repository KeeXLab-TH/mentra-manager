        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
        import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
        import {
            initializeFirestore, collection, doc, addDoc, updateDoc, getDocs,
            getDoc, query, orderBy, where, setDoc, deleteDoc, Timestamp,
            persistentLocalCache, persistentMultipleTabManager
        } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // ---- LOAD CONFIG ----
        let FIREBASE_CONFIG, GAS_URL, DRIVE_ROOT_FOLDER_ID;
        try {
            const cfg = await import('./firebase-config.js');
            FIREBASE_CONFIG = cfg.FIREBASE_CONFIG || cfg.default?.FIREBASE_CONFIG;
            GAS_URL = cfg.GAS_URL || cfg.default?.GAS_URL;
            DRIVE_ROOT_FOLDER_ID = cfg.DRIVE_ROOT_FOLDER_ID || cfg.default?.DRIVE_ROOT_FOLDER_ID;
        } catch (e) {
            console.warn('firebase-config.js not found, using defaults');
        }

        // Fallback
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
        if (!GAS_URL) {
            GAS_URL = 'https://script.google.com/macros/s/AKfycbwRIcnykIL630Op5cf6qWO_zpbkzqYfY_pDEyOf0vA_cpaxio9Gu813nfxuuufHhZXW/exec';
        }
        if (!DRIVE_ROOT_FOLDER_ID) {
            DRIVE_ROOT_FOLDER_ID = '1a0B6l56PAVCZ4v8lzSeIRslq78XSJh8e';
        }

        window.GAS_URL = GAS_URL;
        window.DRIVE_ROOT_FOLDER_ID = DRIVE_ROOT_FOLDER_ID;
        
        const app = initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            experimentalForceLongPolling: false
        });
        
        window.app = app;
        window.auth = auth;
        window.db = db;

        // ---- STATE ----
        let currentUser = null;
        let currentUserData = null;
        let allProjects = [];
        let currentProjectId = null;
        let currentProjectData = null;
        let editingProjectId = null;
        let seqCountCache = {};
        let currentProjectFiles = [];
        
        window.getCurrentUserData = () => currentUserData;

        // ---- TOAST ----
        window.showToast = function (msg, type = 'success') {
            const el = document.getElementById('toast');
            const icon = { success: 'โ…', error: 'โ', warning: 'โ ๏ธ', info: 'โน๏ธ' }[type] || 'โน๏ธ';
            document.getElementById('toastIcon').textContent = icon;
            document.getElementById('toastMsg').textContent = msg;
            el.className = `toast show ${type}`;
            setTimeout(() => el.className = 'toast', 3500);
        };

        // ---- AUTH GUARD ----
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            currentUser = user;
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                currentUserData = snap.data();
            } else {
                alert('เนเธกเนเธเธเธเธฑเธเธเธตเธเธนเนเนเธเนเธเธตเนเนเธเธฃเธฐเธเธ เธซเธฃเธทเธญเธเธฑเธเธเธตเธเธญเธเธเธธเธ“เธ–เธนเธเธฅเธเนเธฅเนเธง');
                await signOut(auth);
                window.location.href = 'index.html?msg=deleted';
                return;
            }

            // Check approval status
            const userStatus = currentUserData.status || 'approved'; // default old users to approved
            if (userStatus === 'pending') {
                alert('เธเธฑเธเธเธตเธเธญเธเธเธธเธ“เธญเธขเธนเนเธฃเธฐเธซเธงเนเธฒเธเธเธฒเธฃเธฃเธญเธญเธเธธเธกเธฑเธ•เธดเธชเธดเธ—เธเธดเนเน€เธเนเธฒเนเธเนเธเธฒเธเธเธฒเธเธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ');
                await signOut(auth);
                window.location.href = 'index.html?msg=pending';
                return;
            } else if (userStatus === 'rejected') {
                alert('เธเธฑเธเธเธตเธเธญเธเธเธธเธ“เนเธ”เนเธฃเธฑเธเธเธฒเธฃเธเธเธดเน€เธชเธเธชเธดเธ—เธเธดเนเน€เธเนเธฒเนเธเนเธเธฒเธเธฃเธฐเธเธ เธเธฃเธธเธ“เธฒเธ•เธดเธ”เธ•เนเธญเธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ');
                await signOut(auth);
                window.location.href = 'index.html?msg=rejected';
                return;
            }

            setupUI();
            
            // Show body now that the user is fully verified
            document.body.style.opacity = '1';
            document.body.style.pointerEvents = 'auto';
            
            // URL Param Routing
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view') || params.get('tab');
            if (viewParam && ['dashboard', 'projects', 'users', 'items'].includes(viewParam)) {
                navigateTo(viewParam);
            } else {
                loadDashboard();
            }
        });

        function setupUI() {
            const { displayName, role, firstName } = currentUserData;
            const initials = (firstName || displayName || 'U').charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = initials;
            document.getElementById('userName').textContent = displayName || firstName || '-';
            const badge = document.getElementById('userRoleBadge');
            badge.textContent = role === 'admin' ? 'Admin' : 'User';
            badge.className = `role-badge ${role}`;

            if (currentUserData.role === 'admin') {
                document.getElementById('adminMenu').style.display = 'block';
                document.getElementById('addProjectBtn').style.display = 'flex';
            }

            // Populate year dropdowns
            const currentYear = new Date().getFullYear() + 543;
            const yearSelects = [document.getElementById('filterYear'), document.getElementById('pYear'), document.getElementById('dashboardYearFilter')];
            yearSelects.forEach(sel => {
                if (!sel) return;
                if (sel.id === 'filterYear' || sel.id === 'dashboardYearFilter') {
                    sel.innerHTML = '<option value="">เธ—เธธเธเธเธต (เธ—เธฑเนเธเธซเธกเธ”)</option>';
                } else {
                    sel.innerHTML = '';
                }
                for (let y = currentYear + 1; y >= currentYear - 5; y--) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = `เธ.เธจ. ${y}`;
                    if (sel.id === 'pYear') { opt.selected = y === currentYear; }
                    sel.appendChild(opt);
                }
            });
        }

        // ---- LOGOUT ----
        window.handleLogout = async function () {
            await signOut(auth);
            window.location.href = 'index.html';
        };

        // ---- NAVIGATION ----
        window.navigateTo = function (page) {
            document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(`view-${page}`).classList.add('active');
            const navEl = document.getElementById(`nav-${page}`);
            if (navEl) navEl.classList.add('active');

            const titles = {
                dashboard: ['Dashboard', 'เธ เธฒเธเธฃเธงเธกเธฃเธฐเธเธเธ—เธฑเนเธเธซเธกเธ”'],
                projects: ['เนเธเธฃเธเธเธฒเธฃเธ—เธฑเนเธเธซเธกเธ”', 'เธเธฑเธ”เธเธฒเธฃเนเธเธฃเธเธเธฒเธฃเนเธฅเธฐเธเธเธเธฃเธฐเธกเธฒเธ“'],
                users: ['เธเธฑเธ”เธเธฒเธฃเธเธนเนเนเธเนเธเธฒเธ', 'เธฃเธฒเธขเธเธทเนเธญเธชเธกเธฒเธเธดเธเนเธเธฃเธฐเธเธ'],
                items: ['เธฃเธฒเธเธฒเธ—เธธเธ / เธชเธดเนเธเธเธญเธ', 'เธฃเธฒเธเธฒเธ—เธธเธเธชเธดเนเธเธเธญเธเธ•เธฒเธกเนเธเธฃเธเธเธฒเธฃ'],
                detail: ['เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เนเธเธฃเธเธเธฒเธฃ', currentProjectData?.projectName || ''],
                quotation: ['เนเธเน€เธชเธเธญเธฃเธฒเธเธฒ', 'เธชเธฃเนเธฒเธเนเธฅเธฐเธเธดเธกเธเนเนเธเน€เธชเธเธญเธฃเธฒเธเธฒ'],
                training: ['เธฃเธฐเธเธเธเธฑเธ”เธญเธเธฃเธก', 'เธฃเธฐเธเธเธ•เธฒเธฃเธฒเธเนเธฅเธฐเธเธฑเธ”เธเธฒเธฃเธญเธเธฃเธกเธ เธฒเธขเธเธญเธ']
            };
            const [title, sub] = titles[page] || ['Mentra Manager', ''];
            document.getElementById('pageTitle').textContent = title;
            document.getElementById('pageSubtitle').textContent = sub;
            
            if (page === 'quotation' && window.initQuotationView && !window.quotationInitialized) {
                window.initQuotationView();
                window.quotationInitialized = true;
            }
            if (page === 'training' && window.initTrainingView && !window.trainingInitialized) {
                window.initTrainingView();
                window.trainingInitialized = true;
            }

            if (page === 'projects') loadProjects();
            if (page === 'users') loadUsers();
            if (page === 'dashboard') loadDashboard();
            if (page === 'items') loadItemsPage();
            closeSidebar();
        };

        // ---- LOAD DASHBOARD ----
        async function loadDashboard() {
            document.getElementById('recentProjectBody').innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px;"><div class="btn-spinner" style="display:inline-block; border-color:var(--blue); border-bottom-color:transparent; width:24px; height:24px; margin-bottom:12px;"></div><div style="color:var(--text-muted); font-size:14px;">เธเธณเธฅเธฑเธเนเธซเธฅเธ”เนเธเธฃเธเธเธฒเธฃ...</div></td></tr>`;
            const snap = await getDocs(collection(db, 'projects'));
            const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            allProjects = projects;

            const dashYearFilter = document.getElementById('dashboardYearFilter');
            let year = dashYearFilter.value;

            // Auto default to latest year on first load
            if (!dashYearFilter.dataset.initialized && projects.length > 0) {
                dashYearFilter.dataset.initialized = 'true';
                const maxYear = Math.max(...projects.map(p => Number(p.year) || 0));
                if (maxYear > 0) {
                    year = String(maxYear);
                    dashYearFilter.value = year;
                }
            }

            const filteredProjects = year ? projects.filter(p => String(p.year) === String(year)) : projects;

            const totalBudget = filteredProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0);

            // Show exact full budget number
            let budgetText = 'เธฟ' + totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const budgetEl = document.getElementById('statTotalBudget');
            budgetEl.textContent = budgetText;
            budgetEl.closest('.stat-card').title = '';
            budgetEl.closest('.stat-card').style.cursor = 'default';

            document.getElementById('statTotal').textContent = filteredProjects.length;
            document.getElementById('statActive').textContent = filteredProjects.filter(p => p.status === 'เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ').length;
            document.getElementById('statDone').textContent = filteredProjects.filter(p => p.status === 'เน€เธชเธฃเนเธเธชเธดเนเธ').length;
            document.getElementById('statPending').textContent = filteredProjects.filter(p => p.status === 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ').length;

            const recent = [...filteredProjects].sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1).slice(0, 5);
            renderProjectRows('recentProjectBody', recent, 6);
        }

        // ---- LOAD PROJECTS ----
        async function loadProjects() {
            document.getElementById('projectTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;"><div class="btn-spinner" style="display:inline-block; border-color:var(--blue); border-bottom-color:transparent; width:24px; height:24px; margin-bottom:12px;"></div><div style="color:var(--text-muted); font-size:14px;">เธเธณเธฅเธฑเธเนเธซเธฅเธ”เนเธเธฃเธเธเธฒเธฃเธ—เธฑเนเธเธซเธกเธ”...</div></td></tr>`;
            const snap = await getDocs(collection(db, 'projects'));
            let projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort client-side to prevent dropping projects without createdAt field
            projects.sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);
            allProjects = projects;
            // Also apply the filter if it was active
            window.filterProjects();
        }

        function renderProjectRows(bodyId, projects, cols) {
            const tbody = document.getElementById(bodyId);
            if (!projects.length) {
                tbody.innerHTML = `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">๐“</div><h3>เนเธกเนเธเธเนเธเธฃเธเธเธฒเธฃ</h3><p>เธขเธฑเธเนเธกเนเธกเธตเนเธเธฃเธเธเธฒเธฃเนเธเธฃเธฐเธเธ</p></div></td></tr>`;
                return;
            }
            tbody.innerHTML = projects.map(p => `
                <tr>
                    <td><span style="font-family:monospace; font-weight:700; color:var(--blue);">${p.projectNo || '-'}</span></td>
                    <td style="font-weight:600; max-width:200px;">${p.projectName || '-'}</td>
                    <td>${p.year || '-'}</td>
                    ${cols === 6 ? '' : `<td>${p.projectDate ? new Date(p.projectDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>`}
                    <td style="font-weight:600;">เธฟ${Number(p.budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td>${getStatusBadge(p.status)}</td>
                    ${cols === 6 ? '' : `<td style="max-width:140px; color:var(--text-muted); font-size:13px;">${p.note || '-'}</td>`}
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="openProjectDetail('${p.id}')">เธ”เธนเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”</button>
                        ${currentUserData?.role === 'admin' && cols === 8 ? `
                            <button class="btn btn-outline btn-sm" style="margin-left:6px;" onclick="openProjectModal('${p.id}')" title="เนเธเนเนเธ">โ๏ธ</button>
                            <button class="btn btn-danger btn-sm" style="margin-left:6px;" onclick="deleteProject('${p.id}')" title="เธฅเธ">๐—‘๏ธ</button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        }

        function getStatusBadge(status) {
            const configs = {
                'เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ': { cls: 'badge-orange', dot: true, icon: 'โก' },
                'เน€เธชเธฃเนเธเธชเธดเนเธ': { cls: 'badge-green', dot: false, icon: 'โ…' },
                'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ': { cls: 'badge-blue', dot: false, icon: 'โณ' },
                'เธขเธเน€เธฅเธดเธ': { cls: 'badge-red', dot: false, icon: 'โ' },
            };
            const cfg = configs[status] || { cls: 'badge-gray', dot: false, icon: 'โ€ข' };
            const dot = `<span class="badge-dot"></span>`;
            return `<span class="badge ${cfg.cls}">${dot}${status || '-'}</span>`;
        }

        // ---- FILTER PROJECTS ----
        window.filterProjects = function () {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const year = document.getElementById('filterYear').value;
            const status = document.getElementById('filterStatus').value;
            const filtered = allProjects.filter(p => {
                const matchSearch = !search || p.projectName?.toLowerCase().includes(search) || p.projectNo?.toLowerCase().includes(search);
                const matchYear = !year || String(p.year) === String(year);
                const matchStatus = !status || p.status === status;
                return matchSearch && matchYear && matchStatus;
            });
            renderProjectRows('projectTableBody', filtered, 8);
        };

        // ---- PROJECT MODAL ----
        window.openProjectModal = async function (projectId = null) {
            editingProjectId = projectId;
            document.getElementById('projectModal').classList.add('show');
            document.getElementById('pNo').value = '';
            document.getElementById('pName').value = '';
            document.getElementById('pBudget').value = '';
            document.getElementById('pNote').value = '';
            document.getElementById('pLocation').value = '';
            document.getElementById('pStatus').value = 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ';
            document.getElementById('pDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('pFileInput').value = '';
            document.getElementById('pUploadProgress').style.display = 'none';

            if (projectId) {
                document.getElementById('projectModalTitle').textContent = 'เนเธเนเนเธเนเธเธฃเธเธเธฒเธฃ';
                const snap = await getDoc(doc(db, 'projects', projectId));
                if (snap.exists()) {
                    const p = snap.data();
                    document.getElementById('pYear').value = p.year || '';
                    document.getElementById('pNo').value = p.projectNo || '';
                    document.getElementById('pName').value = p.projectName || '';
                    document.getElementById('pBudget').value = p.budget || '';
                    document.getElementById('pStatus').value = p.status || 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ';
                    document.getElementById('pNote').value = p.note || '';
                    document.getElementById('pLocation').value = p.location || '';
                    document.getElementById('pDate').value = p.projectDate || new Date().toISOString().split('T')[0];
                }
            } else {
                document.getElementById('projectModalTitle').textContent = 'เธชเธฃเนเธฒเธเนเธเธฃเธเธเธฒเธฃเนเธซเธกเน';
            }
        };

        window.closeProjectModal = function () {
            document.getElementById('projectModal').classList.remove('show');
            editingProjectId = null;
        };

        // ---- GENERATE PROJECT NO ----
        window.generateProjectNo = async function () {
            const year = document.getElementById('pYear').value;
            if (!year) { showToast('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธเธตเธเนเธญเธ', 'warning'); return; }

            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yyyy = String(now.getFullYear());

            // Get next sequence for this year
            const snap = await getDocs(query(collection(db, 'projects'), where('year', '==', Number(year))));
            const seq = String(snap.size + 1).padStart(3, '0');
            const projectNo = `MT${dd}${mm}${yyyy}-${seq}`;
            document.getElementById('pNo').value = projectNo;
        };

        // ---- UPLOAD FILE FROM CREATION MODAL ----
        async function uploadProjectFileInModal(file, projectId, projectNo, projectName) {
            const progressEl = document.getElementById('pUploadProgress');
            const fillEl = document.getElementById('pUploadFill');
            const fileNameEl = document.getElementById('pUploadFilename');
            const percentEl = document.getElementById('pUploadPercent');

            progressEl.style.display = 'block';
            fileNameEl.textContent = file.name;
            percentEl.textContent = '0%';
            fillEl.style.width = '0%';

            if (!GAS_URL) {
                progressEl.style.display = 'none';
                throw new Error('GAS_URL เนเธกเนเนเธ”เนเธฃเธฑเธเธเธฒเธฃเธ•เธฑเนเธเธเนเธฒ');
            }

            // 1. เธชเธฃเนเธฒเธ folder เนเธ Drive
            let folderId = null;
            const folderName = `${projectNo}_${projectName}`;
            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'createFolder',
                        folderName,
                        parentFolderId: DRIVE_ROOT_FOLDER_ID || '',
                    }),
                    redirect: 'follow'
                });
                const result = await res.json();
                if (result.folderId) {
                    await updateDoc(doc(db, 'projects', projectId), { folderId: result.folderId, folderCreated: true });
                    folderId = result.folderId;
                }
            } catch (e) {
                console.error('Failed to create folder:', e);
            }
            if (!folderId) folderId = DRIVE_ROOT_FOLDER_ID || null;

            // 2. เธเธญ OAuth Token เธเธฒเธ GAS
            try {
                const gasRes = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'getUploadUrl',
                        filename: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        folderId: folderId
                    }),
                    redirect: 'follow'
                });
                const gasResult = await gasRes.json();

                if (gasResult.status !== 'success' || !gasResult.token) {
                    throw new Error(gasResult.message || 'GAS เนเธกเนเธชเนเธ token');
                }

                // 3. Browser เธชเธฃเนเธฒเธ resumable upload session เธ•เธฃเธเธเธฑเธ Drive API
                const uploadMimeType = file.type || 'application/octet-stream';
                const initRes = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + gasResult.token,
                            'Content-Type': 'application/json',
                            'X-Upload-Content-Type': uploadMimeType,
                            'X-Upload-Content-Length': file.size
                        },
                        body: JSON.stringify({
                            name: file.name,
                            parents: [folderId],
                            mimeType: uploadMimeType
                        })
                    }
                );

                if (!initRes.ok) {
                    const errText = await initRes.text();
                    throw new Error('Drive API error ' + initRes.status);
                }

                const uploadUrl = initRes.headers.get('Location');
                if (!uploadUrl) throw new Error('Drive API เนเธกเนเธชเนเธ upload URL');

                // 4. PUT เนเธเธฅเนเธ•เธฃเธเนเธ Drive เธเธฃเนเธญเธก progress bar
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl, true);
                    xhr.setRequestHeader('Content-Type', uploadMimeType);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const pct = Math.round((e.loaded / e.total) * 100);
                            fillEl.style.width = pct + '%';
                            percentEl.textContent = pct + '%';
                        }
                    };

                    xhr.onload = async () => {
                        if (xhr.status === 200 || xhr.status === 201) {
                            fillEl.style.width = '100%';
                            percentEl.textContent = '100%';
                            let driveResponse;
                            try { driveResponse = JSON.parse(xhr.responseText); } catch { driveResponse = {}; }

                            const fileData = {
                                name: file.name,
                                url: `https://drive.google.com/file/d/${driveResponse.id}/view`,
                                fileId: driveResponse.id,
                                uploadedAt: new Date().toISOString()
                            };
                            await updateDoc(doc(db, 'projects', projectId), {
                                files: arrayUnion(fileData)
                            });
                            resolve();
                        } else {
                            reject(new Error('เธญเธฑเธเนเธซเธฅเธ”เธฅเนเธกเน€เธซเธฅเธง Status: ' + xhr.status));
                        }
                    };

                    xhr.onerror = () => reject(new Error('เน€เธเธฃเธทเธญเธเนเธฒเธขเธเธดเธ”เธเธฅเธฒเธ”'));
                    xhr.send(file);
                });

                showToast('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธชเธณเน€เธฃเนเธ');
                setTimeout(() => {
                    progressEl.style.display = 'none';
                    const fi = document.getElementById('fileInput');
                    if (fi) fi.value = '';
                }, 1000);

            } catch (err) {
                progressEl.style.display = 'none';
                console.error('Upload error:', err);
                throw new Error('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธฅเนเธกเน€เธซเธฅเธง: ' + err.message);
            }
        }

        // ---- SAVE PROJECT ----
        window.saveProject = async function () {
            const year = document.getElementById('pYear').value;
            const projectNo = document.getElementById('pNo').value.trim();
            const projectName = document.getElementById('pName').value.trim();
            const budget = parseFloat(document.getElementById('pBudget').value) || 0;
            const status = document.getElementById('pStatus').value;
            const note = document.getElementById('pNote').value.trim();
            const projectDate = document.getElementById('pDate').value;
            const location = document.getElementById('pLocation').value.trim();

            if (!year || !projectNo || !projectName || !projectDate) {
                showToast('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเธ—เธตเนเธเธณเน€เธเนเธเนเธซเนเธเธฃเธ', 'warning');
                return;
            }

            const btn = document.getElementById('saveProjectBtn');
            btn.disabled = true;
            btn.textContent = 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...';

            const data = {
                year: Number(year),
                projectNo,
                projectName,
                budget,
                status,
                note,
                location,
                projectDate,
                updatedAt: new Date().toISOString(),
            };

            try {
                // เธ•เธฃเธงเธเธชเธญเธเธเธงเธฒเธกเธเนเธณเธเนเธญเธเธเธญเธเน€เธฅเธเธ—เธตเนเนเธเธฃเธเธเธฒเธฃ
                const dupNoQuery = query(collection(db, 'projects'), where('projectNo', '==', projectNo));
                const dupNoSnap = await getDocs(dupNoQuery);
                let duplicateNo = false;
                dupNoSnap.forEach(d => {
                    if (!editingProjectId || d.id !== editingProjectId) {
                        duplicateNo = true;
                    }
                });
                if (duplicateNo) {
                    throw new Error('เน€เธฅเธเธ—เธตเนเนเธเธฃเธเธเธฒเธฃเธเนเธณเธเธฑเธ เธซเนเธฒเธกเธชเธฃเนเธฒเธเธเนเธณ');
                }

                // เธ•เธฃเธงเธเธชเธญเธเธเธงเธฒเธกเธเนเธณเธเนเธญเธเธเธญเธเธเธทเนเธญเนเธเธฃเธเธเธฒเธฃ
                const dupNameQuery = query(collection(db, 'projects'), where('projectName', '==', projectName));
                const dupNameSnap = await getDocs(dupNameQuery);
                let duplicateName = false;
                dupNameSnap.forEach(d => {
                    if (!editingProjectId || d.id !== editingProjectId) {
                        duplicateName = true;
                    }
                });
                if (duplicateName) {
                    throw new Error('เธเธทเนเธญเนเธเธฃเธเธเธฒเธฃเธเนเธณเธเธฑเธ เธซเนเธฒเธกเธชเธฃเนเธฒเธเธเนเธณ');
                }

                let projectId = editingProjectId;
                if (editingProjectId) {
                    await updateDoc(doc(db, 'projects', editingProjectId), data);
                    showToast('เนเธเนเนเธเนเธเธฃเธเธเธฒเธฃเธชเธณเน€เธฃเนเธ');
                } else {
                    data.createdAt = new Date().toISOString();
                    data.createdBy = currentUser.uid;
                    data.folderCreated = false;
                    const docRef = await addDoc(collection(db, 'projects'), data);
                    projectId = docRef.id;
                    showToast('เธชเธฃเนเธฒเธเนเธเธฃเธเธเธฒเธฃเธชเธณเน€เธฃเนเธ');
                }

                // Document direct upload inside modal
                const file = document.getElementById('pFileInput').files[0];
                if (file) {
                    btn.textContent = 'เธเธณเธฅเธฑเธเธชเนเธเนเธเธฅเนเน€เธญเธเธชเธฒเธฃ...';
                    await uploadProjectFileInModal(file, projectId, projectNo, projectName);
                    showToast('เธญเธฑเธเนเธซเธฅเธ”เน€เธญเธเธชเธฒเธฃเนเธเธเนเธเธฃเธเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธข');
                }

                closeProjectModal();
                loadProjects();
                loadDashboard();
            } catch (e) {
                showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> เธเธฑเธเธ—เธถเธเนเธเธฃเธเธเธฒเธฃ`;
            }
        };

        // ---- DELETE PROJECT ----
        window.deleteProject = async function (projectId) {
            if (!confirm('เธเธธเธ“เนเธเนเนเธเธซเธฃเธทเธญเนเธกเนเธ—เธตเนเธเธฐเธฅเธเนเธเธฃเธเธเธฒเธฃเธเธตเน? เธเธฒเธฃเธฅเธเธเธตเนเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธขเนเธญเธเธเธทเธเนเธ”เน')) {
                return;
            }
            try {
                await deleteDoc(doc(db, 'projects', projectId));
                showToast('เธฅเธเนเธเธฃเธเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง');
                // If we are currently viewing this project's details, go back to projects view
                if (currentProjectId === projectId) {
                    currentProjectId = null;
                    currentProjectData = null;
                    navigateTo('projects');
                } else {
                    loadProjects();
                    loadDashboard();
                }
            } catch (e) {
                showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธฅเธ: ' + e.message, 'error');
            }
        };

        // ---- PROJECT DETAIL ----
        window.openProjectDetail = async function (projectId) {
            currentProjectId = projectId;
            const snap = await getDoc(doc(db, 'projects', projectId));
            if (!snap.exists()) return;
            currentProjectData = { id: projectId, ...snap.data() };

            document.getElementById('detailProjectName').textContent = currentProjectData.projectName;
            document.getElementById('detailProjectNo').textContent = `เน€เธฅเธเธ—เธตเน: ${currentProjectData.projectNo}`;

            // Info grid
            document.getElementById('projectInfoGrid').innerHTML = `
                <div class="info-block">
                    <div class="info-label">เธเธตเธเธเธเธฃเธฐเธกเธฒเธ“</div>
                    <div class="info-value">เธ.เธจ. ${currentProjectData.year || '-'}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">เธงเธฑเธเน€เธ”เธทเธญเธเธเธต</div>
                    <div class="info-value">${currentProjectData.projectDate ? new Date(currentProjectData.projectDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">เธเธเธเธฃเธฐเธกเธฒเธ“</div>
                    <div class="info-value">เธฟ${Number(currentProjectData.budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">เธฃเธฒเธเธฒเธ—เธธเธเธฃเธงเธก (เธฃเธฒเธขเธเธฒเธฃ)</div>
                    <div class="info-value" style="color:var(--danger);">เธฟ${Number(currentProjectData.totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">เธชเธ–เธฒเธเธฐ</div>
                    <div class="info-value">${getStatusBadge(currentProjectData.status)}</div>
                </div>
                <div class="info-block" style="grid-column: 1 / -1;">
                    <div class="info-label">๐“ เธชเธ–เธฒเธเธ—เธตเนเธ”เธณเน€เธเธดเธเนเธเธฃเธเธเธฒเธฃ</div>
                    <div class="info-value" style="font-size: 14px; font-weight: 500;">${currentProjectData.location || '<span style="color:var(--text-muted); font-weight:400;">-</span>'}</div>
                </div>
            `;

            document.getElementById('projectExtraInfo').innerHTML = currentProjectData.note
                ? `<div style="background:var(--bg); border-radius:12px; padding:16px; font-size:14px; line-height:1.7;">${currentProjectData.note}</div>`
                : '<div style="color:var(--text-muted); font-size:14px;">เนเธกเนเธกเธตเธซเธกเธฒเธขเน€เธซเธ•เธธ</div>';

            // Actions
            const actionsEl = document.getElementById('detailActions');
            actionsEl.innerHTML = `<span>${getStatusBadge(currentProjectData.status)}</span>`;
            if (currentUserData?.role === 'admin') {
                actionsEl.innerHTML += `<button class="btn btn-outline btn-sm" onclick="openProjectModal('${projectId}')">โ๏ธ เนเธเนเนเธ</button>`;
                actionsEl.innerHTML += `<button class="btn btn-danger btn-sm" onclick="deleteProject('${projectId}')">๐—‘๏ธ เธฅเธเนเธเธฃเธเธเธฒเธฃ</button>`;
            }

            // Load docs
            loadProjectFiles();
            loadProjectItems();
            navigateTo('detail');
        };

        // ---- LOAD FILES ----
        async function loadProjectFiles() {
            if (!GAS_URL || !currentProjectId) return;
            const listEl = document.getElementById('docFileList');
            listEl.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted);">เธเธณเธฅเธฑเธเนเธซเธฅเธ”เนเธเธฅเน...</div>';

            try {
                const folderId = await getOrCreateProjectFolder();
                if (!folderId) {
                    listEl.innerHTML = '<div class="empty-state" style="padding: 24px 12px;"><div class="empty-icon" style="font-size: 36px; margin-bottom: 8px;">โ ๏ธ</div><h3 style="font-size: 15px;">เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เนเธเธฅเนเนเธ”เน</h3><p style="font-size: 13px;">เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธชเธญเธเธเธฒเธฃเธ•เธฑเนเธเธเนเธฒ Google Apps Script</p></div>';
                    return;
                }

                const res = await fetch(`${GAS_URL}?t=${Date.now()}&folderId=${folderId}`);
                const files = await res.json();

                if (!files || !files.length) {
                    listEl.innerHTML = '<div class="empty-state" style="padding: 30px 16px;"><div class="empty-icon" style="font-size: 36px; margin-bottom: 8px;">๐“ญ</div><h3 style="font-size: 15px;">เธขเธฑเธเนเธกเนเธกเธตเน€เธญเธเธชเธฒเธฃเนเธเธ</h3><p style="font-size: 13px;">เธฅเธฒเธเนเธเธฅเนเธกเธฒเธงเธฒเธเธ”เนเธฒเธเธเธเน€เธเธทเนเธญเธญเธฑเธเนเธซเธฅเธ”เน€เธเนเธฒ Google Drive</p></div>';
                    currentProjectFiles = [];
                    return;
                }

                currentProjectFiles = files;
                listEl.innerHTML = files.map((f, idx) => {
                    let icon = '๐“';
                    if (f.mimeType?.includes('image')) icon = '๐–ผ๏ธ';
                    else if (f.mimeType?.includes('pdf')) icon = '๐“•';
                    else if (f.mimeType?.includes('spreadsheet') || f.mimeType?.includes('excel')) icon = '๐“';
                    else if (f.mimeType?.includes('presentation') || f.mimeType?.includes('powerpoint')) icon = '๐“ฝ๏ธ';
                    return `
                        <div class="file-list-item" onclick="openFileViewer(${idx})" style="cursor: pointer;">
                            <div class="file-type-icon">${icon}</div>
                            <div class="file-item-info">
                                <div class="file-item-name" style="font-weight: 600;">${f.name}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">เธเธฅเธดเธเน€เธเธทเนเธญเน€เธเธดเธ”เธ”เธนเธ•เธฑเธงเธญเธขเนเธฒเธเน€เธญเธเธชเธฒเธฃ</div>
                            </div>
                            <div style="display: flex; gap: 8px;" onclick="event.stopPropagation();">
                                <button class="btn btn-outline btn-sm" onclick="openFileViewer(${idx})">๐‘๏ธ เธ”เธนเธ•เธฑเธงเธญเธขเนเธฒเธ</button>
                                <a class="file-item-open" href="${f.webViewLink}" target="_blank">๐”— เน€เธเธดเธ”เธ เธฒเธขเธเธญเธ</a>
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (e) {
                listEl.innerHTML = '<div class="empty-state" style="padding: 24px 12px;"><div class="empty-icon" style="font-size: 36px; margin-bottom: 8px;">โ</div><h3 style="font-size: 15px;">เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”</h3><p style="font-size: 13px;">เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธฃเนเธเธฅเนเนเธ”เน</p></div>';
                currentProjectFiles = [];
            }
        }

        // ---- FILE PREVIEW VIEWER ----
        window.openFileViewer = function (idx) {
            const file = currentProjectFiles[idx];
            if (!file) return;

            const modal = document.getElementById('fileViewerModal');
            const fileNameEl = document.getElementById('viewerFileName');
            const fileIconEl = document.getElementById('viewerFileIcon');
            const extLinkEl = document.getElementById('viewerExternalLink');
            const iframe = document.getElementById('viewerIframe');
            const loader = document.getElementById('viewerLoader');

            // เธ•เธฑเนเธเธเนเธฒเธเนเธญเธกเธนเธฅเนเธเธฅเนเนเธ header
            fileNameEl.textContent = file.name;
            extLinkEl.href = file.webViewLink;

            let icon = '๐“';
            if (file.mimeType?.includes('image')) icon = '๐–ผ๏ธ';
            else if (file.mimeType?.includes('pdf')) icon = '๐“•';
            else if (file.mimeType?.includes('spreadsheet') || file.mimeType?.includes('excel')) icon = '๐“';
            else if (file.mimeType?.includes('presentation') || file.mimeType?.includes('powerpoint')) icon = '๐“ฝ๏ธ';
            fileIconEl.textContent = icon;

            // เนเธเธฅเธ Google Drive URL เน€เธเนเธ Preview Embed URL
            let previewUrl = file.webViewLink;
            const driveIdMatch = file.webViewLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
                previewUrl = `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
            } else {
                const openIdMatch = file.webViewLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (openIdMatch && openIdMatch[1]) {
                    previewUrl = `https://drive.google.com/file/d/${openIdMatch[1]}/preview`;
                }
            }

            // เนเธชเธ”เธ modal, loader, เนเธซเธฅเธ” iframe
            modal.classList.add('show');
            loader.style.display = 'flex';
            iframe.style.display = 'none';
            iframe.src = previewUrl;
        };

        window.onViewerIframeLoad = function () {
            const iframe = document.getElementById('viewerIframe');
            const loader = document.getElementById('viewerLoader');
            loader.style.display = 'none';
            iframe.style.display = 'block';
        };

        window.closeFileViewer = function () {
            const modal = document.getElementById('fileViewerModal');
            const iframe = document.getElementById('viewerIframe');
            modal.classList.remove('show');
            iframe.src = ''; // เธฃเธตเน€เธเนเธ• iframe เน€เธเธทเนเธญเธซเธขเธธเธ”เน€เธฅเนเธเธงเธดเธ”เธตเนเธญ/เน€เธชเธตเธขเธ/เธซเธฃเธทเธญเน€เธเธฅเธตเธขเธฃเนเธซเธเนเธงเธขเธเธงเธฒเธกเธเธณ
        };

        // ---- GET OR CREATE PROJECT FOLDER ----
        async function getOrCreateProjectFolder() {
            if (!currentProjectData) return null;

            // เธ–เนเธฒเธกเธต folderId เนเธฅเนเธง เนเธเนเน€เธฅเธข
            if (currentProjectData.folderId) return currentProjectData.folderId;

            if (!GAS_URL) return DRIVE_ROOT_FOLDER_ID || null;

            const folderName = `${currentProjectData.projectNo}_${currentProjectData.projectName}`;
            try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 30000);
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'createFolder',
                        folderName,
                        parentFolderId: DRIVE_ROOT_FOLDER_ID || '',
                    }),
                    redirect: 'follow',
                    signal: ctrl.signal
                });
                clearTimeout(tid);
                const text = await res.text();
                let result;
                try { result = JSON.parse(text); } catch { result = {}; }
                if (result.folderId) {
                    await updateDoc(doc(db, 'projects', currentProjectId), { folderId: result.folderId, folderCreated: true });
                    currentProjectData.folderId = result.folderId;
                    return result.folderId;
                }
            } catch (e) {
                console.error('Failed to create folder:', e);
            }
            return DRIVE_ROOT_FOLDER_ID || null;
        }

        // ---- FILE UPLOAD ----
        window.handleFileUpload = async function (file) {
            if (!file) return;

            const progressEl = document.getElementById('uploadProgress');
            const fillEl = document.getElementById('progressFill');
            const fileNameEl = document.getElementById('uploadFileName');
            const percentEl = document.getElementById('uploadPercent');
            const speedEl = document.getElementById('uploadSpeed');

            progressEl.style.display = 'block';
            fileNameEl.textContent = file.name;
            percentEl.textContent = '0%';
            fillEl.style.width = '0%';
            if (speedEl) speedEl.textContent = '';

            // Helper to cleanup UI
            const cleanup = (success = false) => {
                if (success) {
                    fillEl.style.width = '100%';
                    percentEl.textContent = '100%';
                    if (speedEl) speedEl.textContent = 'เน€เธชเธฃเนเธเธชเธดเนเธ โ“';
                    setTimeout(() => {
                        progressEl.style.display = 'none';
                        document.getElementById('docFileInput').value = '';
                        if (speedEl) speedEl.textContent = '';
                        showToast('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธชเธณเน€เธฃเนเธ!');
                        loadProjectFiles();
                    }, 1000);
                } else {
                    progressEl.style.display = 'none';
                    document.getElementById('docFileInput').value = '';
                    if (speedEl) speedEl.textContent = '';
                }
            };

            try {
                const folderId = await getOrCreateProjectFolder();
                if (!folderId) throw new Error('เนเธกเนเธเธเนเธเธฅเน€เธ”เธญเธฃเนเธชเธณเธซเธฃเธฑเธเธเธฑเธ”เน€เธเนเธเนเธเธฅเน');

                console.log('[Upload] Step 1: Requesting OAuth token from GAS...');
                percentEl.textContent = 'เธเธณเธฅเธฑเธเน€เธ•เธฃเธตเธขเธก...';

                // โ”€โ”€ Step 1: เธเธญ OAuth Token เธเธฒเธ GAS (เนเธกเนเนเธเน UrlFetchApp) โ”€โ”€
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 30000);
                let gasResult;
                try {
                    const gasRes = await fetch(GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({
                            action: 'getUploadUrl',
                            filename: file.name,
                            mimeType: file.type || 'application/octet-stream',
                            folderId: folderId
                        }),
                        redirect: 'follow',
                        signal: ctrl.signal
                    });
                    clearTimeout(tid);
                    const rawText = await gasRes.text();
                    console.log('[Upload] GAS response:', rawText.slice(0, 100));
                    gasResult = JSON.parse(rawText);
                } catch (gasErr) {
                    clearTimeout(tid);
                    throw new Error('GAS เนเธกเนเธ•เธญเธเธชเธเธญเธ: ' + gasErr.message);
                }

                if (gasResult.status !== 'success' || !gasResult.token) {
                    const hint = gasResult.error || gasResult.message || JSON.stringify(gasResult);
                    throw new Error('GAS error: ' + hint);
                }

                const oauthToken = gasResult.token;
                console.log('[Upload] Step 2: Creating resumable upload session from browser...');
                percentEl.textContent = 'เธเธณเธฅเธฑเธเน€เธ•เธฃเธตเธขเธกเธญเธฑเธเนเธซเธฅเธ”...';

                // โ”€โ”€ Step 2: Browser เธชเธฃเนเธฒเธ Resumable Upload Session เธ•เธฃเธเธเธฑเธ Drive API โ”€โ”€
                const uploadMimeType = file.type || 'application/octet-stream';
                const initRes = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + oauthToken,
                            'Content-Type': 'application/json',
                            'X-Upload-Content-Type': uploadMimeType,
                            'X-Upload-Content-Length': file.size
                        },
                        body: JSON.stringify({
                            name: file.name,
                            parents: [folderId],
                            mimeType: uploadMimeType
                        })
                    }
                );

                if (!initRes.ok) {
                    const errText = await initRes.text();
                    console.error('[Upload] Drive API init failed:', initRes.status, errText);
                    throw new Error('Drive API error ' + initRes.status + ': ' + errText.slice(0, 200));
                }

                const uploadUrl = initRes.headers.get('Location');
                if (!uploadUrl) {
                    throw new Error('Drive API เนเธกเนเธชเนเธ upload URL เธเธฅเธฑเธเธกเธฒ');
                }

                console.log('[Upload] Step 3: Uploading file directly to Drive...');
                percentEl.textContent = '0%';

                // โ”€โ”€ Step 3: PUT เนเธเธฅเนเธ•เธฃเธเนเธ Google Drive โ”€โ”€ เน€เธฃเนเธงเธกเธฒเธ! โ”€โ”€
                const uploadStartTime = Date.now();
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl, true);
                    xhr.setRequestHeader('Content-Type', uploadMimeType);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const pct = Math.round((e.loaded / e.total) * 100);
                            fillEl.style.width = pct + '%';
                            percentEl.textContent = pct + '%';

                            if (speedEl) {
                                const elapsed = (Date.now() - uploadStartTime) / 1000;
                                if (elapsed > 0.5) {
                                    const mbps = (e.loaded / elapsed / 1024 / 1024).toFixed(1);
                                    const remaining = e.total - e.loaded;
                                    const etaSec = Math.round(remaining / (e.loaded / elapsed));
                                    const etaStr = etaSec > 60 ? `${Math.round(etaSec / 60)} เธเธฒเธ—เธต` : `${etaSec} เธงเธด`;
                                    speedEl.textContent = `${mbps} MB/s ยท เน€เธซเธฅเธทเธญ ~${etaStr}`;
                                }
                            }
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 201) {
                            fillEl.style.width = '100%';
                            percentEl.textContent = '100%';
                            let driveResponse;
                            try { driveResponse = JSON.parse(xhr.responseText); } catch { driveResponse = {}; }
                            document.dispatchEvent(new CustomEvent('projectFileUploaded', {
                                detail: {
                                    name: file.name,
                                    url: `https://drive.google.com/file/d/${driveResponse.id}/view`,
                                    fileId: driveResponse.id,
                                    uploadedAt: new Date().toISOString()
                                }
                            }));
                            console.log('[Upload] โ… Direct upload complete. File ID:', driveResponse.id);
                            resolve();
                        } else {
                            console.error('[Upload] Drive PUT failed:', xhr.status, xhr.responseText);
                            reject(new Error('เธญเธฑเธเนเธซเธฅเธ”เนเธเธขเธฑเธ Drive เธฅเนเธกเน€เธซเธฅเธง (HTTP ' + xhr.status + ')'));
                        }
                    };

                    xhr.onerror = () => reject(new Error('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเน€เธเธทเนเธญเธกเธ•เนเธญเน€เธเธฃเธทเธญเธเนเธฒเธข'));
                    xhr.send(file);
                });

                cleanup(true);

            } catch (err) {
                cleanup(false);
                console.error('[Upload] Error:', err);
                showToast('เธญเธฑเธเนเธซเธฅเธ”เธฅเนเธกเน€เธซเธฅเธง: ' + err.message, 'error');
            }
        };

        // DRAG AND DROP
        const dropArea = document.getElementById('dropArea');
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragging'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragging'));
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragging');
            if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
        });

        // ---- LOAD USERS ----
        async function loadUsers() {
            const tbody = document.getElementById('userTableBody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px;"><div class="btn-spinner" style="display:inline-block; border-color:var(--blue); border-bottom-color:transparent; width:24px; height:24px; margin-bottom:12px;"></div><div style="color:var(--text-muted); font-size:14px;">เธเธณเธฅเธฑเธเนเธซเธฅเธ”เธเธนเนเนเธเนเธเธฒเธ...</div></td></tr>`;
            if (currentUserData?.role !== 'admin') return;
            const snap = await getDocs(collection(db, 'users'));
            const users = snap.docs.map(d => d.data());
            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">เนเธกเนเธเธเธเธนเนเนเธเนเธเธฒเธ</td></tr>';
                return;
            }
            tbody.innerHTML = users.map(u => `
                <tr>
                    <td style="font-weight:600;">${u.displayName || '-'}</td>
                    <td style="font-family:monospace;">@${u.username || '-'}</td>
                    <td>${u.email || '-'}</td>
                    <td>${u.role === 'admin' ? '<span class="badge badge-orange">Admin</span>' : '<span class="badge badge-gray">User</span>'}</td>
                    <td style="color:var(--text-muted); font-size:13px;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('th-TH') : '-'}</td>
                    <td>
                        ${u.uid !== currentUser.uid && u.role !== 'admin'
                    ? `<button class="btn btn-orange btn-sm" onclick="promoteUser('${u.uid}')">เน€เธฅเธทเนเธญเธเน€เธเนเธ Admin</button>`
                    : u.uid === currentUser.uid ? '<span style="color:var(--text-muted); font-size:13px;">(เธเธธเธ“เน€เธญเธ)</span>' : ''}
                    </td>
                </tr>
            `).join('');
        }

        window.promoteUser = async function (uid) {
            if (!confirm('เธ•เนเธญเธเธเธฒเธฃเน€เธฅเธทเนเธญเธเธเธนเนเนเธเนเธเธตเนเน€เธเนเธ Admin?')) return;
            await updateDoc(doc(db, 'users', uid), { role: 'admin' });
            showToast('เน€เธฅเธทเนเธญเธเธชเธดเธ—เธเธดเนเธชเธณเน€เธฃเนเธ');
            loadUsers();
        };
        // ==========================================
        // PROJECT ITEMS (เธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธ / เธเนเธฒเนเธเนเธเนเธฒเธข)
        // ==========================================
        window.previewItemImage = function (input) {
            const preview = document.getElementById('itemImagePreview');
            const dropArea = document.getElementById('itemImageDropArea');
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    document.getElementById('itemImagePlaceholder').style.display = 'none';
                    dropArea.style.borderStyle = 'solid';
                    dropArea.style.borderColor = '#6366f1';
                    dropArea.style.padding = '0';
                }
                reader.readAsDataURL(input.files[0]);
            }
        };

        window.openAddItemModal = function () {
            document.getElementById('addItemForm').reset();
            document.getElementById('itemUploadProgress').style.display = 'none';

            // Reset Preview
            const preview = document.getElementById('itemImagePreview');
            const dropArea = document.getElementById('itemImageDropArea');
            preview.style.display = 'none';
            preview.src = '';
            document.getElementById('itemImagePlaceholder').style.display = 'block';
            dropArea.style.borderStyle = 'dashed';
            dropArea.style.borderColor = '#cbd5e1';
            dropArea.style.padding = '20px';

            document.getElementById('addItemModal').classList.add('show');
        };

        window.closeAddItemModal = function () {
            document.getElementById('addItemModal').classList.remove('show');
        };

        window.handleAddItem = async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btnSaveItem');
            const fileInput = document.getElementById('itemImage');
            const file = fileInput.files[0];
            const name = document.getElementById('itemName').value;
            const qty = parseInt(document.getElementById('itemQty').value) || 1;
            const desc = document.getElementById('itemDesc').value || '';
            const price = parseFloat(document.getElementById('itemPrice').value) || 0;
            const note = document.getElementById('itemNote').value || '';

            if (!file) {
                showToast('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธฃเธนเธเธ เธฒเธ', 'error');
                return;
            }

            ButtonStateManager.setLoading(btn, true, 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...');
            const progressText = document.getElementById('itemUploadProgress');
            progressText.style.display = 'block';
            progressText.textContent = 'เธเธณเธฅเธฑเธเธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเธ เธฒเธ... 0%';

            try {
                const folderId = await getOrCreateProjectFolder();
                if (!folderId) throw new Error('เนเธกเนเธเธเนเธเธฅเน€เธ”เธญเธฃเนเธชเธณเธซเธฃเธฑเธเธเธฑเธ”เน€เธเนเธเนเธเธฅเน');

                const gasRes = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'getUploadUrl',
                        filename: 'item_' + Date.now() + '_' + file.name,
                        mimeType: file.type || 'image/jpeg',
                        folderId: folderId
                    })
                });
                const gasResult = await gasRes.json();
                if (gasResult.status !== 'success' || !gasResult.token) throw new Error('GAS error: ' + gasResult.error);

                const uploadMimeType = file.type || 'image/jpeg';
                const initRes = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + gasResult.token,
                            'Content-Type': 'application/json',
                            'X-Upload-Content-Type': uploadMimeType,
                            'X-Upload-Content-Length': file.size
                        },
                        body: JSON.stringify({ name: file.name, parents: [folderId], mimeType: uploadMimeType })
                    }
                );

                const uploadUrl = initRes.headers.get('Location');
                if (!uploadUrl) throw new Error('เนเธกเนเนเธ”เนเธฃเธฑเธ Upload URL');

                const fileId = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl, true);
                    xhr.setRequestHeader('Content-Type', uploadMimeType);
                    xhr.upload.onprogress = (evt) => {
                        if (evt.lengthComputable) {
                            progressText.textContent = 'เธเธณเธฅเธฑเธเธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเธ เธฒเธ... ' + Math.round((evt.loaded / evt.total) * 100) + '%';
                        }
                    };
                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 201) {
                            const driveResp = JSON.parse(xhr.responseText);
                            resolve(driveResp.id);
                        } else reject(new Error('Upload failed'));
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(file);
                });
                const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
                progressText.textContent = 'เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅ...';

                // Save Item
                const itemsRef = collection(db, 'projects', currentProjectId, 'items');
                await addDoc(itemsRef, {
                    name, qty, desc, price, note, imageUrl, fileId, createdAt: new Date().toISOString()
                });

                // Recalculate Total Cost
                const snap = await getDocs(itemsRef);
                const items = snap.docs.map(d => d.data());
                const totalCost = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
                await updateDoc(doc(db, 'projects', currentProjectId), { totalCost: totalCost });

                showToast('เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธข เธฃเธฐเธเธเนเธ”เนเธเธณเธเธงเธ“เธฃเธฒเธเธฒเธ—เธธเธเธฃเธงเธกเนเธซเธกเนเนเธฅเนเธง');
                closeAddItemModal();
                if (document.getElementById('view-items').classList.contains('active')) {
                    onItemsProjectChange();
                } else {
                    openProjectDetail(currentProjectId);
                }
            } catch (err) {
                console.error(err);
                showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”: ' + err.message, 'error');
            } finally {
                ButtonStateManager.setLoading(btn, false);
            }
        };

        window.loadProjectItems = async function () {
            const listEl = document.getElementById('projectItemsList');
            listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="btn-spinner" style="display:inline-block; border-color:var(--primary); border-bottom-color:transparent; width:24px; height:24px;"></div></div>';

            const q = query(collection(db, 'projects', currentProjectId, 'items'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (items.length === 0) {
                listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 20px;"><div style="font-size: 32px; margin-bottom: 8px;">๐’</div><h3 style="font-size: 14px; font-weight: 500;">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธ</h3></div>';
                return;
            }

            listEl.innerHTML = items.map(it => {
                let imgUrl = it.imageUrl;
                if (imgUrl && imgUrl.includes('export=download') && it.fileId) {
                    imgUrl = `https://drive.google.com/thumbnail?id=${it.fileId}&sz=w1000`;
                }
                return `
                <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow-xs); display: flex; flex-direction: column;">
                    <div style="width: 100%; height: 150px; background: #eee;">
                        <img src="${imgUrl}" alt="${it.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'">
                    </div>
                    <div style="padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${it.name}</div>
                            ${it.desc ? `<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${it.desc}</div>` : ''}
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">เธเธณเธเธงเธ: ${it.qty || 1}</div>
                        </div>
                        <div>
                            <div style="color: var(--danger); font-weight: 700; font-size: 16px;">เธฟ${Number(it.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                            ${it.note ? `<div style="font-size: 11px; color: var(--orange); margin-top: 4px; background: #fff8e1; padding: 4px 6px; border-radius: 4px;">๐“ ${it.note}</div>` : ''}
                            ${currentUserData?.role === 'admin' ? `<button onclick="deleteProjectItem('${it.id}')" style="margin-top: 10px; font-size:12px; color:var(--danger); background:none; border:none; cursor:pointer; text-align:left; padding:0; font-family:'Kanit';">๐—‘๏ธ เธฅเธเธฃเธฒเธขเธเธฒเธฃ</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        };

        window.deleteProjectItem = async function (itemId) {
            if (!confirm('เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเธฃเธฒเธขเธเธฒเธฃเธเธตเน? (เธฃเธฐเธเธเธเธฐเธซเธฑเธเธขเธญเธ”เน€เธเธดเธเธญเธญเธเธเธฒเธเธฃเธฒเธเธฒเธ—เธธเธเธฃเธงเธกเธ”เนเธงเธข)')) return;
            try {
                await deleteDoc(doc(db, 'projects', currentProjectId, 'items', itemId));
                const snap = await getDocs(collection(db, 'projects', currentProjectId, 'items'));
                const items = snap.docs.map(d => d.data());
                const totalCost = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
                await updateDoc(doc(db, 'projects', currentProjectId), { totalCost: totalCost });
                showToast('เธฅเธเธฃเธฒเธขเธเธฒเธฃเนเธฅเธฐเธญเธฑเธเน€เธ”เธ•เธฃเธฒเธเธฒเธ—เธธเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
                openProjectDetail(currentProjectId);
            } catch (e) {
                console.error(e);
                showToast('เธฅเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + e.message, 'error');
            }
        };

        // ==========================================
        // PROJECT ITEMS DEDICATED VIEW LOGIC
        // ==========================================
        window.toggleCustomDropdown = function(e) {
            if (e) e.stopPropagation();
            const dd = document.getElementById('itemsProjectDropdown');
            dd.classList.toggle('active');
            if (dd.classList.contains('active')) {
                document.getElementById('dropdownSearch').value = '';
                filterDropdownItems('');
                document.getElementById('dropdownSearch').focus();
            }
        };

        window.selectDropdownItem = function(projectId, projectNo, projectName) {
            const hiddenInput = document.getElementById('itemsProjectSelect');
            hiddenInput.value = projectId;
            
            const textEl = document.getElementById('selectedProjectText');
            if (projectId) {
                textEl.innerHTML = `<span class="item-no" style="margin-right:8px;">${projectNo}</span> <span style="font-weight:600; color:#1e293b;">${projectName}</span>`;
            } else {
                textEl.textContent = '-- เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธฃเธเธเธฒเธฃ --';
            }

            // Update active state in list
            document.querySelectorAll('.dropdown-item').forEach(el => {
                if (el.getAttribute('data-id') === projectId) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });

            // Close
            const dd = document.getElementById('itemsProjectDropdown');
            if (dd) dd.classList.remove('active');
            
            // Execute onchange logic
            onItemsProjectChange();
        };

        window.filterDropdownItems = function(query) {
            const lower = query.toLowerCase().trim();
            document.querySelectorAll('.dropdown-item').forEach(el => {
                const text = el.textContent.toLowerCase();
                const dataId = el.getAttribute('data-id');
                if (!dataId) {
                    // Default empty selection is always visible
                    el.style.display = lower === '' ? 'flex' : 'none';
                    return;
                }
                if (text.includes(lower)) {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            });
        };

        // Document click listener to dismiss the custom select dropdown list when clicking outside
        document.addEventListener('click', function(e) {
            const dd = document.getElementById('itemsProjectDropdown');
            if (dd && !dd.contains(e.target)) {
                dd.classList.remove('active');
            }
        });

        async function loadItemsPage() {
            // Reset Dropdown state
            const hiddenInput = document.getElementById('itemsProjectSelect');
            hiddenInput.value = '';
            document.getElementById('selectedProjectText').textContent = '-- เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธฃเธเธเธฒเธฃ --';
            document.getElementById('addItemBtnOnView').style.display = 'none';
            document.getElementById('projectItemsViewContent').innerHTML = `
                <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 12px;">๐“</div>
                    <h3 style="font-size: 16px; font-weight: 600; color: var(--text-secondary);">เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธฃเธเธเธฒเธฃเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเน€เธฃเธตเธขเธเธ”เธนเธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธ</h3>
                </div>
            `;

            // Fetch projects if not loaded
            if (!allProjects || allProjects.length === 0) {
                const snap = await getDocs(collection(db, 'projects'));
                allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                allProjects.sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);
            }

            const listEl = document.getElementById('dropdownItemsList');
            listEl.innerHTML = '';

            // Add default empty option
            const emptyItem = document.createElement('div');
            emptyItem.className = 'dropdown-item selected';
            emptyItem.setAttribute('data-id', '');
            emptyItem.onclick = () => selectDropdownItem('', '', '');
            emptyItem.innerHTML = `<span class="item-name" style="color:var(--text-secondary);">-- เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธฃเธเธเธฒเธฃ --</span>`;
            listEl.appendChild(emptyItem);

            allProjects.forEach(p => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.setAttribute('data-id', p.id);
                item.onclick = () => selectDropdownItem(p.id, p.projectNo || '-', p.projectName);
                item.innerHTML = `
                    <span class="item-no">${p.projectNo || '-'}</span>
                    <span class="item-name" title="${p.projectName}">${p.projectName}</span>
                `;
                listEl.appendChild(item);
            });

            // Handle auto-selected project from URL params if applicable
            const params = new URLSearchParams(window.location.search);
            const projectIdParam = params.get('projectId');
            if (projectIdParam) {
                const found = allProjects.find(p => p.id === projectIdParam);
                if (found) {
                    selectDropdownItem(found.id, found.projectNo || '-', found.projectName);
                }
            }
        }

        window.onItemsProjectChange = async function() {
            const select = document.getElementById('itemsProjectSelect');
            const projectId = select.value;
            const contentEl = document.getElementById('projectItemsViewContent');
            const addBtn = document.getElementById('addItemBtnOnView');

            if (!projectId) {
                addBtn.style.display = 'none';
                contentEl.innerHTML = `
                    <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 12px;">๐“</div>
                        <h3 style="font-size: 16px; font-weight: 600; color: var(--text-secondary);">เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธฃเธเธเธฒเธฃเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเน€เธฃเธตเธขเธเธ”เธนเธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธ</h3>
                    </div>
                `;
                return;
            }

            currentProjectId = projectId;
            addBtn.style.display = 'flex';
            contentEl.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; min-height:150px; grid-column: 1 / -1;"><div class="btn-spinner" style="display:inline-block; border-color:var(--primary); border-bottom-color:transparent; width:32px; height:32px;"></div></div>';

            // Load metadata
            const projDoc = await getDoc(doc(db, 'projects', projectId));
            if (projDoc.exists()) {
                currentProjectData = projDoc.data();
            }

            // Fetch items
            const q = query(collection(db, 'projects', projectId, 'items'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (items.length === 0) {
                contentEl.style.display = 'block';
                contentEl.innerHTML = '<div class="empty-state" style="padding: 60px 20px; text-align: center;"><div style="font-size: 48px; margin-bottom: 12px;">๐’</div><h3 style="font-size: 16px; font-weight: 600; color: var(--text-secondary);">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธเนเธเนเธเธฃเธเธเธฒเธฃเธเธตเน</h3><p style="font-size: 14px; color: var(--text-muted); margin-top: 4px;">เธเธฅเธดเธเธเธธเนเธก "เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃเธชเธดเนเธเธเธญเธ" เน€เธเธทเนเธญเน€เธฃเธดเนเธกเธเธฃเธญเธเธเนเธญเธกเธนเธฅ</p></div>';
                return;
            }

            contentEl.style.display = 'grid';
            contentEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
            contentEl.style.gap = '20px';

            contentEl.innerHTML = items.map(it => {
                let imgUrl = it.imageUrl;
                if (imgUrl && imgUrl.includes('export=download') && it.fileId) {
                    imgUrl = `https://drive.google.com/thumbnail?id=${it.fileId}&sz=w1000`;
                }
                return `
                <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
                    <div style="width: 100%; height: 160px; background: #f1f5f9; position: relative;">
                        <img src="${imgUrl}" alt="${it.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'">
                    </div>
                    <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
                        <div>
                            <div style="font-weight: 700; font-size: 15px; color: var(--text); margin-bottom: 4px;">${it.name}</div>
                            ${it.desc ? `<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5;">${it.desc}</div>` : ''}
                            <div style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">เธเธณเธเธงเธ: <span style="color: var(--text); font-weight:600;">${it.qty || 1}</span></div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight:600;">เธฃเธฒเธเธฒเธ—เธธเธเธฃเธงเธก</div>
                            <div style="color: var(--danger); font-weight: 800; font-size: 18px; margin-top: 2px;">เธฟ${Number(it.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                            ${it.note ? `<div style="font-size: 12px; color: var(--orange); margin-top: 8px; background: var(--secondary-light); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(224, 123, 47, 0.15); display: flex; align-items: center; gap: 6px;">๐“ <span>${it.note}</span></div>` : ''}
                            ${currentUserData?.role === 'admin' ? `
                                <button onclick="deleteProjectItemOnItemsPage('${it.id}')" style="margin-top: 12px; font-size:12px; color:var(--danger); background:none; border:none; cursor:pointer; text-align:left; padding:0; font-family:'Kanit'; font-weight:600; display:flex; align-items:center; gap:4px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                    ๐—‘๏ธ เธฅเธเธฃเธฒเธขเธเธฒเธฃเธเธตเน
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        };

        let pendingProjectItemId = null;

        window.deleteProjectItemOnItemsPage = function(itemId) {
            pendingProjectItemId = itemId;
            openModal('deleteItemConfirmModal');
        };

        window.executeDeleteProjectItem = async function() {
            if (!pendingProjectItemId) return;
            const itemId = pendingProjectItemId;
            closeModal('deleteItemConfirmModal');
            try {
                const itemsRef = collection(db, 'projects', currentProjectId, 'items');
                await deleteDoc(doc(db, 'projects', currentProjectId, 'items', itemId));

                // Recalculate Total Cost
                const snap = await getDocs(itemsRef);
                const items = snap.docs.map(d => d.data());
                const totalCost = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
                await updateDoc(doc(db, 'projects', currentProjectId), { totalCost: totalCost });

                showToast('เธฅเธเธฃเธฒเธขเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธข เธฃเธฐเธเธเนเธ”เนเธเธณเธเธงเธ“เธฃเธฒเธเธฒเธ—เธธเธเนเธซเธกเนเนเธฅเนเธง');
                onItemsProjectChange(); // Refresh
            } catch (err) {
                console.error(err);
                showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”: ' + err.message, 'error');
            } finally {
                pendingProjectItemId = null;
            }
        };
