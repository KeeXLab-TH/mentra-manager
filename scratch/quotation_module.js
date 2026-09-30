
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
        import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
        import {
            initializeFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, deleteField,
            persistentLocalCache, persistentMultipleTabManager
        } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // --- Firebase & Firestore Setup ---
        let FIREBASE_CONFIG = null;
        try {
            const cfg = await import('../../assets/js/firebase-config.js');
            FIREBASE_CONFIG = cfg.FIREBASE_CONFIG || cfg.default?.FIREBASE_CONFIG;
        } catch (e) {
        }

        if (!FIREBASE_CONFIG) {
            throw new Error('ไม่พบไฟล์ firebase-config.js กรุณาติดต่อผู้ดูแลระบบ');
        }

        const app = initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });

        let currentUser = null;
        let liveSyncTimer = null;
        let registeredShopsCache = [];
        try {
            const cachedShops = localStorage.getItem('registered_shops');
            if (cachedShops) {
                const parsed = JSON.parse(cachedShops);
                if (Array.isArray(parsed) && parsed.length > 0) registeredShopsCache = parsed;
            }
            if (registeredShopsCache.length === 0) {
                const wsRaw = localStorage.getItem('mentra_managed_workspaces');
                if (wsRaw) {
                    const parsedWs = JSON.parse(wsRaw);
                    if (Array.isArray(parsedWs) && parsedWs.length > 0) {
                        registeredShopsCache = parsedWs.map(w => ({
                            name: w.name || 'บริษัทของท่าน',
                            themeColor: w.color || '#1A6FBF',
                            signer: w.signer || '',
                            logo: w.logo || '',
                            taxId: w.taxId || '',
                            phone: w.phone || '',
                            address: w.address || ''
                        }));
                    }
                }
            }
        } catch(e) {}
        window.registeredShopsCache = registeredShopsCache;
        let loadedHistory = [];
        let materialProjectsCache = [];
        let uniqueInstitutions = [];
        let institutionLogosCache = {};
        let institutionDetailsCache = {};

        // ── Document Workflow Configuration & State ──
        const DOC_TYPE_CONFIG = {
            quotation: {
                key: 'quotation',
                step: 1,
                titleTH: 'ใบเสนอราคา',
                titleEN: 'QUOTATION',
                prefix: 'MTQ',
                introText: 'ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:',
                badgeLabel: 'ใบเสนอราคา',
                badgeColor: '#1d4ed8',
                badgeBg: '#eff6ff',
                badgeBorder: '#bfdbfe',
                leftSignerTitle: 'ผู้สั่งซื้อ',
                rightSignerTitle: 'ขอแสดงความนับถือ / Sincerely Yours,',
                sellerRole: 'ผู้เสนอราคา',
                sellerNameLabel: 'ผู้เสนอราคา / ผู้ลงนาม (Prepared By)',
                sellerRoleLabel: 'ตำแหน่ง (Position / Title)',
                firestoreCollection: 'quotations_history',
                telegramLabel: '📄 <b>แจ้งเตือนการออกใบเสนอราคา (Quotation)</b>',
                nextDocType: 'invoice',
                confirmButtonText: 'ยืนยัน → ออกใบแจ้งหนี้',
                confirmDialogPrompt: 'ยืนยันใบเสนอราคานี้ และดำเนินการออกใบส่งของ/ใบแจ้งหนี้ต่อหรือไม่?',
                statusLabel: 'สถานะ: พร้อมออกใบเสนอราคา'
            },
            invoice: {
                key: 'invoice',
                step: 2,
                titleTH: 'ใบส่งของ/ใบแจ้งหนี้',
                titleEN: 'DELIVERY NOTE / INVOICE',
                prefix: 'MTI',
                introText: 'ขอแจ้งรายละเอียดสินค้า/บริการที่ส่งมอบ ดังมีรายละเอียดต่อไปนี้:',
                badgeLabel: 'ใบส่งของ/ใบแจ้งหนี้',
                badgeColor: '#b45309',
                badgeBg: '#fffbeb',
                badgeBorder: '#fde68a',
                leftSignerTitle: 'ผู้รับของ',
                rightSignerTitle: 'ผู้ส่งของ',
                sellerRole: 'ผู้ส่งของ',
                sellerNameLabel: 'ชื่อผู้ส่งของ (Delivered By)',
                sellerRoleLabel: 'ตำแหน่ง / หน้าที่ (Position)',
                firestoreCollection: 'invoices_history',
                telegramLabel: '📋 <b>แจ้งเตือนการออกใบส่งของ/ใบแจ้งหนี้ (Invoice)</b>',
                nextDocType: 'receipt',
                confirmButtonText: 'ยืนยัน → ออกใบเสร็จรับเงิน',
                confirmDialogPrompt: 'ยืนยันใบแจ้งหนี้นี้ และดำเนินการออกใบเสร็จรับเงิน/ใบกำกับภาษีต่อหรือไม่?',
                statusLabel: 'สถานะ: พร้อมออกใบส่งของ/ใบแจ้งหนี้'
            },
            receipt: {
                key: 'receipt',
                step: 3,
                titleTH: 'ใบเสร็จรับเงิน/ใบกำกับภาษี',
                titleEN: 'RECEIPT / TAX INVOICE',
                prefix: 'MTR',
                introText: 'ได้รับชำระเงินเรียบร้อยแล้ว ดังมีรายละเอียดต่อไปนี้:',
                badgeLabel: 'ใบเสร็จรับเงิน',
                badgeColor: '#047857',
                badgeBg: '#f0fdf4',
                badgeBorder: '#bbf7d0',
                leftSignerTitle: 'ผู้จ่ายเงิน',
                rightSignerTitle: 'ผู้รับเงิน / ผู้มีอำนาจลงนาม',
                sellerRole: 'ผู้รับเงิน / ผู้มีอำนาจลงนาม',
                sellerNameLabel: 'ชื่อผู้รับเงิน / ผู้มีอำนาจลงนาม (Authorized Signer)',
                sellerRoleLabel: 'ตำแหน่ง / หน้าที่ (Position)',
                firestoreCollection: 'receipts_history',
                telegramLabel: '🧾 <b>แจ้งเตือนการออกใบเสร็จรับเงิน (Receipt)</b>',
                nextDocType: null,
                confirmButtonText: 'เสร็จสิ้นสมบูรณ์',
                confirmDialogPrompt: null,
                statusLabel: 'สถานะ: ออกใบเสร็จรับเงิน (ขั้นตอนสุดท้าย)'
            }
        };

        let currentDocType = 'quotation';
        let workflowHistory = {
            quotationRefNo: '',
            invoiceRefNo: '',
            receiptRefNo: '',
            parentRefNo: ''
        };

        function switchDocType(type, options = {}) {
            const config = DOC_TYPE_CONFIG[type];
            if (!config) return;

            currentDocType = type;

            // 1. Update Print Area Titles
            const pTitleTH = document.getElementById('pDocumentTitleTH');
            if (pTitleTH) pTitleTH.innerText = config.titleTH;
            const pTitleEN = document.getElementById('pIssuerQuotationText');
            if (pTitleEN) pTitleEN.innerText = config.titleEN;

            // 2. Update Hero Badge
            const badge = document.getElementById('heroDocTypeBadge');
            const badgeText = document.getElementById('heroDocTypeBadgeText');
            if (badgeText) badgeText.innerText = config.badgeLabel;
            if (badge) {
                badge.style.color = config.badgeColor;
                badge.style.background = config.badgeBg;
                badge.style.borderColor = config.badgeBorder;
            }

            // 3. Update Intro Text
            const pIntro = document.getElementById('pIntroText');
            if (pIntro) pIntro.innerText = config.introText;

            // 4. Update Signer Titles & Roles
            const pLeftSigner = document.getElementById('pLeftSignerTitle');
            if (pLeftSigner) pLeftSigner.innerText = config.leftSignerTitle;
            const pRightSigner = document.getElementById('pRightSignerTitle');
            if (pRightSigner) pRightSigner.innerText = config.rightSignerTitle;
            const pSellerRole = document.getElementById('pSellerRole');
            if (pSellerRole) pSellerRole.innerText = config.sellerRole;

            // Form inputs on left panel
            const sellerRoleInput = document.getElementById('sellerRole');
            if (sellerRoleInput) sellerRoleInput.value = config.sellerRole;
            const sellerNameLabel = document.getElementById('sellerNameLabel');
            if (sellerNameLabel && config.sellerNameLabel) sellerNameLabel.innerText = config.sellerNameLabel;
            const sellerRoleLabel = document.getElementById('sellerRoleLabel');
            if (sellerRoleLabel && config.sellerRoleLabel) sellerRoleLabel.innerText = config.sellerRoleLabel;

            const pSellerSignatureDate = document.getElementById('pSellerSignatureDate');
            if (pSellerSignatureDate) pSellerSignatureDate.style.display = 'flex';

            // 5. Update Status Bar
            const barStatusText = document.getElementById('barStatusText');
            if (barStatusText) barStatusText.innerText = config.statusLabel;

            // 6. Update Confirm Button in Action Bar
            const btnConfirm = document.getElementById('btnWorkflowConfirm');
            const btnConfirmText = document.getElementById('btnWorkflowConfirmText');
            if (btnConfirm) {
                if (config.nextDocType) {
                    btnConfirm.style.display = 'inline-flex';
                    btnConfirm.className = 'btn-workflow-confirm';
                    if (btnConfirmText) btnConfirmText.innerText = config.confirmButtonText;
                } else {
                    btnConfirm.style.display = 'inline-flex';
                    btnConfirm.className = 'btn-workflow-complete';
                    if (btnConfirmText) btnConfirmText.innerText = '✅ กระบวนการเสร็จสมบูรณ์';
                }
            }

            // 7. Update Stepper UI
            updateWorkflowStepperUI();

            // 8. Generate new RefNo if requested, or sync prefix when switching types
            const existingStepDocNumber = linkedProjectData?.docWorkflow?.[type]?.docNumber;
            const refNoEl = document.getElementById('refNo');
            if (existingStepDocNumber && !existingStepDocNumber.includes('PRJ') && refNoEl) {
                refNoEl.value = existingStepDocNumber;
            } else if (options.generateNewRef) {
                generateRefNo();
            } else if (refNoEl) {
                const curVal = refNoEl.value.trim();
                const code = (typeof getCurrentShopCode === 'function') ? getCurrentShopCode() : 'MT';
                if (!curVal || curVal === '-' || curVal.includes('PRJ')) {
                    generateRefNo(true);
                } else if (type === 'invoice') {
                    const suffix = extractDocSuffix(curVal);
                    refNoEl.value = suffix ? `${code}I${suffix}` : '';
                    if (!refNoEl.value) generateRefNo(true);
                } else if (type === 'receipt') {
                    const suffix = extractDocSuffix(curVal);
                    refNoEl.value = suffix ? `${code}R${suffix}` : '';
                    if (!refNoEl.value) generateRefNo(true);
                } else if (type === 'quotation') {
                    const suffix = extractDocSuffix(curVal);
                    refNoEl.value = suffix ? `${code}Q${suffix}` : '';
                    if (!refNoEl.value) generateRefNo(true);
                }
            }

            // 9. Sync preview
            if (typeof triggerLiveSync === 'function') {
                triggerLiveSync();
            } else if (typeof syncFormToPrintArea === 'function') {
                syncFormToPrintArea();
            }
        }

        function updateWorkflowStepperUI() {
            const currentStepNum = DOC_TYPE_CONFIG[currentDocType]?.step || 1;

            ['quotation', 'invoice', 'receipt'].forEach(dt => {
                const conf = DOC_TYPE_CONFIG[dt];
                const stepEl = document.getElementById(`wfStep${conf.step}`);
                const numEl = document.getElementById(`wfNum${conf.step}`);
                if (!stepEl) return;

                stepEl.classList.remove('active', 'completed');
                if (conf.step < currentStepNum) {
                    stepEl.classList.add('completed');
                    if (numEl) numEl.innerHTML = "<i class='bx bx-check'></i>";
                } else if (conf.step === currentStepNum) {
                    stepEl.classList.add('active');
                    if (numEl) numEl.innerText = conf.step;
                } else {
                    if (numEl) numEl.innerText = conf.step;
                }
            });

            // Connectors
            const conn1 = document.getElementById('wfConn1');
            const conn2 = document.getElementById('wfConn2');
            if (conn1) {
                if (currentStepNum > 1) conn1.classList.add('done');
                else conn1.classList.remove('done');
            }
            if (conn2) {
                if (currentStepNum > 2) conn2.classList.add('done');
                else conn2.classList.remove('done');
            }
        }

        function openWorkflowConfirmModal() {
            const config = DOC_TYPE_CONFIG[currentDocType];
            if (!config || !config.nextDocType) {
                showToast('เอกสารนี้อยู่ในขั้นตอนสุดท้าย (ใบเสร็จรับเงิน) เรียบร้อยแล้ว', 'info');
                return;
            }

            const nextConfig = DOC_TYPE_CONFIG[config.nextDocType];
            const currentRef = document.getElementById('refNo')?.value || '-';
            const toCompany = (document.getElementById('toCompany')?.value || '').trim() || 'ไม่ระบุชื่อลูกค้า';
            const grandTotal = document.getElementById('grandTotalDisplay')?.innerText || '0.00';

            // Populate modal fields
            const currentDocEl = document.getElementById('wfModalCurrentDoc');
            const currentRefEl = document.getElementById('wfModalCurrentRef');
            const nextDocEl = document.getElementById('wfModalNextDoc');
            const nextRefHintEl = document.getElementById('wfModalNextRefHint');
            const customerEl = document.getElementById('wfModalCustomer');
            const amountEl = document.getElementById('wfModalAmount');
            const proceedBtnTextEl = document.getElementById('wfModalProceedBtnText');
            const modalTitleEl = document.getElementById('wfModalTitle');
            const modalSubtitleEl = document.getElementById('wfModalSubtitle');

            if (currentDocEl) currentDocEl.innerText = config.titleTH;
            if (currentRefEl) currentRefEl.innerText = currentRef;
            if (nextDocEl) nextDocEl.innerText = nextConfig.titleTH;
            if (nextRefHintEl) nextRefHintEl.innerText = `รันเลขใหม่ (${nextConfig.prefix}...)`;
            if (customerEl) customerEl.innerText = toCompany;
            if (amountEl) amountEl.innerText = grandTotal.includes('฿') ? grandTotal : `฿${grandTotal}`;
            if (proceedBtnTextEl) proceedBtnTextEl.innerText = `ยืนยันและออก${nextConfig.titleTH}`;

            if (modalTitleEl) {
                modalTitleEl.innerText = `ยืนยัน${config.titleTH} → ออก${nextConfig.titleTH}`;
            }
            if (modalSubtitleEl) {
                modalSubtitleEl.innerText = `บันทึกประวัติ ${config.titleTH} และเปลี่ยนเป็น ${nextConfig.titleTH}`;
            }

            const modal = document.getElementById('workflowConfirmModal');
            const card = document.getElementById('wfModalCard');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.style.opacity = '1';
                    if (card) card.style.transform = 'scale(1)';
                }, 10);
            }
        }

        function closeWorkflowConfirmModal() {
            const modal = document.getElementById('workflowConfirmModal');
            const card = document.getElementById('wfModalCard');
            if (modal) {
                modal.style.opacity = '0';
                if (card) card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 250);
            }
        }

        async function executeWorkflowTransition() {
            const config = DOC_TYPE_CONFIG[currentDocType];
            if (!config || !config.nextDocType) {
                closeWorkflowConfirmModal();
                alert('เอกสารนี้อยู่ในขั้นตอนสุดท้าย (ใบเสร็จรับเงิน) เรียบร้อยแล้ว');
                return;
            }

            const proceedBtn = document.getElementById('wfModalProceedBtn');
            const proceedBtnText = document.getElementById('wfModalProceedBtnText');
            const originalText = proceedBtnText ? proceedBtnText.innerText : '';
            if (proceedBtn) proceedBtn.disabled = true;
            if (proceedBtnText) proceedBtnText.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> กำลังบันทึกข้อมูล...";

            const currentRef = document.getElementById('refNo')?.value || '';
            const toCompany = document.getElementById('toCompany')?.value || 'ลูกค้า';

            const confirmMsg = `${config.confirmDialogPrompt}\n\n• เอกสารปัจจุบัน: ${config.titleTH} (${currentRef})\n• ลูกค้า: ${toCompany}`;
            if (!confirm(confirmMsg)) return;

            // Save current doc to history before moving forward
            try {
                await saveDocumentToHistory();
            } catch (err) {
                console.warn('Could not save current document before advancing:', err);
            }

            // Save parent reference
            if (currentDocType === 'quotation') {
                workflowHistory.quotationRefNo = currentRef;
                workflowHistory.parentRefNo = currentRef;
            } else if (currentDocType === 'invoice') {
                workflowHistory.invoiceRefNo = currentRef;
            }

            const nextType = config.nextDocType;
            const nextConfig = DOC_TYPE_CONFIG[nextType];

            // Switch to next document type
            switchDocType(nextType, { generateNewRef: true });

            closeWorkflowConfirmModal();

            if (proceedBtn) proceedBtn.disabled = false;
            if (proceedBtnText) proceedBtnText.innerText = originalText;

            showToast(`✅ ยืนยัน ${config.titleTH} เรียบร้อยแล้ว! ระบบเปลี่ยนเป็น ${nextConfig.titleTH}`, 'success');
            alert(`✅ ยืนยัน ${config.titleTH} เรียบร้อยแล้ว!\nระบบได้เปลี่ยนเป็น ${DOC_TYPE_CONFIG[nextType].titleTH} พร้อมรันเลขที่เอกสารใหม่ให้แล้ว`);
        }

        function confirmAndAdvanceWorkflow() {
            const config = DOC_TYPE_CONFIG[currentDocType];
            if (!config || !config.nextDocType) {
                showToast('เอกสารนี้อยู่ในขั้นตอนสุดท้าย (ใบเสร็จรับเงิน) เรียบร้อยแล้ว', 'info');
                return;
            }
            openWorkflowConfirmModal();
        }

        function onWorkflowStepClick(targetDocType) {
            const targetStep = DOC_TYPE_CONFIG[targetDocType]?.step;
            const currentStep = DOC_TYPE_CONFIG[currentDocType]?.step;
            if (!targetStep || targetDocType === currentDocType) return;

            switchDocType(targetDocType, { generateNewRef: false });
            showToast(`สลับมาที่ ${DOC_TYPE_CONFIG[targetDocType].titleTH}`, 'info');
        }

        let hasAutoImported = false;

        // --- Initialization ---
        function initializePage() {
            const urlParams = new URLSearchParams(window.location.search);
            const autoImportId = urlParams.get('projectId');
            const autoImportSource = urlParams.get('source') || 'school';
            const urlShop = urlParams.get('shop');

            // Immediately apply issuer from URL if present so hero bar displays the correct company without delay
            if (urlShop && urlShop.trim() !== '') {
                try {
                    applyIssuerTemplate(urlShop.trim());
                } catch(e) {
                    console.warn("Could not apply URL shop immediately:", e);
                }
            } else {
                const savedShop = localStorage.getItem('selected_issuer_company');
                if (savedShop) {
                    try {
                        applyIssuerTemplate(savedShop);
                    } catch(e) {}
                }
            }

            if (autoImportId) {
                // If projectId is in URL, start importing immediately from local cache or Firestore
                autoImportProject(autoImportId, autoImportSource).catch(e => console.error("Early auto-import error:", e));
            } else {
                addTableRow(); // Add 1 empty row by default only if not auto-importing
            }

            loadSavedRecipientsDropdown(); // Load saved recipient profiles
            switchDocType(currentDocType, { generateNewRef: false });

            // Restore sidebar collapse state
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            if (isCollapsed) {
                document.getElementById('sidebar')?.classList.add('collapsed');
                const mw = document.querySelector('.main-wrapper');
                if (mw) mw.style.marginLeft = 'var(--sidebar-w-collapsed)';
            }
        }

        // --- Firebase Auth Guard & Cloud Sync Listener ---
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) {
                        const userData = snap.data();

                        // Check status
                        const userStatus = userData.status || 'approved';
                        if (userStatus === 'pending') {
                            alert('บัญชีของคุณอยู่ระหว่างการรออนุมัติสิทธิ์เข้าใช้งานจากผู้ดูแลระบบ');
                            await signOut(auth);
                            window.location.href = '../../index.html?msg=pending';
                            return;
                        } else if (userStatus === 'rejected') {
                            alert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ');
                            await signOut(auth);
                            window.location.href = '../../index.html?msg=rejected';
                            return;
                        }

                        if (window.checkPageAccess && !window.checkPageAccess(userData)) return;

                        // Populate User Profile in Sidebar
                        const { displayName, role, firstName } = userData;
                        const initials = (firstName || displayName || 'U').charAt(0).toUpperCase();
                        document.getElementById('userAvatar').textContent = initials;
                        document.getElementById('userName').textContent = displayName || firstName || '-';

                        const badge = document.getElementById('userRoleBadge');
                        badge.textContent = role === 'admin' ? 'Admin' : 'User';
                        badge.className = `role-badge ${role}`;

                        if (role === 'admin') {
                            document.getElementById('adminMenu').style.display = 'block';
                        }

                        // Populate Logged-in User's Name into Seller and Signer dynamically (no hardcoded names)
                        const actualFullName = displayName || (firstName ? `${firstName} ${userData.lastName || ''}`.trim() : '');
                        if (actualFullName) {
                            const sellerInput = document.getElementById('sellerName');
                            if (sellerInput && (!sellerInput.value || sellerInput.value.trim() === '')) {
                                sellerInput.value = actualFullName;
                            }
                            const settingSeller = document.getElementById('settingSellerName');
                            if (settingSeller && (!settingSeller.value || settingSeller.value.trim() === '')) {
                                settingSeller.value = `( ${actualFullName} )`;
                            }
                            const pSeller = document.getElementById('pSellerName');
                            if (pSeller && (!pSeller.innerText || pSeller.innerText.includes('...') || pSeller.innerText === '-')) {
                                pSeller.innerText = `( ${actualFullName} )`;
                            }
                        }

                        // Robust Local & Cloud Sync: Merge data instead of overwriting to prevent data loss
                        const localRecipients = getSavedRecipients();
                        if (userData && Array.isArray(userData.savedRecipients)) {
                            const cloudRecipients = userData.savedRecipients;
                            
                            // Merge local and cloud based on unique company names (case-insensitive)
                            const merged = [...localRecipients];
                            cloudRecipients.forEach(cr => {
                                const crName = ((cr && (cr.toCompany || cr.company)) || '').toLowerCase();
                                const exists = merged.some(lr => ((lr && (lr.toCompany || lr.company)) || '').toLowerCase() === crName);
                                if (!exists && crName) {
                                    merged.push(cr);
                                }
                            });
                            
                            localStorage.setItem('saved_recipients', JSON.stringify(merged));
                            loadSavedRecipientsDropdown();
                            
                            // If local had unique ones, push them up to update the cloud database
                            if (merged.length > cloudRecipients.length) {
                                setDoc(doc(db, 'users', user.uid), {
                                    savedRecipients: merged
                                }, { merge: true }).catch(err => console.error("Auto sync merged recipients failed:", err));
                            }
                        } else {
                            // Cloud has no saved recipients, but local does: back up local storage to the cloud
                            if (localRecipients.length > 0) {
                                setDoc(doc(db, 'users', user.uid), {
                                    savedRecipients: localRecipients
                                }, { merge: true }).catch(err => console.error("Initial cloud backup failed:", err));
                            }
                            loadSavedRecipientsDropdown();
                        }
                        
                        window.quotationTemplates = {};
                        if (userData && userData.quotationTemplates) {
                            window.quotationTemplates = userData.quotationTemplates;
                        } else {
                            const localTemplates = localStorage.getItem('quotationTemplates');
                            if (localTemplates) {
                                window.quotationTemplates = JSON.parse(localTemplates);
                            }
                        }

                        window.savedSignaturesByCompany = {};
                        if (userData && userData.savedSignaturesByCompany) {
                            window.savedSignaturesByCompany = userData.savedSignaturesByCompany;
                            localStorage.setItem('saved_signatures_by_company', JSON.stringify(window.savedSignaturesByCompany));
                        } else {
                            const localCompanySigs = localStorage.getItem('saved_signatures_by_company');
                            if (localCompanySigs) {
                                try {
                                    window.savedSignaturesByCompany = JSON.parse(localCompanySigs);
                                } catch(e) {
                                    window.savedSignaturesByCompany = {};
                                }
                            } else {
                                const legacySigs = (userData && userData.savedSignatures) || JSON.parse(localStorage.getItem('saved_signatures') || '[]');
                                if (Array.isArray(legacySigs) && legacySigs.length > 0) {
                                    window.savedSignaturesByCompany["บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)"] = legacySigs;
                                    localStorage.setItem('saved_signatures_by_company', JSON.stringify(window.savedSignaturesByCompany));
                                }
                            }
                        }
                        renderSavedSignaturesGallery();

                        // Migration from old single template
                        if (Object.keys(window.quotationTemplates).length === 0) {
                            if (userData && userData.quotationTemplate) {
                                const issuerName = userData.quotationTemplate.issuerName || "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)";
                                window.quotationTemplates[issuerName] = userData.quotationTemplate;
                            } else {
                                const localTemplate = localStorage.getItem('quotationTemplate');
                                if (localTemplate) {
                                    const parsed = JSON.parse(localTemplate);
                                    const issuerName = parsed.issuerName || "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)";
                                    window.quotationTemplates[issuerName] = parsed;
                                }
                            }
                        }
                        
                        // Fetch registered shops for the issuer selector
                        try {
                            const shopsSnap = await getDoc(doc(db, 'material_settings', 'registered_shops'));
                            if (shopsSnap.exists()) {
                                registeredShopsCache = shopsSnap.data().shops || [];
                            }
                        } catch (err) {
                            console.error("Error loading registered shops:", err);
                        }

                        // Apply template for the current displayed issuer if selected
                        try {
                            const currentIssuerDisplay = document.getElementById('currentIssuerDisplay')?.innerText?.trim();
                            if (currentIssuerDisplay && !currentIssuerDisplay.includes('กรุณาเลือกบริษัท')) {
                                applyIssuerTemplate(currentIssuerDisplay);
                            }
                        } catch (e) {
                            console.error("Error applying default issuer template:", e);
                        }

                        // Show body now that the user is fully verified
                        document.body.style.display = 'flex';
                        const pageOverlay = document.getElementById('mentra-page-transition-overlay');
                        if (pageOverlay) {
                            pageOverlay.style.opacity = '0';
                            pageOverlay.style.pointerEvents = 'none';
                        }

                        // Auto Import Project if URL param is present
                        const urlParams = new URLSearchParams(window.location.search);
                        const paramDocType = urlParams.get('docType');
                        if (paramDocType && DOC_TYPE_CONFIG[paramDocType]) {
                            switchDocType(paramDocType, { generateNewRef: false });
                        }

                        // Support loadPending from sales_documents.html
                        if (urlParams.get('loadPending') === 'true') {
                            try {
                                const rawPending = localStorage.getItem('pending_load_quotation');
                                if (rawPending) {
                                    const docData = JSON.parse(rawPending);
                                    if (docData) {
                                        loadQuotationData(docData);
                                        localStorage.removeItem('pending_load_quotation');
                                    }
                                }
                            } catch(e) {
                                console.error("Error loading pending quotation:", e);
                            }
                        }

                        const autoImportId = urlParams.get('projectId');
                        const autoImportSource = urlParams.get('source') || 'school';
                        if (autoImportId && !hasAutoImported) {
                            autoImportProject(autoImportId, autoImportSource).catch(e => console.error("Error auto-importing project:", e));
                        } else if (!autoImportId) {
                            try {
                                localStorage.removeItem('pending_quotation_project');
                            } catch(e) {}
                        }
                    } else {
                        // User document deleted!
                        alert('ไม่พบบัญชีผู้ใช้นี้ในระบบ หรือบัญชีของคุณถูกลบแล้ว');
                        await signOut(auth);
                        window.location.href = '../../index.html?msg=deleted';
                    }
                } catch (err) {
                    console.error("Error loading user profile:", err);
                    document.body.style.display = 'flex';
                    const pageOverlay = document.getElementById('mentra-page-transition-overlay');
                    if (pageOverlay) {
                        pageOverlay.style.opacity = '0';
                        pageOverlay.style.pointerEvents = 'none';
                    }
                }
            } else {
                if (window.location.search.includes('testBypassAuth=true')) {
                    console.log('Testing: bypassing auth guard');
                    return;
                }
                window.location.href = '../../index.html'; // Auth Guard
            }
        });

        // --- Logout & Sidebar Toggle Helpers ---
        async function handleLogout() {
            if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                try {
                    await signOut(auth);
                    window.location.href = '../../index.html';
                } catch (e) {
                    console.error('Logout failed:', e);
                }
            }
        }

        // Expose to window scope
        window.handleLogout = handleLogout;
        // toggleSidebarCollapse handled by dashboard-dual-sidebar.js

        function extractDocSuffix(ref) {
            if (!ref) return '';
            const str = String(ref).trim();
            if (str.includes('PRJ')) return '';
            const stripped = str.replace(/^(?:[A-Za-z]{2,4}[QIRqir]|(?:MT|KT|SM|PS|TP)[A-Za-z]|REC|INV|QT)[-_]?/i, '');
            return /^\d+$/.test(stripped) ? stripped : '';
        }

        function onParentRefInput() {
            const parentInput = document.getElementById('parentRefNo');
            let parentVal = parentInput?.value?.trim() || '';
            if (parentVal.includes('PRJ')) {
                parentVal = '';
                if (parentInput) parentInput.value = '';
            }
            workflowHistory.parentRefNo = parentVal;
            const suffix = extractDocSuffix(parentVal);
            if (suffix) {
                const refEl = document.getElementById('refNo');
                if (refEl) {
                    const code = (typeof getCurrentShopCode === 'function') ? getCurrentShopCode() : 'MT';
                    if (currentDocType === 'invoice') {
                        refEl.value = `${code}I${suffix}`;
                    } else if (currentDocType === 'receipt') {
                        refEl.value = `${code}R${suffix}`;
                    }
                }
            } else if (currentDocType === 'invoice' || currentDocType === 'receipt') {
                generateRefNo(true);
            }
            if (typeof triggerLiveSync === 'function') triggerLiveSync();
        }

        // --- Core Functions ---
        async function generateRefNo(forceSequential = false) {
            const code = (typeof getCurrentShopCode === 'function') ? getCurrentShopCode() : 'MT';
            const config = DOC_TYPE_CONFIG[currentDocType] || DOC_TYPE_CONFIG.quotation;

            // 1. If invoice, derive number from preceding quotation
            if (!forceSequential && currentDocType === 'invoice') {
                const parentInputVal = document.getElementById('parentRefNo')?.value?.trim();
                const parentRef = parentInputVal || 
                    workflowHistory.quotationRefNo || 
                    workflowHistory.parentRefNo || 
                    linkedProjectData?.docWorkflow?.invoice?.parentRef || 
                    linkedProjectData?.docWorkflow?.quotation?.docNumber || 
                    new URLSearchParams(window.location.search).get('parentRef') || '';

                if (parentRef && !parentRef.includes('PRJ')) {
                    const suffix = extractDocSuffix(parentRef);
                    if (suffix) {
                        const newRef = `${code}I${suffix}`;
                        const refEl = document.getElementById('refNo');
                        if (refEl) refEl.value = newRef;
                        if (!parentInputVal && document.getElementById('parentRefNo')) {
                            document.getElementById('parentRefNo').value = parentRef;
                        }
                        if (typeof triggerLiveSync === 'function') triggerLiveSync();
                        return newRef;
                    }
                }
            }

            // 2. If receipt, derive number from preceding invoice or quotation
            if (!forceSequential && currentDocType === 'receipt') {
                const parentInputVal = document.getElementById('parentRefNo')?.value?.trim();
                const parentRef = parentInputVal || 
                    workflowHistory.invoiceRefNo || 
                    workflowHistory.quotationRefNo || 
                    workflowHistory.parentRefNo || 
                    linkedProjectData?.docWorkflow?.receipt?.parentRef || 
                    linkedProjectData?.docWorkflow?.invoice?.docNumber || 
                    linkedProjectData?.docWorkflow?.quotation?.docNumber || 
                    new URLSearchParams(window.location.search).get('parentRef') || '';

                if (parentRef && !parentRef.includes('PRJ')) {
                    const suffix = extractDocSuffix(parentRef);
                    if (suffix) {
                        const newRef = `${code}R${suffix}`;
                        const refEl = document.getElementById('refNo');
                        if (refEl) refEl.value = newRef;
                        if (!parentInputVal && document.getElementById('parentRefNo')) {
                            document.getElementById('parentRefNo').value = parentRef;
                        }
                        if (typeof triggerLiveSync === 'function') triggerLiveSync();
                        return newRef;
                    }
                }
            }

            // 3. Fallback: Sequential generation by date (format: {CODE}Q{YY}{MM}{DD}{SEQ} e.g. MTQ260930001)
            const docDateInput = document.getElementById('docDate');
            let docDateVal = docDateInput?.value;
            if (!docDateVal) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                docDateVal = `${yyyy}-${mm}-${dd}`;
                if (docDateInput) docDateInput.value = docDateVal;
            }
            const parts = docDateVal.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const year = date.getFullYear().toString().slice(-2);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const typeLetter = currentDocType === 'invoice' ? 'I' : (currentDocType === 'receipt' ? 'R' : 'Q');
            const targetDocPrefix = `${code}${typeLetter}`;
            const prefix = `${targetDocPrefix}${year}${month}${day}`;

            let nextSeq = 1;
            if (currentUser && db) {
                try {
                    const collName = config.firestoreCollection || 'quotations_history';
                    const historyRef = collection(db, 'users', currentUser.uid, collName);
                    const querySnapshot = await getDocs(historyRef);
                    let maxSeq = 0;
                    querySnapshot.forEach(docSnap => {
                        const ref = docSnap.data().refNo;
                        if (ref && ref.startsWith(prefix)) {
                            const seqPart = ref.replace(prefix, '');
                            const seqNum = parseInt(seqPart, 10);
                            if (!isNaN(seqNum) && seqNum > maxSeq) {
                                maxSeq = seqNum;
                            }
                        }
                    });
                    nextSeq = maxSeq + 1;
                } catch (err) {
                    console.warn(`Could not query ${config.firestoreCollection} for sequence, fallback to 1:`, err);
                }
            }

            const runStr = String(nextSeq).padStart(3, '0');
            const newRef = `${prefix}${runStr}`;
            const refEl = document.getElementById('refNo');
            if (refEl) refEl.value = newRef;
            if (typeof triggerLiveSync === 'function') triggerLiveSync();
            return newRef;
        }

        function formatNumber(num) {
            return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // --- Table Management & Pro Helpers ---
        function addTableRow(data = null) {
            const tbody = document.getElementById('itemsBody');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle; font-weight: 700; color: #374151; background-color: #f8fafc; font-size: 0.95rem;"></td>
                <td><input type="text" class="table-input item-custom-no" value="${data?.customNo || ''}" placeholder="เช่น 1.1" oninput="updateRowNumbers(); triggerLiveSync()"></td>
                <td><input type="text" class="table-input item-desc" value="${data?.desc || ''}" placeholder="ชื่อสินค้า/บริการ หรือรายละเอียดงาน" oninput="triggerLiveSync()"></td>
                <td><input type="number" class="table-input item-qty" value="${data?.qty ?? 1}" min="1" oninput="calculateRow(this); triggerLiveSync()" style="text-align: center;"></td>
                <td>
                    <select class="table-input item-unit" onchange="triggerLiveSync()">
                        <option value="ชุด" ${(!data || data?.unit === 'ชุด') ? 'selected' : ''}>ชุด</option>
                        <option value="ตัว" ${data?.unit === 'ตัว' ? 'selected' : ''}>ตัว</option>
                        <option value="ชิ้น" ${data?.unit === 'ชิ้น' ? 'selected' : ''}>ชิ้น</option>
                        <option value="เครื่อง" ${data?.unit === 'เครื่อง' ? 'selected' : ''}>เครื่อง</option>
                        <option value="กล่อง" ${data?.unit === 'กล่อง' ? 'selected' : ''}>กล่อง</option>
                        <option value="แพ็ค" ${data?.unit === 'แพ็ค' ? 'selected' : ''}>แพ็ค</option>
                        <option value="เส้น" ${data?.unit === 'เส้น' ? 'selected' : ''}>เส้น</option>
                        <option value="งาน" ${data?.unit === 'งาน' ? 'selected' : ''}>งาน</option>
                        <option value="งวด" ${data?.unit === 'งวด' ? 'selected' : ''}>งวด</option>
                        <option value="เมตร" ${data?.unit === 'เมตร' ? 'selected' : ''}>เมตร</option>
                        ${(data?.unit && !['ชุด','ตัว','ชิ้น','เครื่อง','กล่อง','แพ็ค','เส้น','งาน','งวด','เมตร'].includes(data.unit)) ? `<option value="${data.unit}" selected>${data.unit}</option>` : ''}
                    </select>
                </td>
                <td><input type="number" class="table-input item-price" value="${data?.price ?? 0}" min="0" step="0.01" oninput="calculateRow(this); triggerLiveSync()" style="text-align: right;"></td>
                <td style="vertical-align: middle; text-align: right; font-weight: 600; color: #1e293b;" class="item-total-text">0.00</td>
                <td class="col-action" style="vertical-align: middle;">
                    <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                        <button type="button" class="btn btn-outline" style="padding: 0.25rem 0.45rem; border-color: #cbd5e1; color: #475569;" onclick="duplicateTableRow(this)" title="คัดลอกรายการนี้"><i class='bx bx-copy'></i></button>
                        <div class="btn btn-outline drag-handle" style="padding: 0.25rem 0.45rem; cursor: grab; color: #64748b; border-color: #cbd5e1;" title="เลื่อนลำดับ"><i class='bx bx-grid-vertical'></i></div>
                        <button type="button" class="btn btn-danger" onclick="removeTableRow(this)" style="padding: 0.25rem 0.45rem;" title="ลบรายการ"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            updateRowNumbers();
            calculateRow(tr.querySelector('.item-qty'));
            triggerLiveSync();
            return tr;
        }

        function addHeaderRow(data = null) {
            const tbody = document.getElementById('itemsBody');
            
            const tr = document.createElement('tr');
            tr.className = 'is-header-row';
            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle; font-weight: 700; color: #374151; background-color: #f1f5f9; font-size: 0.95rem;"></td>
                <td><input type="text" class="table-input item-custom-no" value="${data?.customNo || ''}" placeholder="เช่น 1." oninput="updateRowNumbers(); triggerLiveSync()"></td>
                <td colspan="5" style="background-color: #f8fafc;">
                    <input type="text" class="table-input item-desc" value="${data?.desc || ''}" placeholder="📌 ชื่อหัวข้อ/หมวดหมู่หลัก (เช่น งานระบบไฟฟ้า)" style="font-weight: 700; color: #1A6FBF; font-size: 0.95rem;" oninput="triggerLiveSync()">
                    <input type="hidden" class="item-is-header" value="true">
                    <input type="hidden" class="table-input item-qty" value="0">
                    <input type="hidden" class="table-input item-unit" value="">
                    <input type="hidden" class="table-input item-price" value="0">
                    <div class="item-total-text" style="display: none;"></div>
                </td>
                <td class="col-action" style="vertical-align: middle; background-color: #f8fafc;">
                    <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                        <button type="button" class="btn btn-outline" style="padding: 0.25rem 0.45rem; border-color: #cbd5e1; color: #475569;" onclick="duplicateTableRow(this)" title="คัดลอกหมวดหมู่นี้"><i class='bx bx-copy'></i></button>
                        <div class="btn btn-outline drag-handle" style="padding: 0.25rem 0.45rem; cursor: grab; color: #64748b; border-color: #cbd5e1;" title="เลื่อนลำดับ"><i class='bx bx-grid-vertical'></i></div>
                        <button type="button" class="btn btn-danger" onclick="removeTableRow(this)" style="padding: 0.25rem 0.45rem;" title="ลบ"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            updateRowNumbers();
            calculateAll();
            triggerLiveSync();
            return tr;
        }

        function duplicateTableRow(btn) {
            const tr = btn.closest('tr');
            if (!tr) return;
            const customNo = tr.querySelector('.item-custom-no')?.value || '';
            const desc = tr.querySelector('.item-desc')?.value || '';
            const isHeader = tr.querySelector('.item-is-header') ? true : false;
            
            if (isHeader) {
                addHeaderRow({ customNo, desc });
            } else {
                const qty = tr.querySelector('.item-qty')?.value || '1';
                const unit = tr.querySelector('.item-unit')?.value || 'ชุด';
                const price = tr.querySelector('.item-price')?.value || '0';
                addTableRow({ customNo, desc, qty, unit, price });
            }
            showToast('คัดลอกรายการสำเร็จ', 'success');
        }

        function removeTableRow(btn) {
            const tbody = document.getElementById('itemsBody');
            if (tbody.children.length > 1) {
                btn.closest('tr').remove();
                updateRowNumbers();
                calculateAll();
                triggerLiveSync();
            } else {
                showToast("ต้องมีรายการอย่างน้อย 1 รายการ", "warning");
            }
        }

        function updateRowNumbers() {
            const rows = document.getElementById('itemsBody')?.children || [];
            let currentNo = 1;
            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                const customNo = tr.querySelector('.item-custom-no');
                let displayNoStr = '';
                
                if (customNo && customNo.value.trim() !== '') {
                    displayNoStr = customNo.value.trim();
                    tr.cells[0].innerHTML = '';
                } else {
                    displayNoStr = currentNo.toString();
                    tr.cells[0].innerHTML = currentNo++;
                }

                // Indent description in UI if it's a sub-item
                const descInput = tr.querySelector('.item-desc');
                if (descInput) {
                    if (displayNoStr.includes('.')) {
                        descInput.style.paddingLeft = '24px';
                    } else {
                        descInput.style.paddingLeft = '12px';
                    }
                }
            }
        }

        function calculateRow(input) {
            const tr = input.closest('tr');
            if (!tr) return;
            const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
            const price = parseFloat(tr.querySelector('.item-price')?.value) || 0;
            const total = qty * price;
            const totalEl = tr.querySelector('.item-total-text');
            if (totalEl) totalEl.innerText = formatNumber(total);
            tr.dataset.total = total;
            calculateAll();
        }

        function calculateAll() {
            const rows = document.getElementById('itemsBody')?.children || [];
            let itemsTotal = 0;

            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                const isHeader = tr.querySelector('.item-is-header') ? true : false;
                if (isHeader) continue;
                
                const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
                const price = parseFloat(tr.querySelector('.item-price')?.value) || 0;
                itemsTotal += (qty * price);
            }

            const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
            const afterDiscount = Math.max(0, itemsTotal - discount);
            
            const vatType = document.getElementById('vatTypeSelect')?.value || 'inclusive';
            let vat = 0;
            let grandTotal = afterDiscount;
            let subTotal = afterDiscount;
            
            if (vatType === 'inclusive') {
                vat = afterDiscount * (7 / 107);
                subTotal = afterDiscount - vat;
            } else if (vatType === 'exclusive') {
                vat = afterDiscount * 0.07;
                subTotal = afterDiscount;
                grandTotal = afterDiscount + vat;
            } else {
                vat = 0;
                subTotal = afterDiscount;
                grandTotal = afterDiscount;
            }

            const subEl = document.getElementById('subTotalDisplay');
            if (subEl) subEl.innerText = formatNumber(vatType === 'inclusive' ? subTotal : itemsTotal);
            const vatEl = document.getElementById('vatDisplay');
            if (vatEl) vatEl.innerText = formatNumber(vat);
            const grandEl = document.getElementById('grandTotalDisplay');
            if (grandEl) grandEl.innerText = formatNumber(grandTotal);

            const thaiEl = document.getElementById('thaiBahtText');
            if (thaiEl) thaiEl.innerText = `(${ArabicNumberToText(grandTotal.toFixed(2))})`;

            updateHeroDisplays(grandTotal, itemsTotal);
        }

        // --- Pro Workspace & Live Sync Helpers ---
        function triggerLiveSync() {
            if (liveSyncTimer) clearTimeout(liveSyncTimer);
            liveSyncTimer = setTimeout(() => {
                syncFormToPrintArea();
                applyLivePreview();
                updateHeroDisplays();
            }, 80);
        }

        function updateHeroDisplays(grandVal = null, subVal = null) {
            const rows = document.getElementById('itemsBody')?.children || [];
            let validCount = 0;
            for (let i = 0; i < rows.length; i++) {
                if (!rows[i].querySelector('.item-is-header')) validCount++;
            }
            const heroCount = document.getElementById('heroItemCount');
            if (heroCount) heroCount.innerText = validCount;

            const refVal = document.getElementById('refNo')?.value || '-';
            const heroRef = document.getElementById('heroRefNoDisplay');
            if (heroRef) heroRef.innerText = refVal;

            const dateVal = document.getElementById('docDate')?.value;
            const heroDate = document.getElementById('heroDateDisplay');
            if (heroDate) {
                if (dateVal) {
                    const d = new Date(dateVal);
                    heroDate.innerText = isNaN(d.getTime()) ? dateVal : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                } else {
                    heroDate.innerText = '-';
                }
            }

            const grandStr = document.getElementById('grandTotalDisplay')?.innerText || '0.00';
            const heroTotal = document.getElementById('heroGrandTotal');
            if (heroTotal) heroTotal.innerText = `฿${grandStr}`;

            const barTotal = document.getElementById('barGrandTotal');
            if (barTotal) barTotal.innerText = `฿${grandStr}`;
        }

        function setTermPreset(fieldId, value, btn) {
            const input = document.getElementById(fieldId);
            if (input) {
                input.value = value;
                triggerLiveSync();
                if (btn && btn.parentElement) {
                    btn.parentElement.querySelectorAll('.preset-chip, .pro-preset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            }
        }

        // --- Toggle Auto Page Break ---
        function toggleAutoPageBreak() {
            const checkbox = document.getElementById('settingAutoPageBreak');
            const manualInputs = document.getElementById('manualPageBreakInputs');
            if (checkbox && manualInputs) {
                manualInputs.style.display = checkbox.checked ? 'none' : 'block';
            }
        }

        // --- Height-Based Pagination: Measure actual rendered row heights ---
        function measureRowHeights(rowsDataArray, createTableHTML, fontFamily, fontSize, fontWeight, rowPadding, cellBorder, rowBorder) {
            // Create offscreen container matching pPageWrapper width
            const offscreen = document.createElement('div');
            offscreen.style.cssText = `position:absolute; left:-9999px; top:0; width:715px; visibility:hidden; font-family:${fontFamily}; font-size:${fontSize}px; font-weight:${fontWeight}; line-height:1.35; box-sizing:border-box; padding:0 24px; letter-spacing:normal;`;
            document.body.appendChild(offscreen);

            // Build a single table with all rows
            let tableHTML = createTableHTML(true);
            rowsDataArray.forEach(rd => { tableHTML += rd.html; });
            tableHTML += '</tbody></table>';
            offscreen.innerHTML = tableHTML;

            // Measure each row height (skip thead row)
            const measuredTrs = offscreen.querySelectorAll('tbody tr');
            const heights = [];
            measuredTrs.forEach((tr) => {
                heights.push(tr.offsetHeight || Math.ceil(tr.getBoundingClientRect().height));
            });

            // Also measure thead height
            const theadRow = offscreen.querySelector('thead tr');
            const theadHeight = theadRow ? (theadRow.offsetHeight || Math.ceil(theadRow.getBoundingClientRect().height)) : 30;

            document.body.removeChild(offscreen);
            return { heights, theadHeight };
        }

        // --- Height-Based Pagination: Measure fixed sections of the print area ---
        function measureFixedSections(fontSize) {
            // Read actual page dimensions from DOM for accurate measurement
            const pPageWrapperEl = document.getElementById('pPageWrapper');
            const isAutoFit = pPageWrapperEl && pPageWrapperEl.classList.contains('auto-fit-single-page');
            const pStyle = pPageWrapperEl ? window.getComputedStyle(pPageWrapperEl) : null;
            const PAGE_PADDING_TOP = pStyle ? parseFloat(pStyle.paddingTop) : (isAutoFit ? 19 : 57);
            const PAGE_PADDING_BOTTOM = pStyle ? parseFloat(pStyle.paddingBottom) : (isAutoFit ? 15 : 45);
            // Use A4 physical height (1123px) as the page boundary, not current scrollHeight
            const A4_PX = 1123;
            const usablePageHeight = A4_PX - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

            // Measure actual heights of fixed sections
            const headerSection = document.getElementById('pHeaderSection');
            const infoRow = document.getElementById('pInfoRow');
            const introText = document.getElementById('pIntroText');

            let headerHeight = 0;
            if (headerSection) headerHeight += headerSection.offsetHeight || (isAutoFit ? 60 : 80);
            if (infoRow) headerHeight += infoRow.offsetHeight || (isAutoFit ? 60 : 80);
            if (introText) headerHeight += introText.offsetHeight || 18;
            headerHeight += isAutoFit ? 6 : 16; // margins & gap between sections
            headerHeight = Math.max(headerHeight, isAutoFit ? 125 : 185);

            // Measure summary + remark + signature from DOM
            const summarySection = document.getElementById('pSummarySection') || document.getElementById('pSummaryTotalsBox')?.parentElement;
            const signatureSection = document.getElementById('pSignatureSection');

            let bottomHeight = 0;
            if (summarySection) bottomHeight += summarySection.offsetHeight || (isAutoFit ? 75 : 110);
            if (signatureSection) bottomHeight += signatureSection.offsetHeight || (isAutoFit ? 85 : 130);
            bottomHeight += isAutoFit ? 8 : 20; // margins & gap between sections
            bottomHeight = Math.max(bottomHeight, isAutoFit ? 160 : 225); // safe fallback minimum

            return {
                usablePageHeight,
                headerHeight,
                bottomHeight
            };
        }

        function appendRemarkPreset(text) {
            const textarea = document.getElementById('remark');
            if (!textarea) return;
            const current = textarea.value.trim();
            if (current.length > 0) {
                if (!current.includes(text)) {
                    textarea.value = current + '\n' + text;
                }
            } else {
                textarea.value = text;
            }
            triggerLiveSync();
            showToast('เพิ่มข้อกำหนดลงในหมายเหตุแล้ว', 'success');
        }

        let currentViewMode = 'editor';
        function setViewMode(mode) {
            if (mode !== 'preview') mode = 'editor';
            currentViewMode = mode;
            const workspace = document.getElementById('quoteWorkspace');
            const editorCol = document.getElementById('quoteEditorCol');
            const previewCol = document.getElementById('quotePreviewCol');
            const btnEditor = document.getElementById('btnModeEditor');
            const btnPreview = document.getElementById('btnModePreview');

            if (!workspace) return;
            workspace.classList.remove('mode-editor', 'mode-split', 'mode-preview');
            workspace.classList.add(`mode-${mode}`);

            if (mode === 'editor') {
                if (editorCol) editorCol.style.setProperty('display', 'block', 'important');
                if (previewCol) previewCol.style.setProperty('display', 'none', 'important');
            } else {
                if (editorCol) editorCol.style.setProperty('display', 'none', 'important');
                if (previewCol) previewCol.style.setProperty('display', 'flex', 'important');
            }

            if (btnEditor) btnEditor.classList.toggle('active', mode === 'editor');
            if (btnPreview) btnPreview.classList.toggle('active', mode === 'preview');

            try {
                localStorage.setItem('quote_view_mode', mode);
            } catch(e) {}

            if (mode === 'preview') {
                syncFormToPrintArea();
                setTimeout(() => {
                    fitPreviewToScreen();
                }, 50);
            }
        }

        let previewZoomLevel = 0.85;
        function setPreviewZoom(val) {
            previewZoomLevel = Math.max(0.4, Math.min(1.5, parseFloat(val)));
            const printArea = document.getElementById('printArea');
            const label = document.getElementById('previewZoomLabel');
            if (printArea) {
                printArea.style.transform = `scale(${previewZoomLevel})`;
                printArea.style.transformOrigin = 'top center';
            }
            if (label) {
                label.innerText = `${Math.round(previewZoomLevel * 100)}%`;
            }
        }

        function changePreviewZoom(delta) {
            setPreviewZoom(previewZoomLevel + delta);
        }

        function fitPreviewToScreen() {
            const viewport = document.getElementById('previewCanvasViewport');
            if (!viewport) return;
            const vpWidth = viewport.clientWidth - 40;
            const a4Width = 794;
            const optimalZoom = Math.min(1.0, Math.max(0.45, vpWidth / a4Width));
            setPreviewZoom(optimalZoom);
        }

        function copyRefNo() {
            const refVal = document.getElementById('refNo')?.value;
            if (refVal) {
                navigator.clipboard.writeText(refVal).then(() => {
                    showToast(`คัดลอกเลขที่ ${refVal} เรียบร้อย`, 'success');
                }).catch(() => {
                    showToast('ไม่สามารถคัดลอกได้', 'warning');
                });
            }
        }

        function copyBahtText() {
            const textEl = document.getElementById('thaiBahtText');
            if (textEl && textEl.innerText) {
                const clean = textEl.innerText.replace(/[()]/g, '').trim();
                navigator.clipboard.writeText(clean).then(() => {
                    showToast(`คัดลอกจำนวนเงินตัวอักษรเรียบร้อย`, 'success');
                }).catch(() => {
                    showToast('ไม่สามารถคัดลอกได้', 'warning');
                });
            }
        }

        function showToast(message, type = 'info') {
            let toast = document.getElementById('quoteProToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'quoteProToast';
                toast.style.cssText = `
                    position: fixed;
                    bottom: 85px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: #1e293b;
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 9999px;
                    font-size: 0.9rem;
                    font-family: 'Sarabun', sans-serif;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
                    z-index: 99999;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                document.body.appendChild(toast);
            }

            let icon = "<i class='bx bx-check-circle' style='color:#10b981; font-size:1.1rem;'></i>";
            if (type === 'warning') icon = "<i class='bx bx-error-circle' style='color:#f59e0b; font-size:1.1rem;'></i>";
            if (type === 'error') icon = "<i class='bx bx-x-circle' style='color:#ef4444; font-size:1.1rem;'></i>";

            toast.innerHTML = `${icon} <span>${message}</span>`;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';

            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
            }, 2500);
        }

        // --- Thai Baht Text Conversion ---
        function ArabicNumberToText(Number) {
            let NumberStr = Number.toString();
            let SplitNum = NumberStr.split('.');
            let BahtNum = SplitNum[0];
            let SatangNum = SplitNum.length > 1 ? SplitNum[1] : "00";

            if (SatangNum.length == 1) SatangNum += "0";
            if (BahtNum == "0" && SatangNum == "00") return "ศูนย์บาทถ้วน";

            const TxtNumArr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ"];
            const TxtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

            function ConvertText(numStr) {
                let text = "";
                let len = numStr.length;
                for (let i = 0; i < len; i++) {
                    let n = parseInt(numStr.charAt(i));
                    let digit = len - i - 1;
                    if (n !== 0) {
                        if (digit === 1 && n === 1) {
                            text += "สิบ";
                        } else if (digit === 1 && n === 2) {
                            text += "ยี่สิบ";
                        } else if (digit === 0 && n === 1 && len > 1 && numStr.charAt(i - 1) != '0') {
                            text += "เอ็ด";
                        } else {
                            text += TxtNumArr[n] + TxtDigitArr[digit];
                        }
                    }
                }
                return text;
            }

            let BahtText = "";
            if (parseInt(BahtNum) > 0) {
                if (BahtNum.length > 6) {
                    let millions = BahtNum.substring(0, BahtNum.length - 6);
                    let rest = BahtNum.substring(BahtNum.length - 6);
                    BahtText = ConvertText(millions) + "ล้าน" + ConvertText(rest) + "บาท";
                } else {
                    BahtText = ConvertText(BahtNum) + "บาท";
                }
            }

            let SatangText = "";
            if (parseInt(SatangNum) > 0) {
                SatangText = ConvertText(SatangNum) + "สตางค์";
            } else {
                SatangText = "ถ้วน";
            }

            return BahtText + SatangText;
        }

        // --- Synchronize form data to printArea ---
        function syncFormToPrintArea() {
            calculateAll(); // Recalculate everything

            // CRITICAL: Reset auto-fit class BEFORE measuring so DOM elements are at default size.
            // Without this, elements compacted by a previous sync will give smaller offsetHeights,
            // causing inconsistent pagination between modal preview and PDF export.
            const pPageWrapperForReset = document.getElementById('pPageWrapper');
            if (pPageWrapperForReset) pPageWrapperForReset.classList.remove('auto-fit-single-page');

            // Copy input values to Print Template
            document.getElementById('pToCompany').innerText = document.getElementById('toCompany').value || '-';
            document.getElementById('pToAddress').innerHTML = (document.getElementById('toAddress').value || '-').replace(/\n/g, '<br>');
            document.getElementById('pToAttn').innerText = document.getElementById('toAttn').value || '-';
            document.getElementById('pToTel').innerText = document.getElementById('toTel').value || '-';
            document.getElementById('pToEmail').innerText = document.getElementById('toEmail').value || '-';

            const taxIdVal = document.getElementById('toTaxId')?.value?.trim() || '';
            const pToTaxIdRow = document.getElementById('pToTaxIdRow');
            const pToTaxId = document.getElementById('pToTaxId');
            if (pToTaxIdRow && pToTaxId) {
                if (taxIdVal) {
                    pToTaxId.innerText = taxIdVal;
                    pToTaxIdRow.style.display = 'table-row';
                } else {
                    pToTaxId.innerText = '';
                    pToTaxIdRow.style.display = 'none';
                }
            }

            document.getElementById('pRefNo').innerText = document.getElementById('refNo').value;

            // Format Date for print template
            const docDateVal = document.getElementById('docDate').value;
            let dateObj = new Date(docDateVal);
            document.getElementById('pDocDate').innerText = isNaN(dateObj.getTime()) ? '-' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

            document.getElementById('pValidity').innerText = document.getElementById('termValidity').value || '-';
            document.getElementById('pDelivery').innerText = document.getElementById('termDelivery').value || '-';
            document.getElementById('pPayment').innerText = document.getElementById('termPayment').value || '-';

            // Sync Seller Name & Role to Print Area
            const sellerNameInput = document.getElementById('sellerName');
            const pSellerName = document.getElementById('pSellerName');
            if (sellerNameInput && pSellerName) {
                const sVal = sellerNameInput.value.trim();
                pSellerName.innerText = sVal ? (sVal.startsWith('(') ? sVal : `( ${sVal} )`) : '';
            }
            const sellerRoleInput = document.getElementById('sellerRole');
            const pSellerRole = document.getElementById('pSellerRole');
            if (sellerRoleInput && pSellerRole) {
                const docConfig = (typeof DOC_TYPE_CONFIG !== 'undefined' && DOC_TYPE_CONFIG[currentDocType]) ? DOC_TYPE_CONFIG[currentDocType] : null;
                const defaultRole = docConfig ? docConfig.sellerRole : 'ผู้เสนอราคา';
                pSellerRole.innerText = sellerRoleInput.value.trim() || defaultRole;
            }

            document.getElementById('pRemark').innerHTML = (document.getElementById('remark').value || '-').replace(/\n/g, '<br>');

            document.getElementById('pSubTotal').innerText = document.getElementById('subTotalDisplay').innerText;
            document.getElementById('pVat').innerText = document.getElementById('vatDisplay').innerText;
            document.getElementById('pGrandTotal').innerText = document.getElementById('grandTotalDisplay').innerText;
            document.getElementById('pBahtText').innerText = document.getElementById('thaiBahtText').innerText;

            // Generate Print Table rows
            // Generate Print Table rows
            const pTablesContainer = document.getElementById('pTablesContainer');
            if (pTablesContainer) pTablesContainer.innerHTML = ''; // Clear previous

            const primaryColor = document.getElementById('settingPrimaryColor')?.value || '#1A6FBF';
            const zebraStripes = document.getElementById('settingZebraStripes') ? document.getElementById('settingZebraStripes').checked : true;

            const fontFamilyRaw = document.getElementById('settingFontFamily') ? document.getElementById('settingFontFamily').value : 'Sarabun';
            const fontFamily = `'${fontFamilyRaw}', 'Sarabun', 'Tahoma', sans-serif`;
            const fontWeight = document.getElementById('settingFontWeight')?.value || '400';
            const tableBorder = document.getElementById('settingTableBorder') ? document.getElementById('settingTableBorder').value : 'rounded';
            const tableHeaderAlign = document.getElementById('settingTableHeaderAlign') ? document.getElementById('settingTableHeaderAlign').value : 'auto';
            const tableHeaderStyle = document.getElementById('settingTableHeaderStyle') ? document.getElementById('settingTableHeaderStyle').value : 'solid';

            let tableOuterBorder = '';
            let tableBorderRadius = '';
            let cellBorder = 'border: 0.5px solid #e2e8f0;';
            let thBorderRight = 'border-right: 1px solid rgba(255,255,255,0.18);';
            
            if (tableBorder === 'all') {
                tableOuterBorder = `border: 1px solid ${primaryColor};`;
                tableBorderRadius = '';
                cellBorder = 'border: 0.5px solid #cbd5e1;';
                thBorderRight = 'border-right: 1px solid rgba(255,255,255,0.3);';
            } else if (tableBorder === 'horizontal') {
                tableOuterBorder = `border-top: 2px solid ${primaryColor}; border-bottom: 2px solid ${primaryColor};`;
                tableBorderRadius = '';
                cellBorder = 'border-bottom: 0.5px solid #e2e8f0; border-top: none; border-left: none; border-right: none;';
                thBorderRight = 'border-right: none;';
            } else if (tableBorder === 'none') {
                tableOuterBorder = 'border: none;';
                tableBorderRadius = '';
                cellBorder = 'border: none;';
                thBorderRight = 'border-right: none;';
            } else { // rounded (default)
                tableOuterBorder = `border: 1px solid ${primaryColor};`;
                tableBorderRadius = 'border-radius: 6px; overflow: hidden;';
                cellBorder = 'border: 0.5px solid #e2e8f0;';
                thBorderRight = 'border-right: 1px solid rgba(255,255,255,0.18);';
            }

            let rowBorder = 'border-bottom: 0.5px solid #e2e8f0;';
            if (tableBorder === 'none') {
                rowBorder = '';
            }

            let thBgColor = primaryColor;
            let thTextColor = '#ffffff';
            let thBorderBottom = `1px solid ${primaryColor}`;
            let thBorderRightVal = thBorderRight;

            if (tableHeaderStyle === 'light') {
                let lightBg = 'rgba(26, 111, 191, 0.1)';
                const hex = primaryColor.replace('#', '');
                if(hex.length === 6 || hex.length === 8) {
                    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
                    lightBg = `rgba(${r}, ${g}, ${b}, 0.1)`;
                }
                thBgColor = lightBg;
                thTextColor = primaryColor;
                thBorderBottom = `1.5px solid ${primaryColor}`;
                if (tableBorder !== 'none' && tableBorder !== 'horizontal') {
                    const hex2 = primaryColor.replace('#', '');
                    const r = parseInt(hex2.slice(0, 2), 16), g = parseInt(hex2.slice(2, 4), 16), b = parseInt(hex2.slice(4, 6), 16);
                    thBorderRightVal = `1px solid rgba(${r}, ${g}, ${b}, 0.25)`;
                } else {
                    thBorderRightVal = 'none';
                }
            } else if (tableHeaderStyle === 'transparent') {
                thBgColor = 'transparent';
                thTextColor = '#1f2937';
                thBorderBottom = `2px solid ${primaryColor}`;
                thBorderRightVal = 'none';
            }

            if (tableBorder === 'none') {
                thBorderBottom = 'none';
                thBorderRightVal = 'none';
            }

            const thAlignSeq = tableHeaderAlign === 'auto' ? ['center', 'left', 'center', 'center', 'right', 'right'] : Array(6).fill(tableHeaderAlign);

            const userRowPadding = parseFloat(document.getElementById('settingTableRowPadding')?.value || 5);
            const userHdrPadding = parseFloat(document.getElementById('settingTableHeaderPadding')?.value || 6.5);
            let userFontSize = parseFloat(document.getElementById('settingFontSize')?.value || 11);
            let userHeaderFontSize = parseFloat(document.getElementById('settingHeaderFontSize')?.value || 11);
            const tableMarginTop = parseFloat(document.getElementById('settingTableMarginTop')?.value || 0);
            const page2TopSpacing = 28; // Spacing at top for page 2+ continuation pages

            const rows = document.getElementById('itemsBody').children;
            const totalItemsCount = rows.length;

            const useAutoPageBreak = document.getElementById('settingAutoPageBreak')
                ? document.getElementById('settingAutoPageBreak').checked
                : true;

            let rowPadding = userRowPadding;
            let hdrPadding = userHdrPadding;
            let fontSize = userFontSize;
            let headerFontSize = userHeaderFontSize;
            const curLineHeight = (useAutoPageBreak && totalItemsCount > 15) ? '1.18' : (useAutoPageBreak && totalItemsCount > 10 ? '1.24' : '1.32');

            // Intelligent Pre-Optimization:
            // When auto page break is enabled, adaptively tune padding & font sizes
            // to try fitting everything on 1 page. Works for up to ~32 items.
            if (useAutoPageBreak) {
                if (totalItemsCount <= 10) {
                    rowPadding = userRowPadding;
                    hdrPadding = userHdrPadding;
                    fontSize = userFontSize;
                    headerFontSize = userHeaderFontSize;
                } else if (totalItemsCount <= 14) {
                    rowPadding = Math.min(userRowPadding, 2.8);
                    hdrPadding = Math.min(userHdrPadding, 4.0);
                    fontSize = Math.min(userFontSize, 10.0);
                    headerFontSize = Math.min(userHeaderFontSize, 10.0);
                } else if (totalItemsCount <= 20) {
                    rowPadding = Math.min(userRowPadding, 1.8);
                    hdrPadding = Math.min(userHdrPadding, 3.0);
                    fontSize = Math.min(userFontSize, 9.2);
                    headerFontSize = Math.min(userHeaderFontSize, 9.4);
                } else if (totalItemsCount <= 25) {
                    rowPadding = Math.min(userRowPadding, 1.2);
                    hdrPadding = Math.min(userHdrPadding, 2.2);
                    fontSize = Math.min(userFontSize, 8.5);
                    headerFontSize = Math.min(userHeaderFontSize, 8.8);
                } else if (totalItemsCount <= 32) {
                    rowPadding = Math.min(userRowPadding, 0.8);
                    hdrPadding = Math.min(userHdrPadding, 1.8);
                    fontSize = Math.min(userFontSize, 8.0);
                    headerFontSize = Math.min(userHeaderFontSize, 8.2);
                }
            }

            const createTableHTML = (isFirst = true) => `
                <table class="pItemsTable" style="width: 100%; border-collapse: collapse; margin-top: ${isFirst ? tableMarginTop + 'px' : '0'}; margin-bottom: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; line-height: ${curLineHeight}; letter-spacing: normal; ${tableOuterBorder} ${tableBorderRadius}">
                    <thead>
                        <tr class="pTableHeadRow" style="background-color: ${thBgColor}; border-bottom: ${thBorderBottom};">
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[0]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; white-space: nowrap; border-right: ${thBorderRightVal}; width: 38px; line-height: ${curLineHeight} !important; vertical-align: middle;">ลำดับ</th>
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[1]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; border-right: ${thBorderRightVal}; line-height: ${curLineHeight} !important; vertical-align: middle;">รายการสินค้า / รายละเอียด</th>
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[2]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; white-space: nowrap; border-right: ${thBorderRightVal}; width: 50px; line-height: ${curLineHeight} !important; vertical-align: middle;">จำนวน</th>
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[3]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; white-space: nowrap; border-right: ${thBorderRightVal}; width: 50px; line-height: ${curLineHeight} !important; vertical-align: middle;">หน่วย</th>
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[4]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; white-space: nowrap; border-right: ${thBorderRightVal}; width: 95px; line-height: ${curLineHeight} !important; vertical-align: middle;">ราคา/หน่วย</th>
                            <th style="padding: ${hdrPadding}px 6px; text-align: ${thAlignSeq[5]}; font-size: ${headerFontSize}px; font-weight: 600; color: ${thTextColor} !important; background-color: ${thBgColor} !important; letter-spacing: normal; white-space: nowrap; width: 110px; line-height: ${curLineHeight} !important; vertical-align: middle;">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody style="letter-spacing: normal;">
            `;

            // ════════════════════════════════════════════════════════════
            // PAGINATION ENGINE: Build row data first, then paginate
            // ════════════════════════════════════════════════════════════
            const addThaiBreaks = (text) => text.replace(/([\u0E00-\u0E7F])([\u0E01-\u0E2E\u0E40-\u0E44])/g, '$1\u200B$2');

            // Helper to build rows data array
            const buildRowsData = (curRowPadding, curFontSize) => {
                let currentNo = 1;
                const arr = [];
                for (let i = 0; i < rows.length; i++) {
                    const tr = rows[i];
                    const customNo = tr.querySelector('.item-custom-no') ? tr.querySelector('.item-custom-no').value : '';
                    const desc = tr.querySelector('.item-desc').value || '-';
                    const qty = tr.querySelector('.item-qty').value || '0';
                    const unit = tr.querySelector('.item-unit').value || '-';
                    const price = parseFloat(tr.querySelector('.item-price').value || 0);
                    const totalText = tr.querySelector('.item-total-text').innerText;

                    let displayNo = '';
                    if (customNo && customNo.trim() !== '') {
                        displayNo = customNo;
                    } else {
                        displayNo = currentNo++;
                    }

                    const isHeader = tr.querySelector('.item-is-header') ? true : false;
                    const isSubItem = displayNo.toString().includes('.');
                    const descPadding = isSubItem ? '24px' : '6px';
                    const col1Content = isSubItem ? '' : displayNo;
                    const formattedDesc = addThaiBreaks(desc || '-');
                    const descContent = isSubItem ?
                        `<div style="display: flex; align-items: flex-start; gap: 6px;">
                            <span style="color: #374151; font-weight: 700; flex-shrink: 0;">${displayNo}</span>
                            <span>${formattedDesc}</span>
                        </div>` : formattedDesc;

                    // Generate the row HTML
                    let rowHTML = '';
                    if (isHeader) {
                        rowHTML = `
                            <tr style="${rowBorder} letter-spacing: normal; page-break-inside: avoid;">
                                <td style="padding: ${curRowPadding}px 6px; text-align: center; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; font-weight: 700; color: #374151; background-color: #f8fafc; letter-spacing: normal !important; white-space: nowrap;">${col1Content}</td>
                                <td colspan="5" style="padding: ${curRowPadding}px 6px ${curRowPadding}px ${descPadding}; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; font-weight: 700; color: #374151; letter-spacing: normal !important; text-align: left;">${descContent}</td>
                            </tr>
                        `;
                    } else {
                        rowHTML = `
                            <tr style="${rowBorder} letter-spacing: normal; page-break-inside: avoid;">
                                <td style="padding: ${curRowPadding}px 6px; text-align: center; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; font-weight: 700; color: #374151; background-color: #f8fafc; letter-spacing: normal !important; white-space: nowrap;">${col1Content}</td>
                                <td style="padding: ${curRowPadding}px 6px ${curRowPadding}px ${descPadding}; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">${descContent}</td>
                                <td style="padding: ${curRowPadding}px 6px; text-align: center; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important; white-space: nowrap;">${qty}</td>
                                <td style="padding: ${curRowPadding}px 6px; text-align: center; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important; white-space: nowrap;">${unit}</td>
                                <td style="padding: ${curRowPadding}px 6px; text-align: right; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important; white-space: nowrap;">${formatNumber(price)}</td>
                                <td style="padding: ${curRowPadding}px 6px; text-align: right; line-height: 1.32 !important; vertical-align: middle; ${cellBorder} font-weight: 500; font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important; white-space: nowrap;">${totalText}</td>
                            </tr>
                        `;
                    }
                    arr.push({ html: rowHTML, index: i });
                }
                return arr;
            };

            let rowsDataArray = buildRowsData(rowPadding, fontSize);

            // Step 2: Intelligent Layout & Pagination Determination
            const pPageWrapper = document.getElementById('pPageWrapper');
            let pages = []; // array of { rowHTMLs: string[], fillerCount: number }

            if (useAutoPageBreak && rowsDataArray.length > 0) {
                // Try 1-page auto-fit first (candidate for any count, activate compact styles)
                if (pPageWrapper) pPageWrapper.classList.add('auto-fit-single-page');

                let measured = measureRowHeights(rowsDataArray, createTableHTML, fontFamily, fontSize, fontWeight, rowPadding, cellBorder, rowBorder);
                let sections = measureFixedSections(fontSize);
                let theadH = measured.theadHeight;
                let totalRowsH = measured.heights.reduce((sum, h) => sum + h, 0);
                let totalEstimatedH = sections.headerHeight + theadH + totalRowsH + sections.bottomHeight + tableMarginTop;

                // ── SMART 1-PAGE DECISION WITH PRINT-ZOOM ──
                // If total items is <= 22, it is guaranteed to fit on 1 page with compact styles & zoom
                const pageRatio = totalEstimatedH / sections.usablePageHeight;
                const fits1Page = (totalItemsCount <= 22) ? true : (pageRatio <= 1.05);

                if (fits1Page) {
                    // Calculate how much we need to zoom down for print
                    const printZoom = (totalEstimatedH > sections.usablePageHeight || totalItemsCount >= 16)
                        ? Math.max(0.78, Math.min(1.0, (sections.usablePageHeight - 12) / Math.max(totalEstimatedH, sections.usablePageHeight * 1.04)))
                        : 1.0;

                    if (pPageWrapper) {
                        pPageWrapper.style.setProperty('--print-zoom', printZoom.toFixed(4));
                        pPageWrapper.style.zoom = printZoom < 1.0 ? printZoom.toFixed(4) : '';
                    }

                    // ── CASE 1: CONFIRMED 1-PAGE AUTO-FIT ──
                    if (pPageWrapper) pPageWrapper.classList.add('auto-fit-single-page');
                    pages.push({
                        rowHTMLs: rowsDataArray.map(r => r.html),
                        fillerCount: 0
                    });
                } else {
                    // ── CASE 2: MULTI-PAGE BALANCED DOCUMENT ──
                    if (pPageWrapper) {
                        pPageWrapper.classList.remove('auto-fit-single-page');
                        pPageWrapper.style.removeProperty('--print-zoom');
                        pPageWrapper.style.zoom = '';
                    }

                    // Keep compacted padding/font sizes for multi-page layout.
                    // Re-measure with current sizes (already set above) to get accurate row heights.
                    measured = measureRowHeights(rowsDataArray, createTableHTML, fontFamily, fontSize, fontWeight, rowPadding, cellBorder, rowBorder);
                    sections = measureFixedSections(fontSize);
                    theadH = measured.theadHeight;

                    const PAGE_USABLE = sections.usablePageHeight;
                    const page1Budget = PAGE_USABLE - sections.headerHeight - tableMarginTop - 30;
                    const middlePageBudget = PAGE_USABLE - page2TopSpacing - theadH - 30;
                    const lastPageBudget = PAGE_USABLE - page2TopSpacing - theadH - sections.bottomHeight - 30;

                    // Calculate maximum rows on Page 1:
                    let maxP1Rows = 0;
                    let p1CumH = theadH;
                    for (let i = 0; i < rowsDataArray.length; i++) {
                        const h = measured.heights[i] || 26;
                        if (p1CumH + h <= page1Budget) {
                            p1CumH += h;
                            maxP1Rows++;
                        } else {
                            break;
                        }
                    }

                    // Strict Anti-Orphan Rule: Page 2 MUST have at least 5 rows (or 38% of rows)
                    const totalCount = rowsDataArray.length;
                    const minLastPageItems = Math.min(totalCount, Math.max(5, Math.floor(totalCount * 0.38)));
                    let targetP1Count = Math.min(maxP1Rows, totalCount - minLastPageItems);
                    if (targetP1Count < 1) targetP1Count = Math.max(1, Math.floor(totalCount / 2));

                    // Verify if items from targetP1Count to end fit within lastPageBudget
                    let p2CumH = 0;
                    for (let i = targetP1Count; i < totalCount; i++) {
                        p2CumH += (measured.heights[i] || 26);
                    }

                    if (p2CumH <= lastPageBudget) {
                        // Balanced 2 Pages
                        const p1Rows = rowsDataArray.slice(0, targetP1Count).map(r => r.html);
                        const p2Rows = rowsDataArray.slice(targetP1Count).map(r => r.html);
                        pages.push({ rowHTMLs: p1Rows, fillerCount: 0 });
                        pages.push({ rowHTMLs: p2Rows, fillerCount: 0 });
                    } else {
                        // 3+ Pages
                        let remainingIndices = rowsDataArray.map((_, idx) => idx);
                        let currentPageNum = 1;

                        while (remainingIndices.length > 0) {
                            let remainingH = theadH;
                            for (let idx of remainingIndices) {
                                remainingH += (measured.heights[idx] || 26);
                            }

                            if (currentPageNum > 1 && remainingH <= lastPageBudget) {
                                pages.push({
                                    rowHTMLs: remainingIndices.map(idx => rowsDataArray[idx].html),
                                    fillerCount: 0
                                });
                                remainingIndices = [];
                                break;
                            }

                            const currentBudget = (currentPageNum === 1) ? page1Budget : middlePageBudget;
                            let pageRowHTMLs = [];
                            let accH = theadH;

                            while (remainingIndices.length > 0) {
                                const nextIdx = remainingIndices[0];
                                const rowH = measured.heights[nextIdx] || 26;
                                if (accH + rowH > currentBudget && pageRowHTMLs.length > 0) {
                                    break;
                                }
                                if (remainingIndices.length <= 5 && pageRowHTMLs.length >= 8) {
                                    break;
                                }
                                pageRowHTMLs.push(rowsDataArray[nextIdx].html);
                                accH += rowH;
                                remainingIndices.shift();
                            }

                            pages.push({ rowHTMLs: pageRowHTMLs, fillerCount: 0 });
                            currentPageNum++;
                        }
                    }
                }
            } else {
                // COUNT-BASED PAGINATION (manual fallback if auto is unchecked)
                if (pPageWrapper) pPageWrapper.classList.remove('auto-fit-single-page');
                const ITEMS_PAGE1 = parseInt(document.getElementById('settingItemsPage1')?.value || 14, 10);
                const ITEMS_PAGE2_PLUS = parseInt(document.getElementById('settingItemsPage2Plus')?.value || 18, 10);
                let currentPage = 1;
                let currentPageRows = [];

                for (let i = 0; i < rowsDataArray.length; i++) {
                    const maxForPage = (currentPage === 1) ? ITEMS_PAGE1 : ITEMS_PAGE2_PLUS;
                    if (currentPageRows.length >= maxForPage) {
                        pages.push({ rowHTMLs: [...currentPageRows], fillerCount: 0 });
                        currentPage++;
                        currentPageRows = [];
                    }
                    currentPageRows.push(rowsDataArray[i].html);
                }
                if (currentPageRows.length > 0) {
                    const minFillers = Math.max(0, 5 - currentPageRows.length);
                    pages.push({ rowHTMLs: [...currentPageRows], fillerCount: minFillers });
                }
            }

            // Handle empty state (no items)
            if (pages.length === 0) {
                pages.push({ rowHTMLs: [], fillerCount: 5 });
            }

            // Step 3: Build final HTML from page data
            const createFillerRow = (idx) => {
                const zebraColor = (zebraStripes && idx % 2 === 1) ? '#f8fafc' : 'transparent';
                return `
                    <tr style="${rowBorder} letter-spacing: normal; background-color: ${zebraColor}; page-break-inside: avoid;">
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; text-align: center; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: ${Math.max(2, rowPadding - 1)}px 6px; line-height: 1.35 !important; vertical-align: middle; ${cellBorder} font-family: ${fontFamily} !important; font-size: inherit; letter-spacing: normal !important;">&nbsp;</td>
                    </tr>
                `;
            };

            if (pTablesContainer) {
                let finalHTML = '';
                pages.forEach((page, pageIdx) => {
                    const isFirst = (pageIdx === 0);
                    const isLast = (pageIdx === pages.length - 1);

                    let tableHTML = createTableHTML(isFirst);

                    // Add data rows with zebra striping per page
                    page.rowHTMLs.forEach((rowHtml, rowIdx) => {
                        const zebraColor = (zebraStripes && rowIdx % 2 === 1) ? '#f8fafc' : 'transparent';
                        // Inject background-color into the existing tr style
                        tableHTML += rowHtml.replace(
                            'page-break-inside: avoid;',
                            `background-color: ${zebraColor}; page-break-inside: avoid;`
                        );
                    });

                    // Add filler rows
                    for (let f = 0; f < page.fillerCount; f++) {
                        tableHTML += createFillerRow(page.rowHTMLs.length + f);
                    }

                    tableHTML += `</tbody></table>`;

                    finalHTML += `<div class="print-page" style="display:block; ${isFirst ? '' : 'padding-top: ' + page2TopSpacing + 'px;'} page-break-after:${isLast ? 'auto' : 'always'}; break-after:${isLast ? 'auto' : 'page'};">${tableHTML}</div>`;
                    if (!isLast) {
                        finalHTML += `<div class="preview-page-break-indicator" style="margin: 16px 0; border-top: 2px dashed #cbd5e1; text-align: center; position: relative;"><span style="position: relative; top: -10px; background: #fff; padding: 0 12px; font-size: 10px; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px;">✂️ สิ้นสุดหน้าที่ ${pageIdx + 1} (ขึ้นหน้าใหม่) ✂️</span></div>`;
                    }
                });
                pTablesContainer.innerHTML = finalHTML;
            }
        }

        // --- Native Vector PDF Export via window.print() ---
        // Produces 100% editable, selectable, copy-able Thai text PDF (Chrome Native Vector)
        // Layout matches the live preview exactly - no conversion, no rasterization
        function exportToPDF() {
            const printArea = document.getElementById('printArea');
            if (!printArea) {
                window.print();
                return;
            }

            // 1. Make printArea visible (required for layout calculation)
            printArea.style.display = 'block';

            // 2. Create a dedicated print-only wrapper that @media print rules target
            let wrapper = document.getElementById('__printOnlyWrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = '__printOnlyWrapper';
                wrapper.style.cssText = 'display:none; position:absolute; top:0; left:0; width:100%; z-index:99999; background:white; overflow:visible;';
                document.body.appendChild(wrapper);
            }

            // 3. Sync pagination in original DOM context (same as modal preview)
            //    MUST happen before moving printArea to ensure consistent measurements.
            try {
                applyLivePreview();
                syncFormToPrintArea();
            } catch (e) {
                console.warn("Pre-move sync warning:", e);
            }

            // 4. Move printArea into wrapper temporarily
            const originalParent = printArea.parentNode;
            const originalNextSibling = printArea.nextSibling;
            wrapper.style.display = 'block';
            wrapper.appendChild(printArea);

            // 5. Wait for fonts, reset transform, then print (no second sync to avoid context mismatch)
            const executePrint = () => {
                setTimeout(() => {
                    // CRITICAL: Reset transform so the PDF is not affected by the preview zoom scale.
                    const savedTransform = printArea.style.transform;
                    const savedTransformOrigin = printArea.style.transformOrigin;
                    const savedWidth = printArea.style.width;
                    const savedMarginBottom = printArea.style.marginBottom;
                    printArea.style.transform = 'none';
                    printArea.style.transformOrigin = 'unset';
                    printArea.style.width = '';
                    printArea.style.marginBottom = '';

                    // Set document title = filename so Chrome uses it when "Save as PDF"
                    const refNo = document.getElementById('refNo')?.value || 'Quotation';
                    const clientName = (document.getElementById('toCompany')?.value || '').trim();
                    const filenameStr = clientName ? `${refNo} ${clientName}` : refNo;
                    const originalTitle = document.title;
                    document.title = filenameStr;

                    try {
                        window.print();
                    } catch (printErr) {
                        console.error("Native window.print() failed:", printErr);
                    }

                    // 6. After print dialog closes, restore everything
                    setTimeout(() => {
                        document.title = originalTitle;
                        printArea.style.transform = savedTransform;
                        printArea.style.transformOrigin = savedTransformOrigin;
                        printArea.style.width = savedWidth;
                        printArea.style.marginBottom = savedMarginBottom;
                        printArea.style.display = 'block';
                        if (originalNextSibling) {
                            originalParent.insertBefore(printArea, originalNextSibling);
                        } else {
                            originalParent.appendChild(printArea);
                        }
                        wrapper.style.display = 'none';

                        if (typeof saveQuotationToHistory === 'function') {
                            saveQuotationToHistory();
                        }
                        if (typeof triggerQuotationTelegramNotification === 'function') {
                            triggerQuotationTelegramNotification();
                        } else if (typeof window.triggerQuotationTelegramNotification === 'function') {
                            window.triggerQuotationTelegramNotification();
                        }
                    }, 500);
                }, 150);
            };

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(executePrint).catch(() => executePrint());
            } else {
                executePrint();
            }
        }
        window.exportToPDF = exportToPDF;

        // --- Recipient Profile Management ---
        function getSavedRecipients() {
            const stored = localStorage.getItem('saved_recipients');
            return stored ? JSON.parse(stored) : [];
        }

        // Stub to prevent ReferenceError from old calls, now handled by the modal.
        function loadSavedRecipientsDropdown() {}

        // Cache for firebase-loaded recipients
        let firestoreRecipientsCache = [];
        let allRecipientsFiltered = []; // used by select handler

        async function openRecipientModal() {
            document.getElementById('recipientModal').style.display = 'flex';
            document.getElementById('recipientSearchInput').value = '';
            
            // Show loading state
            const container = document.getElementById('recipientCardsContainer');
            container.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #6b7280;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i><br>กำลังโหลดข้อมูล...</div>`;
            
            firestoreRecipientsCache = [];
            
            // Fetch institution details
            try {
                const instSnap = await getDoc(doc(db, 'material_settings', 'institution_details'));
                if (instSnap.exists()) {
                    const data = instSnap.data();
                    Object.keys(data).forEach(name => {
                        const d = data[name] || {};
                        firestoreRecipientsCache.push({
                            toCompany: name,
                            toAddress: d.address || '',
                            toAttn: d.contact || '',
                            toTel: d.phone || '',
                            toEmail: d.email || '',
                            _source: 'school'
                        });
                    });
                }
            } catch(e) { console.error('Error loading institution_details:', e); }
            
            // Fetch company details
            try {
                const compSnap = await getDoc(doc(db, 'company_material_settings', 'company_details'));
                if (compSnap.exists()) {
                    const data = compSnap.data();
                    Object.keys(data).forEach(name => {
                        const d = data[name] || {};
                        firestoreRecipientsCache.push({
                            toCompany: name,
                            toAddress: d.address || '',
                            toAttn: d.contact || '',
                            toTel: d.phone || '',
                            toEmail: d.email || '',
                            _source: 'company'
                        });
                    });
                }
            } catch(e) { console.error('Error loading company_details:', e); }
            
            renderRecipientCards();
        }

        function closeRecipientModal() {
            document.getElementById('recipientModal').style.display = 'none';
        }

        function renderRecipientCards(filterText = '') {
            const container = document.getElementById('recipientCardsContainer');
            
            // Combine: localStorage + firestore (institutions + companies)
            const saved = getSavedRecipients().map(r => ({ ...r, _source: 'saved' }));
            const allRecipients = [
                ...saved,
                ...firestoreRecipientsCache
            ];
            
            if (allRecipients.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #6b7280;">ไม่มีผู้รับที่บันทึกไว้<br><span style="font-size: 0.85rem;">(กรอกข้อมูลผู้รับแล้วกด "บันทึกผู้รับนี้" เพื่อบันทึก)</span></div>`;
                return;
            }
            
            const filtered = allRecipients.filter(r => {
                if (!filterText) return true;
                return (r.toCompany || '').toLowerCase().includes(filterText.toLowerCase())
                    || (r.toAttn || '').toLowerCase().includes(filterText.toLowerCase());
            });
            
            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #6b7280;">ไม่พบรายชื่อที่ค้นหา</div>`;
                return;
            }
            
            const sourceBadge = {
                saved:   { label: 'บันทึกไว้', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                school:  { label: 'สถานศึกษา', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                company: { label: 'บริษัทเอกชน', bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' }
            };
            
            allRecipientsFiltered = filtered; // store globally for click handler
            
            let html = '';
            filtered.forEach((r, idx) => {
                const badge = sourceBadge[r._source] || sourceBadge.saved;
                const safeName = (r.toCompany || '').replace(/'/g, "\\'");
                const deleteBtn = r._source === 'saved'
                    ? `<button onclick="event.stopPropagation(); deleteRecipientItem('${r._source}', '${safeName}')" style="background:#fee2e2;color:#ef4444;border:none;padding:8px;border-radius:6px;cursor:pointer;transition:background 0.2s;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'" title="ลบ"><i class='bx bx-trash' style="font-size:1.1rem;"></i></button>`
                    : '';
                
                html += `
                    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;cursor:pointer;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);"
                        onmouseover="this.style.borderColor='var(--primary-color,#1A6FBF)';this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';"
                        onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px 0 rgba(0,0,0,0.05)';"
                        onclick="selectRecipientByIndex(${idx})"
                    >
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                <span style="font-weight:600;font-size:1.05rem;color:#1e293b;">${r.toCompany}</span>
                                <span style="font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:12px;border:1px solid ${badge.border};background:${badge.bg};color:${badge.color};white-space:nowrap;">${badge.label}</span>
                            </div>
                            <div style="font-size:0.85rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:350px;">
                                ${r.toAttn ? `<span style="margin-right:8px;"><i class='bx bx-user'></i> ${r.toAttn}</span>` : ''}
                                ${r.toTel  ? `<span><i class='bx bx-phone'></i> ${r.toTel}</span>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            ${deleteBtn}
                            <button class="btn btn-primary" style="padding:6px 16px;font-size:0.9rem;border-radius:6px;display:flex;align-items:center;gap:4px;"><i class='bx bx-check'></i> เลือก</button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }

        function filterRecipientCards() {
            const text = document.getElementById('recipientSearchInput').value;
            renderRecipientCards(text);
        }

        function selectRecipientFromModal(index) {
            const recipients = getSavedRecipients();
            const r = recipients[index];
            if (r) {
                document.getElementById('toCompany').value = r.toCompany || '';
                document.getElementById('toAddress').value = r.toAddress || '';
                document.getElementById('toAttn').value = r.toAttn || '';
                document.getElementById('toTel').value = r.toTel || '';
                document.getElementById('toEmail').value = r.toEmail || '';
            }
            closeRecipientModal();
        }

        function selectRecipientByIndex(idx) {
            const r = allRecipientsFiltered[idx];
            if (r) {
                document.getElementById('toCompany').value = r.toCompany || '';
                document.getElementById('toAddress').value = r.toAddress || '';
                document.getElementById('toAttn').value = r.toAttn || '';
                document.getElementById('toTel').value = r.toTel || '';
                document.getElementById('toEmail').value = r.toEmail || '';
                if (typeof applyLivePreview === 'function') applyLivePreview();
            }
            closeRecipientModal();
        }

        function selectRecipientByData(idx, firestoreCache, savedList, source, name) {
            let r = null;
            if (source === 'saved') {
                r = savedList.find(s => s.toCompany === name);
            } else {
                r = firestoreCache.find(s => s.toCompany === name && s._source === source);
            }
            if (r) {
                document.getElementById('toCompany').value = r.toCompany || '';
                document.getElementById('toAddress').value = r.toAddress || '';
                document.getElementById('toAttn').value = r.toAttn || '';
                document.getElementById('toTel').value = r.toTel || '';
                document.getElementById('toEmail').value = r.toEmail || '';
                if (typeof applyLivePreview === 'function') applyLivePreview();
            }
            closeRecipientModal();
        }

        async function deleteRecipientItem(source, companyName) {
            if (!confirm(`คุณต้องการลบรายชื่อ "${companyName}" ใช่หรือไม่?`)) return;

            if (source === 'saved') {
                let recipients = getSavedRecipients();
                recipients = recipients.filter(r => r.toCompany !== companyName);
                localStorage.setItem('saved_recipients', JSON.stringify(recipients));

                if (currentUser) {
                    try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                            savedRecipients: recipients,
                            saved_recipients: recipients
                        }, { merge: true });
                    } catch (err) {
                        console.error('Error syncing recipient deletion:', err);
                    }
                }
            } else if (source === 'school') {
                try {
                    await setDoc(doc(db, 'material_settings', 'institution_details'), {
                        [companyName]: deleteField()
                    }, { merge: true });
                    firestoreRecipientsCache = firestoreRecipientsCache.filter(r => !(r.toCompany === companyName && r._source === 'school'));
                } catch (err) {
                    console.error('Error deleting institution detail:', err);
                }
            } else if (source === 'company') {
                try {
                    await setDoc(doc(db, 'company_material_settings', 'company_details'), {
                        [companyName]: deleteField()
                    }, { merge: true });
                    firestoreRecipientsCache = firestoreRecipientsCache.filter(r => !(r.toCompany === companyName && r._source === 'company'));
                } catch (err) {
                    console.error('Error deleting company detail:', err);
                }
            }

            renderRecipientCards(document.getElementById('recipientSearchInput').value);
        }

        async function deleteRecipientFromModal(index) {
            const recipients = getSavedRecipients();
            const r = recipients[index];
            if (r) {
                await deleteRecipientItem('saved', r.toCompany);
            }
        }

        async function saveCurrentRecipient() {
            const toCompany = document.getElementById('toCompany').value.trim();
            const toAddress = document.getElementById('toAddress').value.trim();
            const toAttn = document.getElementById('toAttn').value.trim();
            const toTel = document.getElementById('toTel').value.trim();
            const toEmail = document.getElementById('toEmail').value.trim();
            const toTaxId = document.getElementById('toTaxId')?.value?.trim() || '';

            if (!toCompany) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'กรุณากรอกข้อมูล',
                        text: 'กรุณากรอกชื่อบริษัท / ผู้รับ เพื่อใช้บันทึกข้อมูล',
                        confirmButtonColor: '#1A6FBF'
                    });
                } else {
                    alert("กรุณากรอกชื่อบริษัท / ผู้รับ เพื่อใช้บันทึกข้อมูล");
                }
                return;
            }

            const recipients = getSavedRecipients();
            const newRecipient = { toCompany, toAddress, toAttn, toTel, toEmail, toTaxId };

            // Check if already exists, update it, otherwise add new
            const existingIndex = recipients.findIndex(r => r.toCompany.toLowerCase() === toCompany.toLowerCase());
            if (existingIndex > -1) {
                recipients[existingIndex] = newRecipient;
            } else {
                recipients.push(newRecipient);
            }

            localStorage.setItem('saved_recipients', JSON.stringify(recipients));

            // Sync to Firestore cloud if logged in
            if (currentUser) {
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        savedRecipients: recipients
                    }, { merge: true });
                    // Also update company_details collection so it syncs back to materials_purchasing_company.html
                    try {
                        await setDoc(doc(db, 'company_material_settings', 'company_details'), {
                            [toCompany]: {
                                address: toAddress,
                                contact: toAttn,
                                phone: toTel,
                                email: toEmail,
                                taxId: toTaxId
                            }
                        }, { merge: true });
                    } catch(e) {}

                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'success',
                            title: 'บันทึกสำเร็จ!',
                            html: `บันทึกข้อมูลผู้รับ<br><b style="color: var(--primary-color, #1A6FBF);">"${toCompany}"</b><br>ไปยังคลาวด์เรียบร้อยแล้ว`,
                            confirmButtonColor: '#1A6FBF',
                            timer: 2000,
                            timerProgressBar: true
                        });
                    } else {
                        alert(`บันทึกและซิงค์ข้อมูลผู้รับ "${toCompany}" ไปยังคลาวด์สำเร็จ!`);
                    }
                } catch (err) {
                    console.error("Firestore sync failed:", err);
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'info',
                            title: 'บันทึกในเครื่องสำเร็จ',
                            html: `บันทึกข้อมูลผู้รับ <b>"${toCompany}"</b> สำเร็จในเครื่อง<br><small style="color: #64748b;">(การเชื่อมต่อคลาวด์ขัดข้องชั่วคราว)</small>`,
                            confirmButtonColor: '#1A6FBF'
                        });
                    } else {
                        alert(`บันทึกข้อมูลผู้รับ "${toCompany}" สำเร็จในเครื่อง (แต่เชื่อมต่อระบบคลาวด์ล้มเหลว)`);
                    }
                }
            } else {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'บันทึกสำเร็จ!',
                        html: `บันทึกข้อมูลผู้รับ<br><b style="color: var(--primary-color, #1A6FBF);">"${toCompany}"</b><br>ในเครื่องนี้เรียบร้อยแล้ว`,
                        confirmButtonColor: '#1A6FBF',
                        timer: 2000,
                        timerProgressBar: true
                    });
                } else {
                    alert(`บันทึกข้อมูลผู้รับ "${toCompany}" สำเร็จในเครื่องนี้ (กรุณาเข้าสู่ระบบเพื่อใช้งานข้ามเครื่อง)`);
                }
            }
        }

        // --- Template Customization ---
        // A variable to store the original parent of printArea
        let printAreaOriginalParent = null;
        let printAreaOriginalNextSibling = null;

        // --- Per-Company Multi-Signature Library & Draggable Management ---
        window.savedSignaturesByCompany = {};
        window.activeSignatures = [];

        function getCurrentIssuerName() {
            const displayEl = document.getElementById('currentIssuerDisplay');
            const name = displayEl ? displayEl.innerText.trim() : '';
            return (name && !name.includes('กรุณาเลือกบริษัท')) ? name : 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
        }

        function getSavedSignatures(targetCompany) {
            const company = targetCompany || getCurrentIssuerName();
            if (!window.savedSignaturesByCompany) {
                window.savedSignaturesByCompany = {};
            }

            if (!window.savedSignaturesByCompany[company]) {
                const stored = localStorage.getItem('saved_signatures_by_company');
                if (stored) {
                    try {
                        window.savedSignaturesByCompany = JSON.parse(stored);
                    } catch(e) {
                        window.savedSignaturesByCompany = {};
                    }
                }
            }

            if (!window.savedSignaturesByCompany[company] || !Array.isArray(window.savedSignaturesByCompany[company])) {
                window.savedSignaturesByCompany[company] = [];
            }

            return window.savedSignaturesByCompany[company] || [];
        }

        function renderSavedSignaturesGallery() {
            const container = document.getElementById('savedSignaturesGallery');
            if (!container) return;

            const company = getCurrentIssuerName();
            const list = getSavedSignatures(company);
            if (list.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 12px; color: #94a3b8; font-size: 0.78rem; background: white; border: 1px dashed #cbd5e1; border-radius: 8px;">
                        ยังไม่มีรูปในคลังของ "${company}" <button type="button" onclick="document.getElementById('settingSignatureFileInput').click()" style="color: #16a34a; background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline;">+ อัปโหลดรูปแรก</button>
                    </div>
                `;
                renderActiveSignaturesList();
                return;
            }

            let html = '';
            list.forEach((sig) => {
                const isAdded = (window.activeSignatures && window.activeSignatures.some(a => a.sigId === sig.id || a.dataUrl === sig.dataUrl));
                const borderStyle = isAdded ? 'border: 2px solid #2563eb; background: #eff6ff; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);' : 'border: 1px solid #cbd5e1; background: white;';
                const badge = isAdded ? `<span style="position: absolute; top: 3px; right: 3px; background: #2563eb; color: white; border-radius: 4px; padding: 1px 4px; font-size: 8px; font-weight: 700;">บนเอกสาร</span>` : '';

                html += `
                    <div style="position: relative; border-radius: 8px; padding: 4px 6px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 68px; ${borderStyle}"
                        onclick="toggleSignatureToDocument('${sig.id}')"
                        title="${isAdded ? 'คลิกเพื่อนำออก หรือจัดการด้านล่าง' : 'คลิกเพื่อเพิ่มใส่เอกสาร'}"
                        onmouseover="if(!${isAdded}) this.style.borderColor='#2563eb'"
                        onmouseout="if(!${isAdded}) this.style.borderColor='#cbd5e1'"
                    >
                        ${badge}
                        <div style="flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${sig.dataUrl}" style="max-height: 38px; max-width: 100%; object-fit: contain;">
                        </div>
                        <div style="font-size: 0.68rem; color: #334155; font-weight: 600; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${sig.name || 'รูปภาพ'}
                        </div>
                        <button type="button" onclick="event.stopPropagation(); deleteSignatureFromGallery('${sig.id}')" title="ลบออกจากคลังของบริษัทนี้" style="position: absolute; top: 3px; left: 3px; background: rgba(239, 68, 68, 0.12); color: #ef4444; border: none; border-radius: 4px; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                            &times;
                        </button>
                    </div>
                `;
            });

            container.innerHTML = html;
            renderActiveSignaturesList();
        }

        let autoSaveTemplateTimeout = null;
        function autoSaveCurrentIssuerTemplate() {
            const currentIssuerDisplay = getCurrentIssuerName();
            if (!currentIssuerDisplay || currentIssuerDisplay.includes('กรุณาเลือกบริษัท')) return;

            if (!window.quotationTemplates) window.quotationTemplates = {};

            const useSigImg = document.getElementById('settingUseSignatureImage') ? document.getElementById('settingUseSignatureImage').checked : (window.activeSignatures && window.activeSignatures.length > 0);

            const templateSettings = { 
                autoPageBreak: document.getElementById('settingAutoPageBreak') ? document.getElementById('settingAutoPageBreak').checked : true,
                itemsPage1: document.getElementById('settingItemsPage1')?.value || '14',
                itemsPage2Plus: document.getElementById('settingItemsPage2Plus')?.value || '18',
                primaryColor: document.getElementById('settingPrimaryColor')?.value || '#1A6FBF',
                showLogo: document.getElementById('settingShowLogo') ? document.getElementById('settingShowLogo').checked : true,
                logoSize: document.getElementById('settingLogoSize')?.value || '56',
                fontSize: document.getElementById('settingFontSize')?.value || '11',
                headerFontSize: document.getElementById('settingHeaderFontSize')?.value || '11',
                rowPadding: document.getElementById('settingTableRowPadding')?.value || '5',
                hdrPadding: document.getElementById('settingTableHeaderPadding')?.value || '6.5',
                tableMarginTop: document.getElementById('settingTableMarginTop')?.value || '0',
                sellerName: document.getElementById('settingSellerName')?.value || '',
                sellerRole: document.getElementById('settingSellerRole')?.value || 'ผู้เสนอราคา',
                leftSignerTitle: document.getElementById('settingLeftSignerTitle')?.value || 'ผู้สั่งซื้อ',
                sincerelyYours: document.getElementById('settingSincerelyYours')?.value || 'ขอแสดงความนับถือ / Sincerely Yours,',
                headerDirection: document.getElementById('settingHeaderDirection')?.value || 'row',
                headerRows: document.getElementById('settingHeaderRows')?.value || '3',
                headerTextAlign: document.getElementById('settingHeaderTextAlign')?.value || 'auto',
                headerVAlign: document.getElementById('settingHeaderVAlign')?.value || 'flex-start',
                fontFamily: document.getElementById('settingFontFamily')?.value || "Sarabun",
                fontWeight: document.getElementById('settingFontWeight')?.value || "400",
                tableBorder: document.getElementById('settingTableBorder')?.value || 'rounded',
                tableHeaderAlign: document.getElementById('settingTableHeaderAlign')?.value || 'auto',
                tableHeaderStyle: document.getElementById('settingTableHeaderStyle')?.value || 'solid',
                zebraStripes: document.getElementById('settingZebraStripes') ? document.getElementById('settingZebraStripes').checked : true,
                showRemark: document.getElementById('settingShowRemark') ? document.getElementById('settingShowRemark').checked : true,
                bahtTextPosition: document.getElementById('settingBahtTextPosition')?.value || 'right',
                showHeaderLine: document.getElementById('settingShowHeaderLine') ? document.getElementById('settingShowHeaderLine').checked : true,
                signatureFormat: document.getElementById('settingSignatureFormat')?.value || 'full',
                signatureSize: document.getElementById('settingSignatureSize')?.value || '40',
                useSignatureImage: useSigImg,
                activeSignatures: JSON.parse(JSON.stringify(window.activeSignatures || [])),
                signatureImage: (window.activeSignatures && window.activeSignatures[0]) ? window.activeSignatures[0].dataUrl : '',
                signatureImageSize: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].size || 45) : 45,
                signatureOffsetX: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].offsetX || 0) : 0,
                signatureOffsetY: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].offsetY || 0) : 0,
                introText: document.getElementById('settingIntroText')?.value || 'ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:',
                issuerName: currentIssuerDisplay,
                headerLayout: typeof getCurrentHeaderLayout === 'function' ? getCurrentHeaderLayout() : null
            };

            window.quotationTemplates[currentIssuerDisplay] = templateSettings;
            localStorage.setItem('quotationTemplates', JSON.stringify(window.quotationTemplates));
            localStorage.setItem('quotation_preferred_font', templateSettings.fontFamily || 'Sarabun');
            localStorage.setItem('quotation_global_typography', JSON.stringify({
                fontFamily: templateSettings.fontFamily,
                fontWeight: templateSettings.fontWeight,
                fontSize: templateSettings.fontSize,
                headerFontSize: templateSettings.headerFontSize,
                rowPadding: templateSettings.rowPadding,
                hdrPadding: templateSettings.hdrPadding,
                tableBorder: templateSettings.tableBorder,
                tableHeaderStyle: templateSettings.tableHeaderStyle,
                tableHeaderAlign: templateSettings.tableHeaderAlign,
                zebraStripes: templateSettings.zebraStripes,
                autoPageBreak: templateSettings.autoPageBreak
            }));

            // Debounced cloud sync
            if (autoSaveTemplateTimeout) clearTimeout(autoSaveTemplateTimeout);
            autoSaveTemplateTimeout = setTimeout(async () => {
                if (currentUser) {
                    try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                            quotationTemplates: window.quotationTemplates,
                            savedSignaturesByCompany: window.savedSignaturesByCompany
                        }, { merge: true });
                    } catch (err) {
                        console.error("Auto cloud sync quotation template error:", err);
                    }
                }
            }, 800);
        }

        function toggleSignatureToDocument(sigId) {
            const list = getSavedSignatures();
            const sig = list.find(s => s.id === sigId);
            if (!sig) return;

            if (!window.activeSignatures) window.activeSignatures = [];
            const existingIndex = window.activeSignatures.findIndex(a => a.sigId === sig.id);

            if (existingIndex >= 0) {
                // Remove if already on document
                window.activeSignatures.splice(existingIndex, 1);
            } else {
                // Add new layer
                const offsetCount = window.activeSignatures.length;
                window.activeSignatures.push({
                    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    sigId: sig.id,
                    name: sig.name || 'ลายเซ็น',
                    dataUrl: sig.dataUrl,
                    size: 45,
                    offsetX: offsetCount === 0 ? 0 : (offsetCount === 1 ? 35 : -35),
                    offsetY: offsetCount === 0 ? 0 : 5
                });
            }

            const useSigCheckbox = document.getElementById('settingUseSignatureImage');
            if (useSigCheckbox) {
                useSigCheckbox.checked = (window.activeSignatures.length > 0);
            }

            syncQuickSignatureToggle();
            renderSavedSignaturesGallery();
            applyLivePreview();
            autoSaveCurrentIssuerTemplate();
        }

        function renderActiveSignaturesList() {
            const listContainer = document.getElementById('activeSignaturesList');
            const countLabel = document.getElementById('activeSigCount');
            if (countLabel) countLabel.innerText = window.activeSignatures ? window.activeSignatures.length : 0;
            if (!listContainer) return;

            if (!window.activeSignatures || window.activeSignatures.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 10px; color: #94a3b8; font-size: 0.75rem; background: white; border: 1px dashed #cbd5e1; border-radius: 6px;">
                        ยังไม่มีรูปที่เลือกใส่เอกสาร (คลิกรูปในคลังด้านบนเพื่อใส่)
                    </div>
                `;
                return;
            }

            let html = '';
            window.activeSignatures.forEach((item, index) => {
                html += `
                    <div class="active-sig-card" data-id="${item.id}" style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                                <span style="font-size: 0.72rem; font-weight: 700; background: #e2e8f0; color: #475569; border-radius: 4px; padding: 1px 5px;">#${index + 1}</span>
                                <img src="${item.dataUrl}" style="height: 22px; max-width: 40px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px; background: #f8fafc;">
                                <span style="font-size: 0.78rem; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">${item.name || 'รูปภาพ'}</span>
                            </div>
                            <button type="button" onclick="removeActiveSignature('${item.id}')" title="นำรูปนี้ออกจากเอกสาร" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer; font-weight: 600;">
                                <i class='bx bx-trash'></i> นำออก
                            </button>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;">
                            <div style="font-size: 0.72rem; color: #64748b;">
                                <div style="display: flex; justify-content: space-between; font-weight: 600;">
                                    <span>แนวตั้ง (Y):</span>
                                    <span id="lbl_y_${item.id}">${item.offsetY || 0}px</span>
                                </div>
                                <input type="range" id="input_y_${item.id}" min="-60" max="40" value="${item.offsetY || 0}" step="1" style="width: 100%; height: 4px; cursor: pointer; padding: 0;" oninput="updateActiveSigProperty('${item.id}', 'offsetY', this.value)">
                            </div>
                            <div style="font-size: 0.72rem; color: #64748b;">
                                <div style="display: flex; justify-content: space-between; font-weight: 600;">
                                    <span>แนวนอน (X):</span>
                                    <span id="lbl_x_${item.id}">${item.offsetX || 0}px</span>
                                </div>
                                <input type="range" id="input_x_${item.id}" min="-120" max="120" value="${item.offsetX || 0}" step="1" style="width: 100%; height: 4px; cursor: pointer; padding: 0;" oninput="updateActiveSigProperty('${item.id}', 'offsetX', this.value)">
                            </div>
                        </div>
                        <div style="font-size: 0.72rem; color: #64748b;">
                            <div style="display: flex; justify-content: space-between; font-weight: 600;">
                                <span>ขนาดความสูง:</span>
                                <span id="lbl_sz_${item.id}">${item.size || 45}px</span>
                            </div>
                            <input type="range" id="input_sz_${item.id}" min="20" max="140" value="${item.size || 45}" step="1" style="width: 100%; height: 4px; cursor: pointer; padding: 0;" oninput="updateActiveSigProperty('${item.id}', 'size', this.value)">
                        </div>
                    </div>
                `;
            });

            listContainer.innerHTML = html;
        }

        function removeActiveSignature(activeId) {
            if (!window.activeSignatures) return;
            window.activeSignatures = window.activeSignatures.filter(a => a.id !== activeId);
            const useSigCheckbox = document.getElementById('settingUseSignatureImage');
            if (useSigCheckbox) {
                useSigCheckbox.checked = (window.activeSignatures.length > 0);
            }
            syncQuickSignatureToggle();
            renderSavedSignaturesGallery();
            applyLivePreview();
            autoSaveCurrentIssuerTemplate();
        }

        function updateActiveSigProperty(activeId, prop, value) {
            if (!window.activeSignatures) return;
            const item = window.activeSignatures.find(a => a.id === activeId);
            if (!item) return;

            const intVal = parseInt(value) || 0;
            item[prop] = intVal;

            if (prop === 'offsetY') {
                const lbl = document.getElementById(`lbl_y_${activeId}`);
                if (lbl) lbl.innerText = intVal + 'px';
                const el = document.getElementById(`pSellerSigWrapper_${activeId}`);
                if (el) el.style.bottom = `${-4 + intVal}px`;
            } else if (prop === 'offsetX') {
                const lbl = document.getElementById(`lbl_x_${activeId}`);
                if (lbl) lbl.innerText = intVal + 'px';
                const el = document.getElementById(`pSellerSigWrapper_${activeId}`);
                if (el) el.style.transform = `translate(calc(-50% + ${intVal}px), 0)`;
            } else if (prop === 'size') {
                const lbl = document.getElementById(`lbl_sz_${activeId}`);
                if (lbl) lbl.innerText = intVal + 'px';
                const img = document.getElementById(`sig_img_${activeId}`);
                if (img) img.style.height = `${intVal}px`;
            }

            autoSaveCurrentIssuerTemplate();
        }

        function resetAllSignatureOffsets() {
            if (!window.activeSignatures) return;
            window.activeSignatures.forEach((item, index) => {
                item.offsetX = index === 0 ? 0 : (index === 1 ? 35 : -35);
                item.offsetY = 0;
            });
            renderActiveSignaturesList();
            applyLivePreview();
            autoSaveCurrentIssuerTemplate();
        }

        async function deleteSignatureFromGallery(sigId) {
            const company = getCurrentIssuerName();
            if (!confirm(`ต้องการลบรูปภาพนี้ออกจากคลังของ "${company}" ใช่หรือไม่?`)) return;

            let list = getSavedSignatures(company);
            list = list.filter(s => s.id !== sigId);
            window.savedSignaturesByCompany[company] = list;
            localStorage.setItem('saved_signatures_by_company', JSON.stringify(window.savedSignaturesByCompany));

            // Also remove from active signatures if present
            if (window.activeSignatures) {
                window.activeSignatures = window.activeSignatures.filter(a => a.sigId !== sigId);
                const useSigCheckbox = document.getElementById('settingUseSignatureImage');
                if (useSigCheckbox) {
                    useSigCheckbox.checked = (window.activeSignatures.length > 0);
                }
                syncQuickSignatureToggle();
            }

            if (currentUser) {
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        savedSignaturesByCompany: window.savedSignaturesByCompany
                    }, { merge: true });
                } catch(e) {
                    console.error("Error updating saved signatures in cloud:", e);
                }
            }

            renderSavedSignaturesGallery();
            applyLivePreview();
            autoSaveCurrentIssuerTemplate();
        }

        function handleSignatureFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 3 * 1024 * 1024) {
                alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 3MB');
                return;
            }

            const company = getCurrentIssuerName();
            const currentList = getSavedSignatures(company);
            const defaultName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `ลายเซ็น/ตราประทับ ${currentList.length + 1}`;
            const sigName = prompt(`ตั้งชื่อรูปนี้สำหรับ ${company}:`, defaultName);
            if (sigName === null) return; // user cancelled

            const reader = new FileReader();
            reader.onload = async function(e) {
                const dataUrl = e.target.result;
                const newSig = {
                    id: 'sig_' + Date.now(),
                    name: sigName.trim() || defaultName,
                    dataUrl: dataUrl,
                    createdAt: new Date().toISOString()
                };

                let list = getSavedSignatures(company);
                list.push(newSig);
                window.savedSignaturesByCompany[company] = list;
                localStorage.setItem('saved_signatures_by_company', JSON.stringify(window.savedSignaturesByCompany));

                // Auto-add newly uploaded signature to active layers for this company
                if (!window.activeSignatures) window.activeSignatures = [];
                const offsetCount = window.activeSignatures.length;
                window.activeSignatures.push({
                    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    sigId: newSig.id,
                    name: newSig.name,
                    dataUrl: dataUrl,
                    size: 45,
                    offsetX: offsetCount === 0 ? 0 : (offsetCount === 1 ? 35 : -35),
                    offsetY: 0
                });

                const useSigCheckbox = document.getElementById('settingUseSignatureImage');
                if (useSigCheckbox) useSigCheckbox.checked = true;
                syncQuickSignatureToggle();

                if (currentUser) {
                    try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                            savedSignaturesByCompany: window.savedSignaturesByCompany
                        }, { merge: true });
                    } catch(err) {
                        console.error("Error saving signature to cloud:", err);
                    }
                }

                renderSavedSignaturesGallery();
                applyLivePreview();
                autoSaveCurrentIssuerTemplate();

                event.target.value = '';
            };
            reader.readAsDataURL(file);
        }

        function handleUseSignatureChange(checked) {
            const settingCheckbox = document.getElementById('settingUseSignatureImage');
            const quickToggle = document.getElementById('quickToggleSignature');
            if (settingCheckbox) settingCheckbox.checked = checked;
            if (quickToggle) quickToggle.checked = checked;

            if (checked) {
                // If checked ON and no active signatures currently, restore the first saved signature or prompt
                if (!window.activeSignatures || window.activeSignatures.length === 0) {
                    const list = getSavedSignatures();
                    if (list && list.length > 0) {
                        const first = list[0];
                        window.activeSignatures = [{
                            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            sigId: first.id,
                            name: first.name || 'ลายเซ็น',
                            dataUrl: first.dataUrl,
                            size: 45,
                            offsetX: 0,
                            offsetY: 0
                        }];
                    } else {
                        // If no saved signatures yet in gallery, check if template or shop had one
                        const currentIssuerDisplay = document.getElementById('currentIssuerDisplay')?.innerText?.trim() || '';
                        let shopSig = '';
                        if (currentIssuerDisplay && registeredShopsCache) {
                            const shop = registeredShopsCache.find(s => (s.name || s) === currentIssuerDisplay);
                            if (shop && (shop.signature || shop.signatureImage)) {
                                shopSig = shop.signature || shop.signatureImage;
                            }
                        }
                        if (shopSig) {
                            window.activeSignatures = [{
                                id: 'act_' + Date.now(),
                                name: 'ลายเซ็นหลัก',
                                dataUrl: shopSig,
                                size: 45,
                                offsetX: 0,
                                offsetY: 0
                            }];
                        }
                    }
                }
            }

            syncQuickSignatureToggle();
            renderSavedSignaturesGallery();
            renderActiveSignaturesList();
            applyLivePreview();
            autoSaveCurrentIssuerTemplate();
        }

        function toggleQuickSignature(checked) {
            handleUseSignatureChange(checked);
        }

        function syncQuickSignatureToggle() {
            const settingCheckbox = document.getElementById('settingUseSignatureImage');
            const quickToggle = document.getElementById('quickToggleSignature');
            const quickLabel = document.getElementById('quickToggleSignatureLabel');
            const count = (window.activeSignatures && window.activeSignatures.length) || 0;
            if (settingCheckbox && quickToggle) {
                quickToggle.checked = settingCheckbox.checked;
            }
            if (quickLabel) {
                quickLabel.innerText = count > 1 ? `✍️ ลายเซ็น/ตราประทับ (${count} รูป)` : (count === 1 ? '✍️ ลายเซ็น/ตราประทับ (1 รูป)' : '✍️ ลายเซ็นอิเล็กทรอนิกส์');
            }
        }

        function openSignatureUploaderDirect() {
            openTemplateSettingsModal();
            setTimeout(() => {
                const box = document.getElementById('savedSignaturesGallery');
                if (box) {
                    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    renderSavedSignaturesGallery();
                }
            }, 150);
        }

        // --- Interactive Dragging on Live Preview Signature ---
        function initSignatureDraggable() {
            const container = document.getElementById('pSellerSignatureSpace');
            if (!container || container._dragBound) return;
            container._dragBound = true;

            let activeDragItem = null;
            let startMouseX = 0, startMouseY = 0;
            let startOffsetX = 0, startOffsetY = 0;
            let currentActiveObj = null;

            const onMouseDown = (e) => {
                const targetWrapper = e.target.closest('.sig-drag-item');
                if (!targetWrapper) return;

                const activeId = targetWrapper.dataset.id;
                if (!activeId || !window.activeSignatures) return;

                currentActiveObj = window.activeSignatures.find(a => a.id === activeId);
                if (!currentActiveObj) return;

                e.preventDefault();
                e.stopPropagation();
                activeDragItem = targetWrapper;

                startMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                startMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

                startOffsetX = currentActiveObj.offsetX || 0;
                startOffsetY = currentActiveObj.offsetY || 0;

                targetWrapper.style.cursor = 'grabbing';
                targetWrapper.style.outline = '2px dashed #2563eb';
                targetWrapper.style.background = 'rgba(37, 99, 235, 0.08)';
                targetWrapper.style.borderRadius = '4px';

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('touchmove', onMouseMove, { passive: false });
                document.addEventListener('touchend', onMouseUp);
            };

            const onMouseMove = (e) => {
                if (!activeDragItem || !currentActiveObj) return;
                if (e.cancelable) e.preventDefault();

                const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

                const deltaX = clientX - startMouseX;
                const deltaY = -(clientY - startMouseY);

                currentActiveObj.offsetX = Math.max(-120, Math.min(120, Math.round(startOffsetX + deltaX)));
                currentActiveObj.offsetY = Math.max(-60, Math.min(40, Math.round(startOffsetY + deltaY)));

                activeDragItem.style.bottom = `${-4 + currentActiveObj.offsetY}px`;
                activeDragItem.style.transform = `translate(calc(-50% + ${currentActiveObj.offsetX}px), 0)`;

                // Update slider inputs in sidebar
                const xInput = document.getElementById(`input_x_${currentActiveObj.id}`);
                const yInput = document.getElementById(`input_y_${currentActiveObj.id}`);
                const xLbl = document.getElementById(`lbl_x_${currentActiveObj.id}`);
                const yLbl = document.getElementById(`lbl_y_${currentActiveObj.id}`);
                if (xInput) xInput.value = currentActiveObj.offsetX;
                if (yInput) yInput.value = currentActiveObj.offsetY;
                if (xLbl) xLbl.innerText = currentActiveObj.offsetX + 'px';
                if (yLbl) yLbl.innerText = currentActiveObj.offsetY + 'px';
            };

            const onMouseUp = () => {
                if (!activeDragItem) return;
                activeDragItem.style.cursor = 'grab';
                activeDragItem.style.outline = 'none';
                activeDragItem.style.background = 'transparent';
                activeDragItem = null;
                currentActiveObj = null;

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('touchmove', onMouseMove);
                document.removeEventListener('touchend', onMouseUp);

                autoSaveCurrentIssuerTemplate();
            };

            container.addEventListener('mousedown', onMouseDown);
            container.addEventListener('touchstart', onMouseDown, { passive: false });
        }

        async function fetchRegisteredShops() {
            try {
                const shopsSnap = await getDoc(doc(db, 'material_settings', 'registered_shops'));
                if (shopsSnap.exists()) {
                    const data = shopsSnap.data();
                    if (data && Array.isArray(data.shops) && data.shops.length > 0) {
                        registeredShopsCache = data.shops;
                        try {
                            localStorage.setItem('registered_shops', JSON.stringify(registeredShopsCache));
                        } catch(e) {}
                    }
                }
            } catch (err) {
                console.warn("Could not load registered shops from Firestore:", err);
            }

            // Check localStorage fallback
            if (!registeredShopsCache || registeredShopsCache.length === 0) {
                try {
                    const localShops = localStorage.getItem('registered_shops');
                    if (localShops) {
                        const parsed = JSON.parse(localShops);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            registeredShopsCache = parsed;
                        }
                    }
                } catch(e) {}
            }

            // Check sidebar workspaces fallback if registered_shops was empty
            if (!registeredShopsCache || registeredShopsCache.length === 0) {
                try {
                    const wsRaw = localStorage.getItem('mentra_managed_workspaces');
                    if (wsRaw) {
                        const parsedWs = JSON.parse(wsRaw);
                        if (Array.isArray(parsedWs) && parsedWs.length > 0) {
                            registeredShopsCache = parsedWs.map(w => ({
                                name: w.name || 'บริษัทของท่าน',
                                themeColor: w.color || '#1A6FBF',
                                signer: w.signer || '',
                                logo: w.logo || '',
                                taxId: w.taxId || '',
                                phone: w.phone || '',
                                address: w.address || ''
                            }));
                        }
                    }
                } catch(e) {}
            }

            // Clean default company fallback without personal names
            if (!registeredShopsCache || registeredShopsCache.length === 0) {
                registeredShopsCache = [
                    {
                        name: "บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)",
                        themeColor: "#1A6FBF",
                        signer: "",
                        logo: "../../assets/img/logo.png",
                        taxId: "",
                        phone: "",
                        address: ""
                    }
                ];
            }
            return registeredShopsCache;
        }

        function renderIssuerCards() {
            const container = document.getElementById('issuerCardsContainer');
            if (!container) return;

            if (!registeredShopsCache || registeredShopsCache.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #64748b;">
                        <i class='bx bx-buildings' style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                        ไม่พบข้อมูลบริษัท/ร้านค้าที่ตั้งค่าไว้
                        <div style="margin-top: 12px;">
                            <button type="button" onclick="openIssuerSelectionModal()" class="btn btn-outline" style="font-size: 0.82rem; padding: 6px 14px; border-radius: 8px;">
                                <i class='bx bx-refresh'></i> โหลดข้อมูลใหม่
                            </button>
                        </div>
                    </div>`;
                return;
            }

            const currentName = (document.getElementById('currentIssuerDisplay')?.innerText || '').trim();

            let html = '';
            registeredShopsCache.forEach((shop) => {
                const sName = typeof shop === 'string' ? shop : (shop.name || '-');
                const sColor = (shop && shop.themeColor) || '#1A6FBF';
                const sLogo = (shop && shop.logo) 
                    ? `<img src="${shop.logo}" style="max-height: 36px; max-width: 36px; object-fit: contain;">` 
                    : `<i class='bx bx-buildings' style="font-size: 1.5rem; color: ${sColor};"></i>`;
                const hasSig = (shop && (shop.signature || shop.signatureImage)) || 
                               (window.quotationTemplates && window.quotationTemplates[sName] && window.quotationTemplates[sName].signatureImage);
                const sigBadge = hasSig ? `<span style="font-size: 0.72rem; color: #16a34a; background: #dcfce7; padding: 1px 6px; border-radius: 4px; font-weight: 600; margin-left: 6px;">✍️ มีลายเซ็น</span>` : '';
                
                const isSelected = currentName === sName;
                const borderStyle = isSelected ? `border: 2px solid ${sColor}; background: #eff6ff;` : `border: 1.5px solid #e2e8f0; background: white;`;

                html += `
                    <div onclick="selectIssuerFromModal('${sName.replace(/'/g, "\\'")}')" 
                        style="${borderStyle} border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 14px; position: relative;"
                        onmouseover="this.style.borderColor='${sColor}'; this.style.boxShadow='0 4px 14px rgba(0,0,0,0.08)';" 
                        onmouseout="this.style.borderColor='${isSelected ? sColor : '#e2e8f0'}'; this.style.boxShadow='none';">
                        <div style="width: 48px; height: 48px; border-radius: 10px; background: #f8fafc; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; flex-shrink: 0;">
                            ${sLogo}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 0.96rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center;">
                                <span>${sName}</span> ${sigBadge} ${isSelected ? '<span style="font-size: 0.7rem; color: #2563eb; background: #dbeafe; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">✓ ปัจจุบัน</span>' : ''}
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${shop.taxId ? `TAX: ${shop.taxId}` : ''} ${(shop.taxId && (shop.tel || shop.phone)) ? ' | ' : ''}${shop.tel || shop.phone || ''}
                            </div>
                        </div>
                        <i class='bx bx-chevron-right' style="font-size: 1.5rem; color: #94a3b8;"></i>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        async function openIssuerSelectionModal() {
            const modal = document.getElementById('issuerSelectionModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.zIndex = '999999';
            }
            const container = document.getElementById('issuerCardsContainer');
            if (!container) return;

            // Render existing cache if available immediately
            if (registeredShopsCache && registeredShopsCache.length > 0) {
                renderIssuerCards();
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 36px 20px; color: #1A6FBF;">
                        <i class='bx bx-loader-alt bx-spin' style="font-size: 2.2rem;"></i>
                        <div style="margin-top: 10px; font-weight: 600; color: #64748b; font-size: 0.95rem;">กำลังโหลดรายชื่อบริษัท / ร้านค้า...</div>
                    </div>`;
                await fetchRegisteredShops();
                renderIssuerCards();
            }
        }

        function closeIssuerSelectionModal() {
            const modal = document.getElementById('issuerSelectionModal');
            if (modal) modal.style.display = 'none';
        }

        function selectIssuerFromModal(companyName) {
            try {
                localStorage.setItem('selected_issuer_company', companyName);
            } catch(e) {}
            applyIssuerTemplate(companyName);
            closeIssuerSelectionModal();
            if (typeof triggerLiveSync === 'function') triggerLiveSync();
            if (typeof showToast === 'function') {
                showToast(`เลือกผู้ออกเอกสารเป็น "${companyName}" เรียบร้อยแล้ว`, 'success');
            }
        }

        // Export immediately to window so buttons work without delay
        window.fetchRegisteredShops = fetchRegisteredShops;
        window.renderIssuerCards = renderIssuerCards;
        window.openIssuerSelectionModal = openIssuerSelectionModal;
        window.closeIssuerSelectionModal = closeIssuerSelectionModal;
        window.selectIssuerFromModal = selectIssuerFromModal;

        function applyIssuerTemplate(companyName) {
            const safeCompanyName = companyName || 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
            
            // 1. Apply the static theme (logo, colors, address, etc.)
            applyIssuerTheme(safeCompanyName);
            
            // 2. Prepare default customizable template settings based on the shop's defaults
            let shopTheme = '#1A6FBF';
            let currentUserName = (currentUser ? (currentUser.displayName || currentUser.email) : '') || '';
            let shopSigner = currentUserName ? `( ${currentUserName} )` : '';
            let shopHasLogo = true;
            let shopSignature = '';
            
            if (safeCompanyName && registeredShopsCache) {
                const shop = registeredShopsCache.find(s => {
                    const sName = typeof s === 'string' ? s : (s.name || '');
                    return sName.trim() === String(safeCompanyName).trim();
                });
                if (shop && typeof shop !== 'string') {
                    if (shop.themeColor) shopTheme = shop.themeColor;
                    if (shop.signer) shopSigner = shop.signer;
                    if (!shop.logo) shopHasLogo = false;
                    if (shop.signature) shopSignature = shop.signature;
                    if (shop.signatureImage) shopSignature = shop.signatureImage;
                }
            }

            if (shopSignature) {
                const compSigs = getSavedSignatures(safeCompanyName);
                if (compSigs.length === 0) {
                    if (!window.savedSignaturesByCompany) window.savedSignaturesByCompany = {};
                    window.savedSignaturesByCompany[safeCompanyName] = [{
                        id: 'sig_' + Date.now(),
                        name: 'ลายเซ็นหลัก',
                        dataUrl: shopSignature,
                        createdAt: new Date().toISOString()
                    }];
                    localStorage.setItem('saved_signatures_by_company', JSON.stringify(window.savedSignaturesByCompany));
                }
            }

            // Load global user typography preferences and main template
            let globalTypo = {};
            try {
                const raw = localStorage.getItem('quotation_global_typography');
                if (raw) globalTypo = JSON.parse(raw);
            } catch(e) {}

            const mainCompanyName = 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
            const primaryTemplate = (window.quotationTemplates && (window.quotationTemplates[mainCompanyName] || Object.values(window.quotationTemplates)[0])) || {};

            const preferredFont = globalTypo.fontFamily || primaryTemplate.fontFamily || localStorage.getItem('quotation_preferred_font') || 'Sarabun';
            const preferredWeight = globalTypo.fontWeight || primaryTemplate.fontWeight || '400';
            const preferredSize = globalTypo.fontSize || primaryTemplate.fontSize || 11;
            const preferredHeaderSize = globalTypo.headerFontSize || primaryTemplate.headerFontSize || 11;
            const preferredRowPadding = globalTypo.rowPadding !== undefined ? globalTypo.rowPadding : (primaryTemplate.rowPadding !== undefined ? primaryTemplate.rowPadding : 5);
            const preferredHdrPadding = globalTypo.hdrPadding !== undefined ? globalTypo.hdrPadding : (primaryTemplate.hdrPadding !== undefined ? primaryTemplate.hdrPadding : 6.5);
            const preferredBorder = globalTypo.tableBorder || primaryTemplate.tableBorder || 'rounded';
            const preferredHeaderStyle = globalTypo.tableHeaderStyle || primaryTemplate.tableHeaderStyle || 'solid';
            const preferredHeaderAlign = globalTypo.tableHeaderAlign || primaryTemplate.tableHeaderAlign || 'auto';
            const preferredZebra = globalTypo.zebraStripes !== undefined ? globalTypo.zebraStripes : (primaryTemplate.zebraStripes !== undefined ? primaryTemplate.zebraStripes : true);
            const preferredAutoBreak = globalTypo.autoPageBreak !== undefined ? globalTypo.autoPageBreak : (primaryTemplate.autoPageBreak !== undefined ? primaryTemplate.autoPageBreak : true);

            const defaultSettings = {
                primaryColor: shopTheme,
                showLogo: shopHasLogo,
                logoSize: 56,
                fontSize: preferredSize,
                headerFontSize: preferredHeaderSize,
                rowPadding: preferredRowPadding,
                hdrPadding: preferredHdrPadding,
                tableMarginTop: primaryTemplate.tableMarginTop || 0,
                sellerName: shopSigner,
                sellerRole: 'ผู้เสนอราคา',
                headerDirection: 'row',
                headerTextAlign: 'auto',
                headerVAlign: 'flex-start',
                fontFamily: preferredFont,
                fontWeight: preferredWeight,
                tableBorder: preferredBorder,
                tableHeaderAlign: preferredHeaderAlign,
                tableHeaderStyle: preferredHeaderStyle,
                zebraStripes: preferredZebra,
                autoPageBreak: preferredAutoBreak,
                leftSignerTitle: 'ผู้สั่งซื้อ',
                sincerelyYours: 'ขอแสดงความนับถือ / Sincerely Yours,',
                useSignatureImage: !!shopSignature,
                activeSignatures: shopSignature ? [{
                    id: 'act_' + Date.now(),
                    name: 'ลายเซ็น',
                    dataUrl: shopSignature,
                    size: 45,
                    offsetX: 0,
                    offsetY: 0
                }] : [],
                signatureImage: shopSignature,
                signatureImageSize: 45,
                signatureOffsetX: 0,
                signatureOffsetY: 0,
                issuerName: safeCompanyName,
                headerLayout: {
                    left: ["block-logo", "block-company"],
                    center: [],
                    right: ["block-title"],
                    midLeft: [],
                    midCenter: [],
                    midRight: [],
                    botLeft: [],
                    botCenter: [],
                    botRight: []
                },
                infoPanelOrder: ['pRecipientPanel', 'pInfoResizer', 'pDocDetailsPanel'],
                infoPanelLeftFlex: '1.4',
                infoPanelRightFlex: '0.6',
                infoDivider: true,
                recipientTitle: 'RECIPIENT INFORMATION',
                docDetailsTitle: 'DOCUMENT DETAILS',
                infoLabels: {
                    to: 'ชื่อ / To:',
                    address: 'ที่อยู่:',
                    attn: 'ติดต่อ / Attn:',
                    tel: 'โทร / Tel:',
                    email: 'อีเมล:',
                    refNo: 'เลขที่ / Ref. No:',
                    date: 'วันที่ / Date:',
                    validity: 'ยืนราคา / Validity:',
                    delivery: 'ส่งมอบ / Delivery:',
                    payment: 'ชำระเงิน / Payment:'
                }
            };

            // 3. Load from localStorage / Firestore memory cache
            const savedSettings = (window.quotationTemplates && window.quotationTemplates[safeCompanyName]) 
                                  ? window.quotationTemplates[safeCompanyName] 
                                  : null;
            
            // 4. Merge and apply
            const finalSettings = Object.assign({}, defaultSettings, savedSettings);

            // If this company's saved settings don't explicitly set a custom font, inherit user's preferred font!
            if (savedSettings) {
                if (!savedSettings.fontFamily) finalSettings.fontFamily = preferredFont;
                if (!savedSettings.fontWeight) finalSettings.fontWeight = preferredWeight;
                if (!savedSettings.fontSize) finalSettings.fontSize = preferredSize;
            }
            
            // Ensure deep properties are not lost if savedSettings exists but lacks them
            if (savedSettings && !savedSettings.headerLayout) {
                finalSettings.headerLayout = defaultSettings.headerLayout;
            }
            if (savedSettings && !savedSettings.headerDirection) {
                finalSettings.headerDirection = defaultSettings.headerDirection;
            }
            
            applyTemplateSettings(finalSettings);
        }

        let sortables = [];

        function openTemplateSettingsModal() {
            syncFormToPrintArea();
            
            const printArea = document.getElementById('printArea');
            printAreaOriginalParent = printArea.parentNode;
            printAreaOriginalNextSibling = printArea.nextSibling;
            
            document.getElementById('livePreviewContainer').appendChild(printArea);
            printArea.style.display = 'block';
            printArea.style.boxShadow = '0 16px 40px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.15)';
            printArea.style.borderRadius = '3px';
            printArea.style.transformOrigin = 'top center';
            printArea.style.transform = 'scale(0.85)';
            printArea.style.marginBottom = '60px';
            
            document.getElementById('templateSettingsModal').style.display = 'flex';
            
            // Enable SortableJS for drag-and-drop 3x3 grid header layout
            const zones = [
                'zone-left', 'zone-center', 'zone-right', 
                'zone-mid-left', 'zone-mid-center', 'zone-mid-right',
                'zone-bot-left', 'zone-bot-center', 'zone-bot-right'
            ];
            sortables = [];
            
            zones.forEach(zoneId => {
                const zone = document.getElementById(zoneId);
                if(zone) {
                    zone.classList.add('sortable-active-container');
                    sortables.push(new Sortable(zone, {
                        group: 'header', // allow dragging between all 3 zones
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        onEnd: function (evt) {
                            applyHeaderLayout(getCurrentHeaderLayout());
                            applyLivePreview();
                        }
                    }));
                }
            });

            applyLivePreview(); // Sync the panel sliders to current preview
            renderSavedSignaturesGallery();
            // Show resizers for header width adjustment & init signature draggable
            document.body.classList.add('modal-open');
            setTimeout(() => {
                initHeaderResizers();
                initSignatureDraggable();
            }, 100);
        }

        function closeTemplateSettingsModal() {
            const printArea = document.getElementById('printArea');
            
            // Cleanup Sortable
            sortables.forEach(s => s.destroy());
            sortables = [];
            document.querySelectorAll('.sortable-active-container').forEach(el => el.classList.remove('sortable-active-container'));
            document.querySelectorAll('.header-resizer').forEach(el => el.remove());
            document.body.classList.remove('modal-open');

            if (printAreaOriginalParent) {
                printAreaOriginalParent.insertBefore(printArea, printAreaOriginalNextSibling);
            }
            printArea.style.display = 'block';
            printArea.style.boxShadow = '';
            setPreviewZoom(previewZoomLevel);

            document.getElementById('templateSettingsModal').style.display = 'none';
        }

        function applyLivePreview() {
            const primaryColor = document.getElementById('settingPrimaryColor').value;
            const showLogo = document.getElementById('settingShowLogo').checked;
            const logoSize = document.getElementById('settingLogoSize').value;
            const fontSize = document.getElementById('settingFontSize').value;
            const headerFontSize = document.getElementById('settingHeaderFontSize').value;
            const sellerName = document.getElementById('settingSellerName').value;
            const sellerRole = document.getElementById('settingSellerRole').value;
            const leftSignerTitle = document.getElementById('settingLeftSignerTitle') ? document.getElementById('settingLeftSignerTitle').value : 'ผู้สั่งซื้อ';
            const sincerelyYours = document.getElementById('settingSincerelyYours') ? document.getElementById('settingSincerelyYours').value : 'ขอแสดงความนับถือ / Sincerely Yours,';
            const introText = document.getElementById('settingIntroText') ? document.getElementById('settingIntroText').value : 'ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:';
            const fontFamily = document.getElementById('settingFontFamily') ? document.getElementById('settingFontFamily').value : 'Sarabun';
            const fontWeight = document.getElementById('settingFontWeight') ? document.getElementById('settingFontWeight').value : '400';
            const tableBorder = document.getElementById('settingTableBorder') ? document.getElementById('settingTableBorder').value : 'rounded';
            const tableHeaderStyle = document.getElementById('settingTableHeaderStyle') ? document.getElementById('settingTableHeaderStyle').value : 'solid';
            const zebraStripes = document.getElementById('settingZebraStripes') ? document.getElementById('settingZebraStripes').checked : true;
            const showRemark = document.getElementById('settingShowRemark') ? document.getElementById('settingShowRemark').checked : true;
            const bahtTextPos = document.getElementById('settingBahtTextPosition') ? document.getElementById('settingBahtTextPosition').value : 'right';
            const showHeaderLine = document.getElementById('settingShowHeaderLine') ? document.getElementById('settingShowHeaderLine').checked : true;
            const sigFormat = document.getElementById('settingSignatureFormat') ? document.getElementById('settingSignatureFormat').value : 'full';
            const sigSize = document.getElementById('settingSignatureSize') ? parseInt(document.getElementById('settingSignatureSize').value) : 40;
            const useSigImg = document.getElementById('settingUseSignatureImage') ? document.getElementById('settingUseSignatureImage').checked : false;
            const sigImgSize = document.getElementById('settingSignatureImageSize') ? parseInt(document.getElementById('settingSignatureImageSize').value) : 45;
            const sigOffsetX = document.getElementById('settingSignatureOffsetX') ? parseInt(document.getElementById('settingSignatureOffsetX').value) : 0;
            const sigOffsetY = document.getElementById('settingSignatureOffsetY') ? parseInt(document.getElementById('settingSignatureOffsetY').value) : 0;

            // Sync range input labels & Quick toggle
            const fsLabel = document.getElementById('fontSizeLabel');
            if (fsLabel) fsLabel.innerText = fontSize;
            const hfsLabel = document.getElementById('hdrFontSizeLabel');
            if (hfsLabel) hfsLabel.innerText = headerFontSize;
            const sigImgSizeLbl = document.getElementById('sigImgSizeLabel');
            if (sigImgSizeLbl) sigImgSizeLbl.innerText = sigImgSize;
            const sigOffsetXLabel = document.getElementById('sigOffsetXLabel');
            if (sigOffsetXLabel) sigOffsetXLabel.innerText = sigOffsetX;
            const sigOffsetYLabel = document.getElementById('sigOffsetYLabel');
            if (sigOffsetYLabel) sigOffsetYLabel.innerText = sigOffsetY;
            syncQuickSignatureToggle();

            // Cache current typography preference so importing projects from materials_purchasing keeps this font
            try {
                localStorage.setItem('quotation_preferred_font', fontFamily);
                let currentTypo = {};
                try {
                    const rawTypo = localStorage.getItem('quotation_global_typography');
                    if (rawTypo) currentTypo = JSON.parse(rawTypo);
                } catch(e) {}
                currentTypo.fontFamily = fontFamily;
                currentTypo.fontWeight = fontWeight;
                currentTypo.fontSize = fontSize;
                currentTypo.headerFontSize = headerFontSize;
                currentTypo.tableBorder = tableBorder;
                currentTypo.tableHeaderStyle = tableHeaderStyle;
                currentTypo.zebraStripes = zebraStripes;
                localStorage.setItem('quotation_global_typography', JSON.stringify(currentTypo));
            } catch(e) {}

            const printArea = document.getElementById('printArea');
            if (printArea) {
                printArea.style.setProperty('--pdf-primary', primaryColor);
                const hex = primaryColor.replace('#', '');
                if(hex.length === 6 || hex.length === 8) {
                    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
                    printArea.style.setProperty('--pdf-primary-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
                }
            }

            // --- DYNAMIC CSS INJECTION (the reliable way for both preview & html2pdf cloning) ---
            let styleEl = document.getElementById('dynamicPrintStyle');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamicPrintStyle';
                document.head.appendChild(styleEl);
            }

            // Compute header style
            let thBg = primaryColor, thColor = '#fff';
            const hex2 = primaryColor.replace('#', '');
            const pr = parseInt(hex2.slice(0,2),16), pg = parseInt(hex2.slice(2,4),16), pb = parseInt(hex2.slice(4,6),16);
            if (tableHeaderStyle === 'light') {
                thBg = `rgba(${pr},${pg},${pb},0.1)`;
                thColor = primaryColor;
            } else if (tableHeaderStyle === 'transparent') {
                thBg = 'transparent';
                thColor = '#1f2937';
            }

            // Compute border styles
            let outerBorder = `border: 1px solid ${primaryColor} !important; border-radius: 6px !important; overflow: hidden !important;`;
            let cellBorderCSS = 'border: 0.5px solid #e2e8f0 !important;';
            let rowBorderCSS = 'border-bottom: 0.5px solid #e2e8f0 !important;';
            let thBorderCSS = `border: 0.5px solid rgba(255,255,255,0.2) !important; border-bottom: 1px solid ${primaryColor} !important;`;
            let thBottomBdr = `border-bottom: 1px solid ${primaryColor} !important;`;

            // Summary box and remark borders
            let summaryOuterBorder = '1px solid #cbd5e1';
            let summaryRowBorder = '1px solid #e2e8f0';
            let summaryCellBorder = '0.5px solid #e2e8f0';
            let remarkBorder = '1px solid #e5e7eb';

            if (tableBorder === 'all') {
                outerBorder = `border: 1px solid ${primaryColor} !important; border-radius: 0 !important;`;
                cellBorderCSS = 'border: 0.5px solid #cbd5e1 !important;';
                thBorderCSS = `border: 0.5px solid #cbd5e1 !important; border-bottom: 1px solid ${primaryColor} !important;`;
            } else if (tableBorder === 'horizontal') {
                outerBorder = `border-top: 2px solid ${primaryColor} !important; border-bottom: 2px solid ${primaryColor} !important; border-left: none !important; border-right: none !important; border-radius: 0 !important;`;
                cellBorderCSS = 'border-bottom: 0.5px solid #e2e8f0 !important; border-top: none !important; border-left: none !important; border-right: none !important;';
                rowBorderCSS = 'border-bottom: 0.5px solid #e2e8f0 !important;';
                thBorderCSS = `border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 2px solid ${primaryColor} !important;`;
                summaryOuterBorder = `border-top: 1.5px solid ${primaryColor} !important; border-bottom: 1.5px solid ${primaryColor} !important; border-left: none !important; border-right: none !important;`;
                summaryRowBorder = 'border-bottom: 0.5px solid #e2e8f0 !important;';
                summaryCellBorder = 'border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 0.5px solid #e2e8f0 !important;';
            } else if (tableBorder === 'none') {
                outerBorder = 'border: none !important; border-radius: 0 !important;';
                cellBorderCSS = 'border: none !important;';
                rowBorderCSS = 'border-bottom: none !important;';
                thBorderCSS = 'border: none !important;';
                thBottomBdr = 'border-bottom: none !important;';
                summaryOuterBorder = 'none';
                summaryRowBorder = 'none';
                summaryCellBorder = 'none';
                remarkBorder = 'none';
            }

            if (tableHeaderStyle === 'light') {
                thBottomBdr = `border-bottom: 1.5px solid ${primaryColor} !important;`;
                if (tableBorder === 'rounded' || tableBorder === 'all') {
                    thBorderCSS = `border: 0.5px solid rgba(${pr},${pg},${pb},0.2) !important; border-bottom: 1.5px solid ${primaryColor} !important;`;
                } else if (tableBorder === 'horizontal') {
                    thBorderCSS = `border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 2.5px solid ${primaryColor} !important;`;
                }
            } else if (tableHeaderStyle === 'transparent') {
                thBottomBdr = tableBorder === 'none' ? 'border-bottom: none !important;' : `border-bottom: 2px solid ${primaryColor} !important;`;
                if (tableBorder === 'none') {
                    thBorderCSS = 'border: none !important;';
                } else {
                    thBorderCSS = `border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 2px solid ${primaryColor} !important;`;
                }
            }

            const zebraCSS = zebraStripes 
                ? `.print-area .pItemsTable tbody tr:nth-child(even) { background-color: #f8fafc !important; }`
                : `.print-area .pItemsTable tbody tr:nth-child(even) { background-color: transparent !important; }`;

            styleEl.textContent = `
                /* ===== DYNAMIC PRINT & DOCUMENT PREVIEW STYLES ===== */
                #printArea, #printArea *, .print-area, .print-area *, #pPageWrapper, #pPageWrapper *, #__printOnlyWrapper, #__printOnlyWrapper * {
                    font-family: '${fontFamily}', 'Sarabun', 'Tahoma', sans-serif !important;
                }
                #pPageWrapper:not(.auto-fit-single-page), .print-area:not(.auto-fit-single-page) > div, #__printOnlyWrapper:not(.auto-fit-single-page) > div {
                    font-size: ${fontSize}px !important;
                    font-weight: ${fontWeight} !important;
                }
                .print-area .pItemsTable {
                    ${outerBorder}
                }
                .print-area .pTableHeadRow {
                    background-color: ${thBg} !important;
                    ${thBottomBdr}
                }
                .print-area .pTableHeadRow th {
                    background-color: ${thBg} !important;
                    color: ${thColor} !important;
                    font-size: ${headerFontSize}px !important;
                    ${thBorderCSS}
                    line-height: 1.35 !important;
                    vertical-align: middle !important;
                }
                .print-area .pTableHeadRow th:last-child {
                    border-right: none !important;
                }
                .print-area:not(.auto-fit-single-page) .pItemsTable td {
                    ${cellBorderCSS}
                    line-height: 1.35 !important;
                    vertical-align: middle !important;
                }
                .print-area.auto-fit-single-page .pItemsTable td, #pPageWrapper.auto-fit-single-page .pItemsTable td {
                    ${cellBorderCSS}
                    line-height: 1.18 !important;
                    vertical-align: middle !important;
                }
                .print-area .pItemsTable tbody tr {
                    ${rowBorderCSS}
                }
                ${zebraCSS}
                .print-area #pHeaderSection {
                    ${showHeaderLine ? `border-bottom: 2.5px solid ${primaryColor} !important;` : 'border-bottom: none !important;'}
                }
                .print-area #pSellerRole {
                    color: ${primaryColor} !important;
                }
                .print-area #pRecipientPanel table tr, 
                .print-area #pDocDetailsPanel div {
                    background-color: transparent !important;
                }
                .print-area #pSummaryTotalsBox {
                    border: ${summaryOuterBorder} !important;
                }
                .print-area #pSummaryTotalsBox table tr {
                    border-bottom: ${summaryRowBorder} !important;
                }
                .print-area #pSummaryTotalsBox #pBahtText {
                    border-top: ${summaryRowBorder} !important;
                }
                .print-area #pSummaryTotalsBox td {
                    border: ${summaryCellBorder} !important;
                }
                .print-area #pRemark {
                    border: ${remarkBorder} !important;
                }
            `;

            // Apply color to Document Title
            const titleBlock = document.getElementById('block-title');
            if (titleBlock) {
                const titleText = titleBlock.querySelector('div:first-child');
                if (titleText) titleText.style.color = primaryColor;
            }

            const pIntroText = document.getElementById('pIntroText');
            if (pIntroText) {
                pIntroText.innerHTML = introText.replace(/\n/g, '<br>');
            }
            
            const pRemarkContainer = document.getElementById('pRemarkContainer');
            const pSummaryTotalsBox = document.getElementById('pSummaryTotalsBox');
            const pLeftSummarySection = document.getElementById('pLeftSummarySection');
            const bahtTextEl = document.getElementById('pBahtText');
            const leftBahtContainer = document.getElementById('pLeftBahtTextContainer');
            const rightBahtContainer = document.getElementById('pRightBahtTextContainer');

            if (bahtTextEl && leftBahtContainer && rightBahtContainer) {
                if (bahtTextPos === 'left') {
                    leftBahtContainer.appendChild(bahtTextEl);
                    bahtTextEl.style.border = 'none';
                    bahtTextEl.style.borderRadius = '0';
                    bahtTextEl.style.background = 'transparent';
                    bahtTextEl.style.textAlign = 'center';
                    bahtTextEl.style.marginTop = '8px';
                    bahtTextEl.style.padding = '0';
                    bahtTextEl.style.fontWeight = '600';
                } else {
                    rightBahtContainer.appendChild(bahtTextEl);
                    bahtTextEl.style.border = 'none';
                    bahtTextEl.style.borderTop = '1.5px solid ' + primaryColor;
                    bahtTextEl.style.borderRadius = '0';
                    bahtTextEl.style.background = '#fff';
                    bahtTextEl.style.textAlign = 'center';
                    bahtTextEl.style.marginTop = '0';
                    bahtTextEl.style.padding = '6px 12px';
                    bahtTextEl.style.fontWeight = '600';
                }
            }

            if (pRemarkContainer) {
                pRemarkContainer.style.display = showRemark ? 'block' : 'none';
            }

            const hasLeftContent = showRemark || (bahtTextPos === 'left');
            if (pLeftSummarySection) {
                pLeftSummarySection.style.display = hasLeftContent ? 'flex' : 'none';
            }

            if (pSummaryTotalsBox) {
                if (!hasLeftContent) {
                    pSummaryTotalsBox.style.marginLeft = 'auto';
                    pSummaryTotalsBox.style.flex = '0 0 46%';
                } else {
                    pSummaryTotalsBox.style.marginLeft = '0';
                    pSummaryTotalsBox.style.flex = '0.85';
                }
            }

            // Apply Signature Settings
            const pBuyerBlock = document.getElementById('pBuyerSignatureBlock');
            const pBuyerDots = document.getElementById('pBuyerSignatureDots');
            const pBuyerDate = document.getElementById('pBuyerSignatureDate');
            const pLeftTitle = document.getElementById('pLeftSignerTitle');
            const pSellerSpace = document.getElementById('pSellerSignatureSpace');
            const pSellerSigWrapper = document.getElementById('pSellerSignatureWrapper');
            const pSellerSigImg = document.getElementById('pSellerSignatureImg');

            if (pBuyerBlock && pBuyerDots && pBuyerDate) {
                if (sigFormat === 'hidden') {
                    pBuyerBlock.style.visibility = 'hidden';
                } else if (sigFormat === 'line_only') {
                    pBuyerBlock.style.visibility = 'visible';
                    pBuyerDots.style.display = 'none';
                    pBuyerDate.style.display = 'none';
                } else {
                    pBuyerBlock.style.visibility = 'visible';
                    pBuyerDots.style.display = 'block';
                    pBuyerDate.style.display = 'flex';
                }
            }
            const pPageWrap = document.getElementById('pPageWrapper');
            const isAutoFit = pPageWrap && pPageWrap.classList.contains('auto-fit-single-page');
            if (pLeftTitle) {
                let marginBase = isAutoFit ? 8 : Math.max(10, sigSize - 22);
                if (sigFormat === 'line_only') {
                     marginBase += isAutoFit ? 12 : 24;
                }
                pLeftTitle.style.marginBottom = marginBase + 'px';
            }
            if (pSellerSpace) {
                pSellerSpace.style.height = (isAutoFit ? Math.min(sigSize, 26) : sigSize) + 'px';
            }

            // Apply Multi-Signatures / Stamps & Position (Container height remains fixed; images float above the line)
            if (pSellerSpace && !isAutoFit) {
                pSellerSpace.style.height = sigSize + 'px';
            }
            if (pSellerSpace) {
                if (useSigImg && window.activeSignatures && window.activeSignatures.length > 0) {
                    pSellerSpace.innerHTML = window.activeSignatures.map((item, idx) => {
                        const itemSize = item.size || 45;
                        return `
                            <div id="pSellerSigWrapper_${item.id}" class="sig-drag-item" data-id="${item.id}" style="position: absolute; bottom: ${-4 + (item.offsetY || 0)}px; left: 50%; transform: translate(calc(-50% + ${(item.offsetX || 0)}px), 0); cursor: grab; user-select: none; display: inline-flex; align-items: center; justify-content: center; z-index: ${5 + idx}; transition: outline 0.1s;" title="คลิกลากเพื่อปรับตำแหน่ง (${item.name || 'ลายเซ็น'})">
                                <img id="sig_img_${item.id}" src="${item.dataUrl}" style="height: ${itemSize}px; max-width: 220px; object-fit: contain; pointer-events: none;" alt="${item.name || 'Signature'}">
                            </div>
                        `;
                    }).join('');
                } else {
                    pSellerSpace.innerHTML = '';
                }
            }

            // Apply Logo
            const pLogo = document.getElementById('pLogoImg');
            if (pLogo) {
                pLogo.style.display = showLogo ? 'block' : 'none';
                pLogo.style.height = `${logoSize}px`;
            }

            // Apply Seller Info
            const pSellerName = document.getElementById('pSellerName');
            const pSellerRole = document.getElementById('pSellerRole');
            const pLeftSigner = document.getElementById('pLeftSignerTitle');
            const pRightSigner = document.getElementById('pRightSignerTitle');
            
            if (pSellerName) pSellerName.innerText = sellerName;

            const docConfig = (typeof DOC_TYPE_CONFIG !== 'undefined' && DOC_TYPE_CONFIG[currentDocType]) ? DOC_TYPE_CONFIG[currentDocType] : null;

            if (docConfig && currentDocType !== 'quotation') {
                if (pSellerRole) pSellerRole.innerText = docConfig.sellerRole;
                if (pLeftSigner) pLeftSigner.innerText = docConfig.leftSignerTitle;
                if (pRightSigner) pRightSigner.innerText = docConfig.rightSignerTitle;
            } else {
                if (pSellerRole) pSellerRole.innerText = sellerRole;
                if (pLeftSigner) pLeftSigner.innerText = leftSignerTitle;
                if (pRightSigner) pRightSigner.innerText = sincerelyYours;
            }

            // Re-render table data
            syncFormToPrintArea();
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    syncFormToPrintArea();
                });
            }
        }

        function getCurrentHeaderLayout() {
            const zTopLeft = document.getElementById('zone-left');
            const zTopCenter = document.getElementById('zone-center');
            const zTopRight = document.getElementById('zone-right');
            
            const zMidLeft = document.getElementById('zone-mid-left');
            const zMidCenter = document.getElementById('zone-mid-center');
            const zMidRight = document.getElementById('zone-mid-right');
            
            const zBotLeft = document.getElementById('zone-bot-left');
            const zBotCenter = document.getElementById('zone-bot-center');
            const zBotRight = document.getElementById('zone-bot-right');
            
            return {
                left: Array.from(zTopLeft.children).map(el => el.id),
                center: Array.from(zTopCenter.children).map(el => el.id),
                right: Array.from(zTopRight.children).map(el => el.id),
                
                midLeft: zMidLeft ? Array.from(zMidLeft.children).map(el => el.id) : [],
                midCenter: zMidCenter ? Array.from(zMidCenter.children).map(el => el.id) : [],
                midRight: zMidRight ? Array.from(zMidRight.children).map(el => el.id) : [],
                
                botLeft: zBotLeft ? Array.from(zBotLeft.children).map(el => el.id) : [],
                botCenter: zBotCenter ? Array.from(zBotCenter.children).map(el => el.id) : [],
                botRight: zBotRight ? Array.from(zBotRight.children).map(el => el.id) : []
            };
        }

        async function saveTemplateSettings(showAlert = true) {
            try {
                const currentIssuerDisplay = document.getElementById('currentIssuerDisplay')?.innerText?.trim() || 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
                const useSigImg = document.getElementById('settingUseSignatureImage') ? document.getElementById('settingUseSignatureImage').checked : (window.activeSignatures && window.activeSignatures.length > 0);
                const primarySigUrl = (window.activeSignatures && window.activeSignatures[0]) ? window.activeSignatures[0].dataUrl : '';

                const templateSettings = { 
                    autoPageBreak: document.getElementById('settingAutoPageBreak') ? document.getElementById('settingAutoPageBreak').checked : true,
                    itemsPage1: document.getElementById('settingItemsPage1')?.value || '14',
                    itemsPage2Plus: document.getElementById('settingItemsPage2Plus')?.value || '18',
                    primaryColor: document.getElementById('settingPrimaryColor')?.value || '#1A6FBF',
                    showLogo: document.getElementById('settingShowLogo') ? document.getElementById('settingShowLogo').checked : true,
                    logoSize: document.getElementById('settingLogoSize')?.value || '56',
                    fontSize: document.getElementById('settingFontSize')?.value || '11',
                    headerFontSize: document.getElementById('settingHeaderFontSize')?.value || '11',
                    rowPadding: document.getElementById('settingTableRowPadding')?.value || '5',
                    hdrPadding: document.getElementById('settingTableHeaderPadding')?.value || '6.5',
                    tableMarginTop: document.getElementById('settingTableMarginTop')?.value || '0',
                    sellerName: document.getElementById('settingSellerName')?.value || '',
                    sellerRole: document.getElementById('settingSellerRole')?.value || 'ผู้เสนอราคา',
                    leftSignerTitle: document.getElementById('settingLeftSignerTitle')?.value || 'ผู้สั่งซื้อ',
                    sincerelyYours: document.getElementById('settingSincerelyYours')?.value || 'ขอแสดงความนับถือ / Sincerely Yours,',
                    headerDirection: document.getElementById('settingHeaderDirection')?.value || 'row',
                    headerRows: document.getElementById('settingHeaderRows')?.value || '3',
                    headerTextAlign: document.getElementById('settingHeaderTextAlign')?.value || 'auto',
                    headerVAlign: document.getElementById('settingHeaderVAlign')?.value || 'flex-start',
                    fontFamily: document.getElementById('settingFontFamily')?.value || "Sarabun",
                    fontWeight: document.getElementById('settingFontWeight')?.value || "400",
                    tableBorder: document.getElementById('settingTableBorder')?.value || 'rounded',
                    tableHeaderAlign: document.getElementById('settingTableHeaderAlign')?.value || 'auto',
                    tableHeaderStyle: document.getElementById('settingTableHeaderStyle')?.value || 'solid',
                    zebraStripes: document.getElementById('settingZebraStripes') ? document.getElementById('settingZebraStripes').checked : true,
                    showRemark: document.getElementById('settingShowRemark') ? document.getElementById('settingShowRemark').checked : true,
                    bahtTextPosition: document.getElementById('settingBahtTextPosition')?.value || 'right',
                    showHeaderLine: document.getElementById('settingShowHeaderLine') ? document.getElementById('settingShowHeaderLine').checked : true,
                    signatureFormat: document.getElementById('settingSignatureFormat')?.value || 'full',
                    signatureSize: document.getElementById('settingSignatureSize')?.value || '40',
                    useSignatureImage: useSigImg,
                    activeSignatures: JSON.parse(JSON.stringify(window.activeSignatures || [])),
                    signatureImage: primarySigUrl,
                    signatureImageSize: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].size || 45) : 45,
                    signatureOffsetX: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].offsetX || 0) : 0,
                    signatureOffsetY: (window.activeSignatures && window.activeSignatures[0]) ? (window.activeSignatures[0].offsetY || 0) : 0,
                    introText: document.getElementById('settingIntroText')?.value || 'ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:',
                    issuerName: currentIssuerDisplay,
                    headerLayout: typeof getCurrentHeaderLayout === 'function' ? getCurrentHeaderLayout() : null,
                    infoPanelOrder: typeof getInfoPanelOrder === 'function' ? getInfoPanelOrder() : ['pRecipientPanel', 'pInfoResizer', 'pDocDetailsPanel'],
                    infoPanelLeftFlex: typeof getInfoPanelFlex === 'function' ? getInfoPanelFlex('left') : '1.4',
                    infoPanelRightFlex: typeof getInfoPanelFlex === 'function' ? getInfoPanelFlex('right') : '0.6',
                    infoDivider: document.getElementById('settingInfoDivider') ? document.getElementById('settingInfoDivider').checked : true,
                    headerFlex: {
                        left: document.getElementById('zone-left') ? document.getElementById('zone-left').style.flex || '1' : '1',
                        center: document.getElementById('zone-center') ? document.getElementById('zone-center').style.flex || '1' : '1',
                        right: document.getElementById('zone-right') ? document.getElementById('zone-right').style.flex || '1' : '1',
                        midLeft: document.getElementById('zone-mid-left') ? document.getElementById('zone-mid-left').style.flex || '1' : '1',
                        midCenter: document.getElementById('zone-mid-center') ? document.getElementById('zone-mid-center').style.flex || '1' : '1',
                        midRight: document.getElementById('zone-mid-right') ? document.getElementById('zone-mid-right').style.flex || '1' : '1',
                        botLeft: document.getElementById('zone-bot-left') ? document.getElementById('zone-bot-left').style.flex || '1' : '1',
                        botCenter: document.getElementById('zone-bot-center') ? document.getElementById('zone-bot-center').style.flex || '1' : '1',
                        botRight: document.getElementById('zone-bot-right') ? document.getElementById('zone-bot-right').style.flex || '1' : '1'
                    },
                    recipientTitle: document.getElementById('settingRecipientTitle')?.value || 'RECIPIENT INFORMATION',
                    docDetailsTitle: document.getElementById('settingDocDetailsTitle')?.value || 'DOCUMENT DETAILS',
                    infoLabels: {
                        to: document.getElementById('settingLabelTo')?.value || 'ชื่อ / To:',
                        address: document.getElementById('settingLabelAddress')?.value || 'ที่อยู่:',
                        attn: document.getElementById('settingLabelAttn')?.value || 'ติดต่อ / Attn:',
                        tel: document.getElementById('settingLabelTel')?.value || 'โทร / Tel:',
                        email: document.getElementById('settingLabelEmail')?.value || 'อีเมล:',
                        refNo: document.getElementById('settingLabelRefNo')?.value || 'เลขที่ / Ref. No:',
                        date: document.getElementById('settingLabelDate')?.value || 'วันที่ / Date:',
                        validity: document.getElementById('settingLabelValidity')?.value || 'ยืนราคา / Validity:',
                        delivery: document.getElementById('settingLabelDelivery')?.value || 'ส่งมอบ / Delivery:',
                        payment: document.getElementById('settingLabelPayment')?.value || 'ชำระเงิน / Payment:'
                    }
                };
                
                if (!window.quotationTemplates) window.quotationTemplates = {};
                window.quotationTemplates[currentIssuerDisplay] = templateSettings;
                
                localStorage.setItem('quotationTemplates', JSON.stringify(window.quotationTemplates));
                localStorage.setItem('quotation_preferred_font', templateSettings.fontFamily || 'Sarabun');
                localStorage.setItem('quotation_global_typography', JSON.stringify({
                    fontFamily: templateSettings.fontFamily,
                    fontWeight: templateSettings.fontWeight,
                    fontSize: templateSettings.fontSize,
                    headerFontSize: templateSettings.headerFontSize,
                    rowPadding: templateSettings.rowPadding,
                    hdrPadding: templateSettings.hdrPadding,
                    tableBorder: templateSettings.tableBorder,
                    tableHeaderStyle: templateSettings.tableHeaderStyle,
                    tableHeaderAlign: templateSettings.tableHeaderAlign,
                    zebraStripes: templateSettings.zebraStripes,
                    autoPageBreak: templateSettings.autoPageBreak
                }));
                applyTemplateSettings(templateSettings);

                // Also persist signature to registered shop in memory if matched
                if (registeredShopsCache && Array.isArray(registeredShopsCache)) {
                    const shop = registeredShopsCache.find(s => (s.name || s) === currentIssuerDisplay);
                    if (shop && typeof shop === 'object') {
                        shop.signature = primarySigUrl;
                        shop.signatureImage = primarySigUrl;
                    }
                }

                if (currentUser) {
                    try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                            quotationTemplates: window.quotationTemplates,
                            savedSignaturesByCompany: window.savedSignaturesByCompany
                        }, { merge: true });
                        if (showAlert) {
                            if (typeof Swal !== 'undefined') {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'บันทึกการตั้งค่าสำเร็จ!',
                                    html: `บันทึกรูปแบบฟอร์มและคลังลายเซ็นสำหรับ<br><b style="color: var(--primary-color, #1A6FBF); font-size: 1.05rem;">"${currentIssuerDisplay}"</b><br>เรียบร้อยแล้ว`,
                                    confirmButtonText: 'ตกลง',
                                    confirmButtonColor: '#1A6FBF',
                                    timer: 2500,
                                    timerProgressBar: true
                                });
                            } else {
                                alert(`บันทึกการตั้งค่ารูปแบบฟอร์มและคลังลายเซ็นสำหรับ "${currentIssuerDisplay}" สำเร็จ`);
                            }
                        }
                    } catch (err) {
                        console.error('Error saving template to cloud:', err);
                        if (showAlert) {
                            if (typeof Swal !== 'undefined') {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'บันทึกในเครื่องสำเร็จ',
                                    text: 'บันทึกลงในเครื่องสำเร็จ (การเชื่อมต่อคลาวด์ขัดข้องชั่วคราว)',
                                    confirmButtonColor: '#1A6FBF'
                                });
                            } else {
                                alert('บันทึกลงในเครื่องสำเร็จ (การเชื่อมต่อคลาวด์ขัดข้องชั่วคราว)');
                            }
                        }
                    }
                } else {
                    if (showAlert) {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'success',
                                title: 'บันทึกสำเร็จ!',
                                html: `บันทึกการตั้งค่าและคลังลายเซ็นสำหรับ<br><b style="color: var(--primary-color, #1A6FBF);">"${currentIssuerDisplay}"</b> ในเครื่องสำเร็จ`,
                                confirmButtonText: 'ตกลง',
                                confirmButtonColor: '#1A6FBF',
                                timer: 2500,
                                timerProgressBar: true
                            });
                        } else {
                            alert(`บันทึกการตั้งค่าและคลังลายเซ็นสำหรับ "${currentIssuerDisplay}" ในเครื่องสำเร็จ`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error executing saveTemplateSettings:', error);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาดในการบันทึก',
                        text: error.message,
                        confirmButtonColor: '#ef4444'
                    });
                } else {
                    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
                }
            } finally {
                closeTemplateSettingsModal();
            }
        }

        function applyHeaderLayout(layout) {
            if (!layout) return;
            // Legacy migration check: if layout uses mainOrder, it's from the old version, ignore it.
            if (layout.mainOrder) return;
            
            try {
                const zTopLeft = document.getElementById('zone-left');
                const zTopCenter = document.getElementById('zone-center');
                const zTopRight = document.getElementById('zone-right');
                
                const zMidLeft = document.getElementById('zone-mid-left');
                const zMidCenter = document.getElementById('zone-mid-center');
                const zMidRight = document.getElementById('zone-mid-right');
                
                const zBotLeft = document.getElementById('zone-bot-left');
                const zBotCenter = document.getElementById('zone-bot-center');
                const zBotRight = document.getElementById('zone-bot-right');
                
                // Function to append blocks safely
                const appendToZone = (zone, blockIds) => {
                    if(blockIds && Array.isArray(blockIds)) {
                        blockIds.forEach(id => {
                            const el = document.getElementById(id);
                            if (el && zone) zone.appendChild(el);
                        });
                    }
                };
                
                appendToZone(zTopLeft, layout.left);
                appendToZone(zTopCenter, layout.center);
                appendToZone(zTopRight, layout.right);
                
                appendToZone(zMidLeft, layout.midLeft);
                appendToZone(zMidCenter, layout.midCenter);
                appendToZone(zMidRight, layout.midRight);
                
                // Legacy compatibility for layout.bottom
                if (layout.bottom && (!layout.botLeft || layout.botLeft.length === 0)) {
                    appendToZone(zBotLeft, layout.bottom);
                } else {
                    appendToZone(zBotLeft, layout.botLeft);
                }
                
                appendToZone(zBotCenter, layout.botCenter);
                appendToZone(zBotRight, layout.botRight);

                // Re-align texts of inner elements if necessary based on zone
                const headerDir = document.getElementById('settingHeaderDirection') ? document.getElementById('settingHeaderDirection').value : 'row';
                const textAlignVal = document.getElementById('settingHeaderTextAlign') ? document.getElementById('settingHeaderTextAlign').value : 'auto';
                const vAlignVal = document.getElementById('settingHeaderVAlign') ? document.getElementById('settingHeaderVAlign').value : 'flex-start';

                // Apply vAlign to the row wrappers (the flex containers of the zones)
                document.querySelectorAll('#pHeaderSection > div').forEach(row => {
                    row.style.alignItems = vAlignVal;
                });

                document.querySelectorAll('.header-zone').forEach(zone => {
                    zone.style.flexDirection = headerDir;
                    
                    let alignment = 'left';
                    if (textAlignVal === 'auto') {
                        if (zone.id.includes('center')) alignment = 'center';
                        else if (zone.id.includes('right')) alignment = 'right';
                    } else {
                        alignment = textAlignVal;
                    }
                    
                    let flexAlign = 'flex-start';
                    if (alignment === 'center') flexAlign = 'center';
                    else if (alignment === 'right') flexAlign = 'flex-end';

                    if (headerDir === 'column') {
                        zone.style.alignItems = flexAlign;
                        zone.style.justifyContent = 'flex-start';
                    } else {
                        zone.style.justifyContent = flexAlign;
                        zone.style.alignItems = 'center'; // cross-axis center in row mode
                    }
                    
                    Array.from(zone.children).forEach(child => {
                        child.style.textAlign = alignment;
                    });
                });
                // Show/hide rows based on settingHeaderRows AND content
                const maxRows = parseInt((document.getElementById('settingHeaderRows') || {value: '3'}).value) || 3;
                const rowDefs = [
                    { zones: ['zone-left', 'zone-center', 'zone-right'], rowId: null },
                    { zones: ['zone-mid-left', 'zone-mid-center', 'zone-mid-right'], rowId: 'header-row-2' },
                    { zones: ['zone-bot-left', 'zone-bot-center', 'zone-bot-right'], rowId: 'header-row-3' }
                ];
                rowDefs.forEach(({ zones: zoneIds, rowId }, rowIndex) => {
                    const rowEl = rowId ? document.getElementById(rowId) : null;
                    if (!rowEl) return;
                    const withinLimit = (rowIndex + 1) <= maxRows;
                    const anyHasContent = zoneIds.some(id => {
                        const z = document.getElementById(id);
                        return z && z.querySelector('.header-block') !== null;
                    });
                    rowEl.style.display = (withinLimit && anyHasContent) ? 'flex' : 'none';
                });
                
                initHeaderResizers();
            } catch (e) {
                console.error("Error applying header layout", e);
            }
        }

        function initHeaderResizers() {
            // Row 1: zone-left | hResize1 | zone-center | hResize2 | zone-right
            // Row 2: zone-mid-left | hResize3 | zone-mid-center | hResize4 | zone-mid-right
            const resizerDefs = [
                { id: 'hResize1', left: 'zone-left',     right: 'zone-center' },
                { id: 'hResize2', left: 'zone-center',   right: 'zone-right'  },
                { id: 'hResize3', left: 'zone-mid-left', right: 'zone-mid-center' },
                { id: 'hResize4', left: 'zone-mid-center', right: 'zone-mid-right' }
            ];

            resizerDefs.forEach(def => {
                const resizer = document.getElementById(def.id);
                if (!resizer || resizer._resizerBound) return;
                resizer._resizerBound = true;

                resizer.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const row = resizer.closest('[id^="header-row-"]');
                    const leftZone = document.getElementById(def.left);
                    const rightZone = document.getElementById(def.right);
                    if (!row || !leftZone || !rightZone) return;

                    const startX = e.clientX;
                    const startLeftFlex = parseFloat(leftZone.style.flex) || 1;
                    const startRightFlex = parseFloat(rightZone.style.flex) || 1;
                    resizer.classList.add('resizing');
                    document.body.classList.add('info-resizing');

                    const onMouseMove = (e) => {
                        const totalWidth = row.offsetWidth;
                        const deltaX = e.clientX - startX;
                        const deltaRatio = deltaX / totalWidth;
                        const totalFlex = startLeftFlex + startRightFlex;
                        let newLeft = Math.max(0.1, startLeftFlex + deltaRatio * totalFlex);
                        let newRight = Math.max(0.1, totalFlex - newLeft);
                        leftZone.style.flex = newLeft.toFixed(3);
                        rightZone.style.flex = newRight.toFixed(3);
                    };
                    const onMouseUp = () => {
                        resizer.classList.remove('resizing');
                        document.body.classList.remove('info-resizing');
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });
        }

        // ── Info Panel helpers ──────────────────────────────────────────
        let _infoDragInstance = null;

        function getInfoPanelOrder() {
            const row = document.getElementById('pInfoRow');
            if (!row) return ['pRecipientPanel', 'pInfoResizer', 'pDocDetailsPanel'];
            return Array.from(row.children).map(c => c.id);
        }

        function getInfoPanelFlex(side) {
            const row = document.getElementById('pInfoRow');
            if (!row) return side === 'left' ? '1.4' : '0.6';
            const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
            if (panels.length < 2) return side === 'left' ? '1.4' : '0.6';
            return side === 'left' ? panels[0].style.flex : panels[1].style.flex;
        }

        function applyInfoPanelFlex(leftFlex, rightFlex) {
            const row = document.getElementById('pInfoRow');
            if (!row) return;
            const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
            if (panels.length >= 2) {
                panels[0].style.flex = leftFlex || '1.4';
                panels[1].style.flex = rightFlex || '0.6';
            }
        }

        function applyInfoPanelOrder(order) {
            const row = document.getElementById('pInfoRow');
            if (!row || !order || order.length < 2) return;
            order.forEach(id => {
                const el = document.getElementById(id);
                if (el) row.appendChild(el);
            });
            _syncInfoPanelBorders();
        }

        function _syncInfoPanelBorders() {
            const showDivider = document.getElementById('settingInfoDivider') ? document.getElementById('settingInfoDivider').checked : true;
            const row = document.getElementById('pInfoRow');
            if (!row) return;
            const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
            panels.forEach((p, i) => {
                const isFirst = i === 0;
                if (isFirst) {
                    p.style.borderLeft = 'none';
                    p.style.borderRight = 'none';
                    p.style.paddingLeft = '0';
                    p.style.paddingRight = '10px';
                } else {
                    p.style.borderLeft = showDivider ? '1px solid #e8edf5' : 'none';
                    p.style.borderRight = 'none';
                    p.style.paddingLeft = '10px';
                    p.style.paddingRight = '0';
                }
            });
            // Ensure resizer stays between the two panels
            const resizer = document.getElementById('pInfoResizer');
            if (resizer && panels.length >= 2) {
                panels[0].after(resizer);
            }
        }

        function initInfoResizer() {
            const resizer = document.getElementById('pInfoResizer');
            if (!resizer) return;
            let isResizing = false;
            let startX = 0;
            let startLeftFlex = 0;
            let startRightFlex = 0;

            resizer.addEventListener('mousedown', function(e) {
                e.preventDefault();
                isResizing = true;
                startX = e.clientX;
                const row = document.getElementById('pInfoRow');
                const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
                startLeftFlex = parseFloat(panels[0].style.flex) || 1.4;
                startRightFlex = parseFloat(panels[1].style.flex) || 0.6;
                resizer.classList.add('resizing');
                document.body.classList.add('info-resizing');
            });

            document.addEventListener('mousemove', function(e) {
                if (!isResizing) return;
                const row = document.getElementById('pInfoRow');
                const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
                if (panels.length < 2) return;
                const totalWidth = row.offsetWidth;
                const deltaX = e.clientX - startX;
                const deltaRatio = deltaX / totalWidth;
                const totalFlex = startLeftFlex + startRightFlex;
                let newLeftFlex = Math.max(0.2, startLeftFlex + deltaRatio * totalFlex);
                let newRightFlex = Math.max(0.2, totalFlex - newLeftFlex);
                panels[0].style.flex = newLeftFlex.toFixed(3);
                panels[1].style.flex = newRightFlex.toFixed(3);
            });

            document.addEventListener('mouseup', function() {
                if (!isResizing) return;
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.classList.remove('info-resizing');
            });
        }

        function swapInfoPanels() {
            const row = document.getElementById('pInfoRow');
            if (!row || row.children.length < 2) return;
            // Move first non-resizer panel to end
            const panels = Array.from(row.children).filter(c => c.id !== 'pInfoResizer');
            if (panels.length >= 2) row.appendChild(panels[0]);
            _syncInfoPanelBorders();
        }

        function applyInfoPanelSettings() {
            // Update titles
            const recTitle = document.getElementById('settingRecipientTitle');
            const docTitle = document.getElementById('settingDocDetailsTitle');
            if (recTitle) {
                const el = document.getElementById('pRecipientTitle');
                if (el) el.textContent = recTitle.value;
            }
            if (docTitle) {
                const el = document.getElementById('pDocDetailsTitle');
                if (el) el.textContent = docTitle.value;
            }

            // Update Labels
            const labelMap = {
                'settingLabelTo': 'labelTo',
                'settingLabelAddress': 'labelAddress',
                'settingLabelAttn': 'labelAttn',
                'settingLabelTel': 'labelTel',
                'settingLabelEmail': 'labelEmail',
                'settingLabelRefNo': 'labelRefNo',
                'settingLabelDate': 'labelDate',
                'settingLabelValidity': 'labelValidity',
                'settingLabelDelivery': 'labelDelivery',
                'settingLabelPayment': 'labelPayment'
            };
            for (const [settingId, labelId] of Object.entries(labelMap)) {
                const sEl = document.getElementById(settingId);
                const lEl = document.getElementById(labelId);
                if (sEl && lEl) {
                    lEl.innerText = sEl.value;
                }
            }

            _syncInfoPanelBorders();
        }

        function toggleInfoDrag() {
            const row = document.getElementById('pInfoRow');
            const btn = document.getElementById('btnToggleDrag');
            if (!row) return;
            if (_infoDragInstance) {
                // Disable drag mode
                _infoDragInstance.destroy();
                _infoDragInstance = null;
                row.classList.remove('drag-mode');
                if (btn) { btn.innerHTML = "<i class='bx bx-move'></i> โหมดลาก"; btn.classList.remove('btn-primary'); btn.classList.add('btn-outline'); }
            } else {
                // Enable drag mode
                row.classList.add('drag-mode');
                _infoDragInstance = Sortable.create(row, {
                    animation: 180,
                    ghostClass: 'info-panel-ghost',
                    onEnd: function() { _syncInfoPanelBorders(); }
                });
                if (btn) { btn.innerHTML = "<i class='bx bx-lock-open'></i> ปิดโหมดลาก"; btn.classList.remove('btn-outline'); btn.classList.add('btn-primary'); }
            }
        }

        function applyTemplateSettings(settings) {
            if (!settings) return;
            // Auto page break toggle
            const autoPageBreakEl = document.getElementById('settingAutoPageBreak');
            if (autoPageBreakEl) {
                autoPageBreakEl.checked = settings.autoPageBreak !== undefined ? settings.autoPageBreak : true;
                toggleAutoPageBreak();
            }

            const ip1 = document.getElementById('settingItemsPage1');
            if (ip1) ip1.value = settings.itemsPage1 !== undefined ? settings.itemsPage1 : '14';
            const ip2 = document.getElementById('settingItemsPage2Plus');
            if (ip2) ip2.value = settings.itemsPage2Plus !== undefined ? settings.itemsPage2Plus : '18';

            if (settings.primaryColor) document.getElementById('settingPrimaryColor').value = settings.primaryColor;
            if (settings.showLogo !== undefined) document.getElementById('settingShowLogo').checked = settings.showLogo;
            if (settings.logoSize) document.getElementById('settingLogoSize').value = settings.logoSize;
            if (settings.fontSize) {
                const fsEl = document.getElementById('settingFontSize');
                if (fsEl) fsEl.value = settings.fontSize;
                const fsLbl = document.getElementById('fontSizeLabel');
                if (fsLbl) fsLbl.innerText = settings.fontSize;
            }
            if (settings.headerFontSize) {
                const hfsEl = document.getElementById('settingHeaderFontSize');
                if (hfsEl) hfsEl.value = settings.headerFontSize;
                const hfsLbl = document.getElementById('hdrFontSizeLabel');
                if (hfsLbl) hfsLbl.innerText = settings.headerFontSize;
            }
            if (settings.rowPadding !== undefined) {
                const rpEl = document.getElementById('settingTableRowPadding');
                if (rpEl) rpEl.value = settings.rowPadding;
                const rpLbl = document.getElementById('rowPaddingLabel');
                if (rpLbl) rpLbl.innerText = settings.rowPadding;
            }
            if (settings.hdrPadding !== undefined) {
                const hpEl = document.getElementById('settingTableHeaderPadding');
                if (hpEl) hpEl.value = settings.hdrPadding;
                const hpLbl = document.getElementById('hdrPaddingLabel');
                if (hpLbl) hpLbl.innerText = settings.hdrPadding;
            }
            if (settings.tableMarginTop !== undefined) {
                const tmtEl = document.getElementById('settingTableMarginTop');
                if (tmtEl) tmtEl.value = settings.tableMarginTop;
                const tmtLbl = document.getElementById('tableMarginTopLabel');
                if (tmtLbl) tmtLbl.innerText = settings.tableMarginTop;
            }
            if (settings.sellerName) {
                document.getElementById('settingSellerName').value = settings.sellerName;
                const formSellerName = document.getElementById('sellerName');
                if (formSellerName) formSellerName.value = settings.sellerName.replace(/^\(|\)$/g, '').trim();
            }
            if (settings.sellerRole) {
                document.getElementById('settingSellerRole').value = settings.sellerRole;
                const formSellerRole = document.getElementById('sellerRole');
                if (formSellerRole) formSellerRole.value = settings.sellerRole;
            }
            if (settings.leftSignerTitle) document.getElementById('settingLeftSignerTitle').value = settings.leftSignerTitle;
            if (settings.sincerelyYours) document.getElementById('settingSincerelyYours').value = settings.sincerelyYours;
            
            const hdEl = document.getElementById('settingHeaderDirection');
            if (hdEl) hdEl.value = settings.headerDirection ? settings.headerDirection : 'row';
            const hrEl = document.getElementById('settingHeaderRows');
            if (hrEl && settings.headerRows) hrEl.value = settings.headerRows;
            
            const htEl = document.getElementById('settingHeaderTextAlign');
            if (htEl) htEl.value = settings.headerTextAlign ? settings.headerTextAlign : 'auto';
            
            const hvEl = document.getElementById('settingHeaderVAlign');
            if (hvEl) hvEl.value = settings.headerVAlign ? settings.headerVAlign : 'flex-start';

            const fontEl = document.getElementById('settingFontFamily');
            if (fontEl) fontEl.value = settings.fontFamily ? settings.fontFamily : "Sarabun";

            const weightEl = document.getElementById('settingFontWeight');
            if (weightEl) weightEl.value = settings.fontWeight ? settings.fontWeight : "400";
            
            const tbEl = document.getElementById('settingTableBorder');
            if (tbEl) tbEl.value = settings.tableBorder ? settings.tableBorder : 'rounded';
            
            const thaEl = document.getElementById('settingTableHeaderAlign');
            if (thaEl) thaEl.value = settings.tableHeaderAlign ? settings.tableHeaderAlign : 'auto';

            const thsEl = document.getElementById('settingTableHeaderStyle');
            if (thsEl) thsEl.value = settings.tableHeaderStyle ? settings.tableHeaderStyle : 'solid';

            const zebraEl = document.getElementById('settingZebraStripes');
            if (zebraEl) zebraEl.checked = settings.zebraStripes !== undefined ? settings.zebraStripes : true;
            
            const showRemarkEl = document.getElementById('settingShowRemark');
            if (showRemarkEl) showRemarkEl.checked = settings.showRemark !== undefined ? settings.showRemark : true;
            
            const bahtTextPosEl = document.getElementById('settingBahtTextPosition');
            if (bahtTextPosEl) bahtTextPosEl.value = settings.bahtTextPosition || 'right';
            
            const showHeaderLineEl = document.getElementById('settingShowHeaderLine');
            if (showHeaderLineEl) showHeaderLineEl.checked = settings.showHeaderLine !== undefined ? settings.showHeaderLine : true;
            
            const sigFormatEl = document.getElementById('settingSignatureFormat');
            if (sigFormatEl) sigFormatEl.value = settings.signatureFormat || 'full';

            const sigSizeEl = document.getElementById('settingSignatureSize');
            if (sigSizeEl) sigSizeEl.value = settings.signatureSize || '40';

            const useSigEl = document.getElementById('settingUseSignatureImage');
            if (useSigEl) useSigEl.checked = settings.useSignatureImage !== undefined ? settings.useSignatureImage : false;

            const quickSigEl = document.getElementById('quickToggleSignature');
            if (quickSigEl) quickSigEl.checked = useSigEl ? useSigEl.checked : false;

            // Restore Active Signatures on document
            if (settings.activeSignatures && Array.isArray(settings.activeSignatures)) {
                window.activeSignatures = settings.activeSignatures;
            } else if (settings.signatureImage) {
                window.activeSignatures = [{
                    id: 'act_' + Date.now(),
                    name: 'ลายเซ็นหลัก',
                    dataUrl: settings.signatureImage,
                    size: parseInt(settings.signatureImageSize || 45),
                    offsetX: parseInt(settings.signatureOffsetX || 0),
                    offsetY: parseInt(settings.signatureOffsetY || 0)
                }];
            } else {
                window.activeSignatures = [];
            }

            renderSavedSignaturesGallery();
            renderActiveSignaturesList();
            
            const introTextEl = document.getElementById('settingIntroText');
            if (introTextEl) introTextEl.value = settings.introText !== undefined ? settings.introText : 'ทางบริษัทฯ มีความยินดีขอเสนอราคาเพื่อพิจารณา ดังมีรายละเอียดต่อไปนี้:';
            
            if (settings.headerLayout) {
                applyHeaderLayout(settings.headerLayout);
            }

            // Restore info panel
            if (settings.infoPanelOrder) applyInfoPanelOrder(settings.infoPanelOrder);
            if (settings.headerFlex) {
                ['left', 'center', 'right', 'midLeft', 'midCenter', 'midRight', 'botLeft', 'botCenter', 'botRight'].forEach(z => {
                    const el = document.getElementById('zone-' + z.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
                    if (el && settings.headerFlex[z]) el.style.flex = settings.headerFlex[z];
                });
            }

            if (settings.infoPanelLeftFlex && settings.infoPanelRightFlex) {
                applyInfoPanelFlex(settings.infoPanelLeftFlex, settings.infoPanelRightFlex);
            }
            const dividerEl = document.getElementById('settingInfoDivider');
            if (dividerEl && settings.infoDivider !== undefined) dividerEl.checked = settings.infoDivider;
            const recTitleEl = document.getElementById('settingRecipientTitle');
            if (recTitleEl && settings.recipientTitle) recTitleEl.value = settings.recipientTitle;
            const docTitleEl = document.getElementById('settingDocDetailsTitle');
            if (docTitleEl && settings.docDetailsTitle) docTitleEl.value = settings.docDetailsTitle;
            
            if (settings.infoLabels) {
                if (document.getElementById('settingLabelTo')) document.getElementById('settingLabelTo').value = settings.infoLabels.to || 'ชื่อ / To:';
                if (document.getElementById('settingLabelAddress')) document.getElementById('settingLabelAddress').value = settings.infoLabels.address || 'ที่อยู่:';
                if (document.getElementById('settingLabelAttn')) document.getElementById('settingLabelAttn').value = settings.infoLabels.attn || 'ติดต่อ / Attn:';
                if (document.getElementById('settingLabelTel')) document.getElementById('settingLabelTel').value = settings.infoLabels.tel || 'โทร / Tel:';
                if (document.getElementById('settingLabelEmail')) document.getElementById('settingLabelEmail').value = settings.infoLabels.email || 'อีเมล:';
                if (document.getElementById('settingLabelRefNo')) document.getElementById('settingLabelRefNo').value = settings.infoLabels.refNo || 'เลขที่ / Ref. No:';
                if (document.getElementById('settingLabelDate')) document.getElementById('settingLabelDate').value = settings.infoLabels.date || 'วันที่ / Date:';
                if (document.getElementById('settingLabelValidity')) document.getElementById('settingLabelValidity').value = settings.infoLabels.validity || 'ยืนราคา / Validity:';
                if (document.getElementById('settingLabelDelivery')) document.getElementById('settingLabelDelivery').value = settings.infoLabels.delivery || 'ส่งมอบ / Delivery:';
                if (document.getElementById('settingLabelPayment')) document.getElementById('settingLabelPayment').value = settings.infoLabels.payment || 'ชำระเงิน / Payment:';
            }
            
            applyInfoPanelSettings();

            // Re-run apply function to update styles silently if modal is closed
            applyLivePreview();
        }

        // --- Quotation History & Import Projects ---
        async function openImportProjectModal() {
            document.getElementById('importProjectModal').style.display = 'flex';
            document.getElementById('importModalBackBtn').style.display = 'none';
            document.getElementById('importModalTitle').innerHTML = "<i class='bx bx-buildings'></i> เลือกสถานศึกษา";
            const container = document.getElementById('projectListContainer');
            
            if (!currentUser) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">กรุณาเข้าสู่ระบบเพื่อดูโครงการ</div>';
                return;
            }

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">กำลังโหลดข้อมูลสถานศึกษา...</div>';

            try {
                // Fetch logos
                const logoSnap = await getDoc(doc(db, 'material_settings', 'institution_logos'));
                if (logoSnap.exists()) {
                    institutionLogosCache = logoSnap.data();
                } else {
                    institutionLogosCache = {};
                }
                
                // Fetch institution details
                const detailsSnap = await getDoc(doc(db, 'material_settings', 'institution_details'));
                if (detailsSnap.exists()) {
                    institutionDetailsCache = detailsSnap.data();
                } else {
                    institutionDetailsCache = {};
                }
                
                // Fetch registered shops
                const shopsSnap = await getDoc(doc(db, 'material_settings', 'registered_shops'));
                if (shopsSnap.exists()) {
                    registeredShopsCache = shopsSnap.data().shops || [];
                } else {
                    registeredShopsCache = [];
                }

                // Fetch from material_projects and company_material_projects
                materialProjectsCache = [];
                let instSet = new Set();

                try {
                    const snapSchool = await getDocs(collection(db, 'material_projects'));
                    snapSchool.forEach(doc => {
                        const data = doc.data();
                        materialProjectsCache.push({ id: doc.id, _source: 'school', ...data });
                        const inst = data.institution || data.company;
                        if (inst && inst.trim() !== '') {
                            instSet.add(inst.trim());
                        } else {
                            instSet.add('ไม่ระบุสถานศึกษา/หน่วยงาน');
                        }
                    });
                } catch (e) {
                    console.warn("Error fetching material_projects:", e);
                }

                try {
                    const snapCompany = await getDocs(collection(db, 'company_material_projects'));
                    snapCompany.forEach(doc => {
                        const data = doc.data();
                        materialProjectsCache.push({ id: doc.id, _source: 'company', ...data });
                        const inst = data.company || data.institution;
                        if (inst && inst.trim() !== '') {
                            instSet.add(inst.trim());
                        } else {
                            instSet.add('ไม่ระบุสถานศึกษา/หน่วยงาน');
                        }
                    });
                } catch (e) {
                    console.warn("Error fetching company_material_projects:", e);
                }
                
                materialProjectsCache.sort((a, b) => {
                    const dateA = a.updatedAt || a.createdAt || '';
                    const dateB = b.updatedAt || b.createdAt || '';
                    return dateB.localeCompare(dateA);
                });
                
                uniqueInstitutions = Array.from(instSet).sort();
                
                renderInstitutionCards();

            } catch (err) {
                console.error("Error loading projects:", err);
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
            }
        }
        
        function renderInstitutionCards() {
            document.getElementById('importModalBackBtn').style.display = 'none';
            document.getElementById('importModalTitle').innerHTML = "<i class='bx bx-buildings'></i> เลือกสถานศึกษา";
            const container = document.getElementById('projectListContainer');
            container.innerHTML = '';
            
            if (uniqueInstitutions.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">ไม่พบข้อมูลสถานศึกษา</div>';
                return;
            }

            uniqueInstitutions.forEach(inst => {
                let projCount = 0;
                let itemCount = 0;
                materialProjectsCache.forEach(p => {
                    const pInst = (p.institution && p.institution.trim() !== '') ? p.institution.trim() : 'ไม่ระบุสถานศึกษา';
                    if (pInst === inst) {
                        projCount++;
                        itemCount += (p.items ? p.items.length : 0);
                    }
                });

                const logoUrl = institutionLogosCache[inst];
                const logoHtml = logoUrl 
                    ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;" alt="logo" onerror="this.src=''; this.onerror=null; this.parentElement.innerHTML='<i class=\\'bx bx-buildings\\' style=\\'font-size: 28px;\\'></i>';"/>`
                    : `<i class='bx bx-buildings' style="font-size: 28px;"></i>`;

                const div = document.createElement('div');
                div.style.background = 'white';
                div.style.padding = '20px';
                div.style.borderRadius = '12px';
                div.style.border = '1px solid var(--border-color)';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '20px';
                div.style.cursor = 'pointer';
                div.style.transition = 'all 0.2s';
                
                div.onmouseover = () => { div.style.borderColor = 'var(--primary-color)'; div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; };
                div.onmouseout = () => { div.style.borderColor = 'var(--border-color)'; div.style.boxShadow = 'none'; };
                
                div.onclick = () => showProjectsForInstitution(inst);

                div.innerHTML = `
                    <div style="width: 60px; height: 60px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); flex-shrink: 0;">
                        ${logoHtml}
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; font-size: 1.15rem; color: #1e293b; font-weight: 700;">${inst}</h4>
                        <div style="display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; font-weight: 500;">
                            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">${projCount} โครงการ</span>
                            <span style="display: flex; align-items: center; gap: 5px;"><i class='bx bx-package'></i> รวม ${itemCount} รายการพัสดุ</span>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }

        function backToInstitutionList() {
            renderInstitutionCards();
        }

        function showProjectsForInstitution(selectedInst) {
            document.getElementById('importModalBackBtn').style.display = 'block';
            document.getElementById('importModalTitle').innerHTML = "<i class='bx bx-import'></i> เลือกโครงการเพื่อดึงรายการวัสดุ";
            const container = document.getElementById('projectListContainer');
            
            const filteredProjects = materialProjectsCache.filter(p => {
                const pInst = (p.institution && p.institution.trim() !== '') ? p.institution.trim() : 'ไม่ระบุสถานศึกษา';
                return pInst === selectedInst;
            });
            
            if (filteredProjects.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">ไม่พบโครงการในสถานศึกษานี้</div>';
                return;
            }

            container.innerHTML = '';
            filteredProjects.forEach((proj) => {
                const originalIndex = materialProjectsCache.findIndex(p => p.id === proj.id);
                
                const div = document.createElement('div');
                div.style.background = 'white';
                div.style.padding = '12px 16px';
                div.style.borderRadius = '8px';
                div.style.border = '1px solid var(--border-color)';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.cursor = 'pointer';
                div.style.transition = 'all 0.2s';
                
                div.onmouseover = () => { div.style.borderColor = 'var(--primary-color)'; div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; };
                div.onmouseout = () => { div.style.borderColor = 'var(--border-color)'; div.style.boxShadow = 'none'; };
                
                const itemCount = proj.items ? proj.items.length : 0;
                const dateStr = proj.createdAt ? new Date(proj.createdAt).toLocaleDateString('th-TH') : '-';
                const compName = proj.company ? (Array.isArray(proj.company) ? proj.company.join(', ') : proj.company) : 'ไม่ระบุผู้ออกบิล';
                
                div.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 1rem;">${proj.name || 'โครงการไม่มีชื่อ'}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">ผู้ออกบิล: <span style="color: var(--primary-color); font-weight: 500;">${compName}</span> | รหัสงาน: ${proj.code || '-'} | รายการ: ${itemCount} รายการ | วันที่: ${dateStr}</div>
                    </div>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem; border-color: var(--primary-color); color: var(--primary-color);" onclick="importItemsFromProject(${originalIndex})">
                        ดึงรายการ
                    </button>
                `;
                container.appendChild(div);
            });
        }

        function closeImportProjectModal() {
            document.getElementById('importProjectModal').style.display = 'none';
        }

        async function autoImportProject(projectId, source) {
            try {
                const collectionName = (source === 'company') ? 'company_material_projects' : 'material_projects';
                
                // Helper to safely convert any items collection (Array or Object) to Array
                const toItemsArray = (items) => {
                    if (!items) return [];
                    if (Array.isArray(items)) return items;
                    if (typeof items === 'object') return Object.values(items);
                    return [];
                };

                // 1. Check pending_quotation_project from localStorage first (most direct & fresh)
                let pendingProj = null;
                try {
                    const pendingRaw = localStorage.getItem('pending_quotation_project');
                    if (pendingRaw) {
                        const parsed = JSON.parse(pendingRaw);
                        if (parsed && projectId && String(parsed.projectId) === String(projectId)) {
                            pendingProj = parsed;
                        }
                    }
                } catch (e) {
                    console.warn("Could not read pending_quotation_project:", e);
                }

                // 2. Check material_projects cache from localStorage
                let localCacheProj = null;
                try {
                    const cacheRaw = localStorage.getItem(source === 'company' ? 'company_material_projects' : 'material_projects');
                    if (cacheRaw) {
                        const list = JSON.parse(cacheRaw);
                        if (Array.isArray(list)) {
                            localCacheProj = list.find(p => String(p.id) === String(projectId));
                        }
                    }
                } catch(e) {
                    console.warn("Could not read local material_projects cache:", e);
                }

                // 3. Check Firestore
                let firestoreProj = null;
                try {
                    if (projectId) {
                        const projSnap = await getDoc(doc(db, collectionName, String(projectId)));
                        if (projSnap.exists()) {
                            firestoreProj = projSnap.data();
                        } else {
                            // Secondary scan in case document was stored with an auto ID
                            try {
                                const allSnaps = await getDocs(collection(db, collectionName));
                                allSnaps.forEach(d => {
                                    const dData = d.data();
                                    if (d.id === String(projectId) || String(dData.id) === String(projectId)) {
                                        firestoreProj = { id: d.id, ...dData };
                                    }
                                });
                            } catch(scanErr) {
                                console.warn("Collection scan fallback failed:", scanErr);
                            }
                        }
                    }
                } catch (snapErr) {
                    console.warn("Could not fetch project from Firestore:", snapErr);
                }

                // Combine sources with priority: pendingProj > localCacheProj > firestoreProj
                const proj = Object.assign({}, firestoreProj || {}, localCacheProj || {}, pendingProj || {});

                // Determine best items list
                let finalItems = [];
                if (pendingProj && toItemsArray(pendingProj.items).length > 0) {
                    finalItems = toItemsArray(pendingProj.items);
                } else if (localCacheProj && toItemsArray(localCacheProj.items).length > 0) {
                    finalItems = toItemsArray(localCacheProj.items);
                } else if (firestoreProj && toItemsArray(firestoreProj.items).length > 0) {
                    finalItems = toItemsArray(firestoreProj.items);
                } else if (proj && toItemsArray(proj.items).length > 0) {
                    finalItems = toItemsArray(proj.items);
                }

                if (!proj || !finalItems || finalItems.length === 0) {
                    console.warn("autoImportProject: No project or items found for", projectId);
                    if (typeof showToast === 'function') {
                        showToast('ไม่พบรายการวัสดุในโครงการนี้', 'warning');
                    }
                    return;
                }

                // Populate table using standard addHeaderRow / addTableRow
                const tbody = document.getElementById('itemsBody');
                if (tbody) tbody.innerHTML = '';

                finalItems.forEach(item => {
                    const price = Number(item.unitPrice) || Number(item.price) || Number(item.targetPrice) || Number(item.foundPrice) || 0;
                    const qtyVal = Number(item.qty) || 1;
                    
                    let displayName = item.desc || item.name || '';
                    if (item.storeInfo && item.storeInfo.trim() !== '') {
                        displayName += ` (ร้าน: ${item.storeInfo.trim()})`;
                    }
                    
                    if (item.isHeader) {
                        addHeaderRow({ customNo: item.customNo || '', desc: displayName });
                    } else {
                        addTableRow({
                            customNo: item.customNo || '',
                            desc: displayName,
                            qty: qtyVal,
                            unit: item.unit || 'ชุด',
                            price: price
                        });
                    }
                });

                // Apply Issuer Theme:
                const urlParams = new URLSearchParams(window.location.search);
                const paramShop = urlParams.get('shop');
                let targetIssuer = paramShop;
                
                if (!targetIssuer && proj.company && source !== 'company') {
                    const shopName = Array.isArray(proj.company) ? proj.company[0] : proj.company;
                    if (shopName && shopName.trim() !== '') {
                        targetIssuer = shopName.trim();
                    }
                }
                
                if (!targetIssuer && proj.shop && source === 'company') {
                    targetIssuer = Array.isArray(proj.shop) ? proj.shop[0] : proj.shop;
                }
                
                if (!targetIssuer) {
                    const currentIssuerText = document.getElementById('currentIssuerDisplay')?.innerText?.trim();
                    if (currentIssuerText && !currentIssuerText.includes('กรุณาเลือกบริษัท')) {
                        targetIssuer = currentIssuerText;
                    }
                }

                if (targetIssuer) {
                    try {
                        applyIssuerTemplate(targetIssuer);
                    } catch(e) {
                        console.warn("Could not apply issuer template:", e);
                    }
                } else {
                    applyLivePreview();
                }

                if (source === 'company') {
                    const vatSelect = document.getElementById('vatTypeSelect');
                    if (vatSelect) vatSelect.value = 'exclusive';
                }

                // Populate Customer Info
                let instDetails = {};
                if (source === 'company') {
                    // In company page: proj.company = company/customer name
                    if (proj.company && proj.company.trim() !== '' && proj.company.trim() !== 'ไม่ระบุบริษัท') {
                        let instName = proj.company.trim();
                        // Fetch company details from company_material_settings
                        try {
                            const compSnap = await getDoc(doc(db, 'company_material_settings', 'company_details'));
                            if (compSnap.exists()) {
                                const compDetails = compSnap.data()[instName] || {};
                                
                                // Append Branch info to Company Name
                                if (compDetails.branchType === 'branch') {
                                    instName += ` (สาขา: ${compDetails.branchNo || '-'})`;
                                } else if (compDetails.branchType === 'hq') {
                                    instName += ` (สำนักงานใหญ่)`;
                                }

                                if (document.getElementById('toCompany')) document.getElementById('toCompany').value = instName;
                                if (document.getElementById('toAddress')) document.getElementById('toAddress').value = compDetails.address || proj.address || '';
                                if (document.getElementById('toAttn')) document.getElementById('toAttn').value = compDetails.contact || proj.attn || proj.teacher || '';
                                if (document.getElementById('toTel')) document.getElementById('toTel').value = compDetails.phone || proj.tel || '';
                                if (document.getElementById('toEmail')) document.getElementById('toEmail').value = compDetails.email || proj.email || '';
                                if (document.getElementById('toTaxId')) {
                                    document.getElementById('toTaxId').value = compDetails.taxId || '';
                                }
                            } else {
                                if (document.getElementById('toCompany')) document.getElementById('toCompany').value = instName;
                            }
                        } catch(e) {
                            console.warn("Failed to fetch company details:", e);
                            if (document.getElementById('toCompany')) document.getElementById('toCompany').value = instName;
                        }
                    }
                } else if (proj.institution && proj.institution.trim() !== '' && proj.institution.trim() !== 'ไม่ระบุสถานศึกษา') {
                    const instName = proj.institution.trim();
                    if (document.getElementById('toCompany')) document.getElementById('toCompany').value = instName;
                    
                    try {
                        const instSnap = await getDoc(doc(db, 'material_settings', 'institution_details'));
                        if (instSnap.exists()) {
                            instDetails = instSnap.data()[instName] || {};
                        }
                    } catch (e) {
                        console.warn("Could not fetch institution details:", e);
                    }

                    if (document.getElementById('toAddress')) document.getElementById('toAddress').value = instDetails.address || proj.address || '';
                    if (document.getElementById('toAttn')) document.getElementById('toAttn').value = instDetails.contact || proj.attn || proj.teacher || '';
                    if (document.getElementById('toTel')) document.getElementById('toTel').value = instDetails.phone || proj.tel || '';
                    if (document.getElementById('toEmail')) document.getElementById('toEmail').value = instDetails.email || proj.email || '';
                } else {
                    if (proj.company && document.getElementById('toCompany')) document.getElementById('toCompany').value = proj.company;
                    if (proj.address && document.getElementById('toAddress')) document.getElementById('toAddress').value = proj.address;
                    if ((proj.attn || proj.teacher) && document.getElementById('toAttn')) document.getElementById('toAttn').value = proj.attn || proj.teacher;
                    if (proj.tel && document.getElementById('toTel')) document.getElementById('toTel').value = proj.tel;
                    if (proj.email && document.getElementById('toEmail')) document.getElementById('toEmail').value = proj.email;
                }

                // Import Discount if project has discount
                if (proj.discountValue && parseFloat(proj.discountValue) > 0) {
                    const dVal = parseFloat(proj.discountValue);
                    const dType = proj.discountType || 'percent';
                    const discountInputEl = document.getElementById('discountInput');
                    
                    if (discountInputEl) {
                        if (dType === 'percent') {
                            // Calculate items total and get percent discount amount
                            let itemsTotal = 0;
                            const rows = document.getElementById('itemsBody')?.children || [];
                            for (let i = 0; i < rows.length; i++) {
                                const tr = rows[i];
                                if (tr.classList?.contains('is-header-row') || tr.querySelector('.item-is-header')) continue;
                                const q = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
                                const p = parseFloat(tr.querySelector('.item-price')?.value) || 0;
                                itemsTotal += (q * p);
                            }
                            discountInputEl.value = Math.round(((itemsTotal * dVal) / 100) * 100) / 100;
                        } else {
                            discountInputEl.value = dVal;
                        }
                    }
                } else {
                    const discountInputEl = document.getElementById('discountInput');
                    if (discountInputEl) discountInputEl.value = '0';
                }

                hasAutoImported = true;
                updateRowNumbers();
                calculateAll();
                triggerLiveSync();
                
                // Remove search params after importing
                const url = new URL(window.location);
                url.searchParams.delete('projectId');
                url.searchParams.delete('shop');
                url.searchParams.delete('docType');
                url.searchParams.delete('source');
                url.searchParams.delete('loadPending');
                window.history.replaceState({}, '', url);

                if (typeof showToast === 'function') {
                    showToast(`ดึงข้อมูล ${proj.name || 'โครงการ'} เรียบร้อยแล้ว`, 'success');
                }

            } catch (err) {
                console.error("Error auto-importing project:", err);
            }
        }

        function importItemsFromProject(index) {
            const proj = materialProjectsCache[index];
            if (!proj || !proj.items || proj.items.length === 0) {
                alert('โครงการนี้ไม่มีรายการวัสดุ');
                return;
            }
            
            if (confirm(`ต้องการดึง ${proj.items.length} รายการ จากโครงการ "${proj.name || 'ไม่มีชื่อ'}" ลงในตารางใบเสนอราคาหรือไม่?\n(รายการเดิมที่มีอยู่จะถูกลบทิ้ง)`)) {
                const tbody = document.getElementById('itemsBody');
                tbody.innerHTML = '';
                
                proj.items.forEach(item => {
                    const price = item.unitPrice || item.targetPrice || item.foundPrice || 0;
                    const qtyVal = item.qty || 1;
                    
                    let displayName = item.name || '';
                    if (item.storeInfo && item.storeInfo.trim() !== '') {
                        displayName += ` (ร้าน: ${item.storeInfo.trim()})`;
                    }
                    
                    if (item.isHeader) {
                        addHeaderRow({ customNo: item.customNo || '', desc: displayName });
                    } else {
                        addTableRow({
                            customNo: item.customNo || '',
                            desc: displayName,
                            qty: qtyVal,
                            unit: item.unit || 'ชุด',
                            price: price
                        });
                    }
                });
                
                // If project is from company source, set VAT mode to 'exclusive' (แยก VAT 7%)
                if (proj.source === 'company' || proj.company) {
                    const vatSelect = document.getElementById('vatTypeSelect');
                    if (vatSelect) vatSelect.value = 'exclusive';
                }

                // proj.company is the CUSTOMER/institution, NOT the issuer.
                // Do NOT override the issuer template with the customer name.
                // Re-apply the current issuer to keep font/color/settings intact.
                const currentIssuer = document.getElementById('currentIssuerDisplay')?.innerText || null;
                applyIssuerTemplate(currentIssuer);
                
                // Sync Customer Info from Institution Details
                if (proj.institution && proj.institution.trim() !== '' && proj.institution.trim() !== 'ไม่ระบุสถานศึกษา') {
                    const instName = proj.institution.trim();
                    document.getElementById('toCompany').value = instName;
                    
                    if (institutionDetailsCache && institutionDetailsCache[instName]) {
                        const details = institutionDetailsCache[instName];
                        document.getElementById('toAddress').value = details.address || '';
                        document.getElementById('toAttn').value = details.contact || '';
                        document.getElementById('toTel').value = details.phone || '';
                        document.getElementById('toEmail').value = details.email || '';
                        if (document.getElementById('toTaxId')) document.getElementById('toTaxId').value = details.taxId || '';
                    } else {
                        // Clear fields if no details found for this institution
                        document.getElementById('toAddress').value = '';
                        document.getElementById('toAttn').value = '';
                        document.getElementById('toTel').value = '';
                        document.getElementById('toEmail').value = '';
                        if (document.getElementById('toTaxId')) document.getElementById('toTaxId').value = '';
                    }
                }
                
                // Import Discount if project has discount
                if (proj.discountValue && parseFloat(proj.discountValue) > 0) {
                    const dVal = parseFloat(proj.discountValue);
                    const dType = proj.discountType || 'percent';
                    const discountInputEl = document.getElementById('discountInput');
                    
                    if (discountInputEl) {
                        if (dType === 'percent') {
                            let itemsTotal = 0;
                            const rows = document.getElementById('itemsBody').children;
                            for (let i = 0; i < rows.length; i++) {
                                const tr = rows[i];
                                if (tr.querySelector('.item-is-header')) continue;
                                const q = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
                                const p = parseFloat(tr.querySelector('.item-price')?.value) || 0;
                                itemsTotal += (q * p);
                            }
                            discountInputEl.value = Math.round(((itemsTotal * dVal) / 100) * 100) / 100;
                        } else {
                            discountInputEl.value = dVal;
                        }
                    }
                } else {
                    const discountInputEl = document.getElementById('discountInput');
                    if (discountInputEl) discountInputEl.value = '0';
                }

                updateRowNumbers();
                applyLivePreview();
                calculateAll();
                try {
                    localStorage.removeItem('pending_quotation_project');
                } catch(e) {}
                closeImportProjectModal();
            }
        }

        function applyIssuerTheme(companyName) {
            const printArea = document.getElementById('printArea');
            if (!printArea) return;
            
            let shop = null;
            if (companyName && registeredShopsCache) {
                shop = registeredShopsCache.find(s => {
                    const sName = typeof s === 'string' ? s : (s.name || '');
                    return sName.trim() === String(companyName).trim();
                });
            }

            if (shop && typeof shop !== 'string') {
                const banner = document.getElementById('currentIssuerBanner');
                const bannerName = document.getElementById('currentIssuerDisplay');
                const bannerLogo = document.getElementById('currentIssuerLogo');
                const bannerIcon = document.getElementById('currentIssuerIcon');
                
                const themeColor = shop.themeColor || '#1A6FBF';
                if (banner) {
                    banner.style.background = `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`;
                    banner.style.boxShadow = `0 10px 25px -5px ${themeColor}55`;
                }
                if (bannerName) bannerName.innerText = shop.name || '';
                if (bannerLogo && shop.logo) {
                    bannerLogo.src = shop.logo;
                    bannerLogo.style.display = 'block';
                    if (bannerIcon) bannerIcon.style.display = 'none';
                } else {
                    if (bannerLogo) bannerLogo.style.display = 'none';
                    if (bannerIcon) {
                        bannerIcon.style.display = 'block';
                        bannerIcon.style.color = themeColor;
                    }
                }
                if (shop.themeColor) {
                    printArea.style.setProperty('--pdf-primary', shop.themeColor);
                    const hex = shop.themeColor.replace('#', '');
                    if(hex.length === 6 || hex.length === 8) {
                        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
                        printArea.style.setProperty('--pdf-primary-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
                    }
                    document.getElementById('settingPrimaryColor').value = shop.themeColor;
                } else {
                    printArea.style.removeProperty('--pdf-primary');
                    printArea.style.removeProperty('--pdf-primary-light');
                }
                
                document.getElementById('pIssuerName').innerText = shop.name || '';
                document.getElementById('pIssuerSubName').innerText = ''; // Hide subname for custom shops
                document.getElementById('pIssuerAddress').innerText = shop.address || '';
                
                let contactStr = '';
                if (shop.phone) contactStr += `<span style="color: var(--pdf-primary, #1A6FBF); font-weight: 600;">TEL:</span> ${shop.phone} &nbsp;&nbsp;`;
                if (shop.taxId) contactStr += `<span style="color: var(--pdf-primary, #1A6FBF); font-weight: 600;">TAX ID:</span> ${shop.taxId}`;
                document.getElementById('pIssuerContact').innerHTML = contactStr;
                
                if (shop.logo) {
                    document.getElementById('pLogoImg').src = shop.logo;
                    document.getElementById('settingShowLogo').checked = true;
                } else {
                    document.getElementById('pLogoImg').style.display = 'none';
                    document.getElementById('settingShowLogo').checked = false;
                }
                
                if (shop.signer) {
                    document.getElementById('settingSellerName').value = shop.signer;
                }
            } else {
                const banner = document.getElementById('currentIssuerBanner');
                const bannerName = document.getElementById('currentIssuerDisplay');
                const bannerLogo = document.getElementById('currentIssuerLogo');
                const bannerIcon = document.getElementById('currentIssuerIcon');

                if (banner) banner.style.backgroundColor = '#1A6FBF';
                if (bannerName) bannerName.innerText = 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
                if (bannerLogo) bannerLogo.style.display = 'none';
                if (bannerIcon) bannerIcon.style.display = 'block';

                // Default Mentra Solution
                printArea.style.removeProperty('--pdf-primary');
                printArea.style.removeProperty('--pdf-primary-light');
                document.getElementById('settingPrimaryColor').value = '#1A6FBF';
                document.getElementById('pIssuerName').innerText = 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
                document.getElementById('pIssuerAddress').innerText = '';
                const fallbackSigner = (currentUser ? (currentUser.displayName || currentUser.email) : '') || '';
                if (fallbackSigner) {
                    document.getElementById('settingSellerName').value = `( ${fallbackSigner} )`;
                }
                document.getElementById('pIssuerContact').innerHTML = '';
                document.getElementById('pLogoImg').src = '../../assets/img/logo.png';
                document.getElementById('settingShowLogo').checked = true;
            }
            
            // Re-apply live preview to force all color and logo display updates
            applyLivePreview();
        }

        let currentHistoryFilter = 'quotation';

        function openHistoryModal(initialType = null) {
            document.getElementById('quotationHistoryModal').style.display = 'flex';
            const filterType = initialType || currentDocType || 'quotation';
            filterHistoryByDocType(filterType);
        }

        function closeHistoryModal() {
            document.getElementById('quotationHistoryModal').style.display = 'none';
        }

        function filterHistoryByDocType(type) {
            currentHistoryFilter = type;
            ['quotation', 'invoice', 'receipt'].forEach(t => {
                const tab = document.getElementById(`histTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
                if (tab) {
                    if (t === type) {
                        tab.style.background = 'white';
                        tab.style.color = '#1d4ed8';
                        tab.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                    } else {
                        tab.style.background = 'transparent';
                        tab.style.color = '#64748b';
                        tab.style.boxShadow = 'none';
                    }
                }
            });

            if (currentUser) {
                loadQuotationHistory();
                loadDocumentHistory(type);
            } else {
                document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px;">กรุณาเข้าสู่ระบบเพื่อดูประวัติ</td></tr>';
            }
        }

        async function saveDocumentToHistory() {
            if (!currentUser) return;

            const config = DOC_TYPE_CONFIG[currentDocType] || DOC_TYPE_CONFIG.quotation;
            const refNo = document.getElementById('refNo')?.value || '';
            const toCompany = document.getElementById('toCompany')?.value || '';
            const docDate = document.getElementById('docDate')?.value || '';
            const grandTotal = document.getElementById('grandTotalDisplay')?.innerText || '0.00';
            
            const items = [];
            const rows = document.getElementById('itemsBody')?.children || [];
            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                items.push({
                    customNo: tr.querySelector('.item-custom-no')?.value || '',
                    desc: tr.querySelector('.item-desc')?.value || '',
                    qty: tr.querySelector('.item-qty')?.value || '',
                    unit: tr.querySelector('.item-unit')?.value || '',
                    price: tr.querySelector('.item-price')?.value || '',
                    isHeader: tr.querySelector('.item-is-header') ? true : false
                });
            }

            const docData = {
                docType: currentDocType,
                docTypeTitle: config.titleTH,
                parentRefNo: workflowHistory.parentRefNo || '',
                refNo,
                toCompany,
                toAddress: document.getElementById('toAddress')?.value || '',
                toAttn: document.getElementById('toAttn')?.value || '',
                toTel: document.getElementById('toTel')?.value || '',
                toEmail: document.getElementById('toEmail')?.value || '',
                docDate,
                termValidity: document.getElementById('termValidity')?.value || '',
                termDelivery: document.getElementById('termDelivery')?.value || '',
                termPayment: document.getElementById('termPayment')?.value || '',
                remark: document.getElementById('remark')?.value || '',
                grandTotal,
                items,
                createdAt: new Date().toISOString()
            };

            try {
                const collName = config.firestoreCollection || 'quotations_history';
                const historyRef = collection(db, 'users', currentUser.uid, collName);
                await addDoc(historyRef, docData);
                console.log(`Document saved to ${collName}`);
            } catch (err) {
                console.error(`Error saving document to history:`, err);
            }
        }
        const saveQuotationToHistory = saveDocumentToHistory;

        async function triggerQuotationTelegramNotification() {
            if (!window.TelegramService) return;
            try {
                const config = DOC_TYPE_CONFIG[currentDocType] || DOC_TYPE_CONFIG.quotation;
                const refNo = document.getElementById('refNo')?.value || '';
                const toCompany = document.getElementById('toCompany')?.value || '';
                const docDate = document.getElementById('docDate')?.value || '';
                const grandTotal = document.getElementById('grandTotalDisplay')?.innerText || '0.00';

                let issuer = '';
                const currentIssuerDisplay = document.getElementById('currentIssuerDisplay');
                if (currentIssuerDisplay && currentIssuerDisplay.innerText) {
                    issuer = currentIssuerDisplay.innerText.replace('ผู้เสนอราคา:', '').replace('ร้านค้า:', '').trim();
                }
                if (!issuer && window.currentIssuerName) {
                    issuer = window.currentIssuerName;
                }

                const rows = document.getElementById('itemsBody')?.children || [];
                const itemsCount = rows.length;

                const signer = (currentUser ? (currentUser.displayName || currentUser.email) : '') || 
                               document.getElementById('sellerSignerName')?.value || 
                               'ผู้ดูแลระบบ';

                window.TelegramService.sendQuotationAlert({
                    docTypeTitle: config.telegramLabel,
                    refNo,
                    toCompany,
                    issuer,
                    grandTotal,
                    itemsCount,
                    signer,
                    docDate
                }, db, { doc, getDoc });
            } catch (e) {
                console.warn('[Telegram] Could not dispatch quotation alert:', e);
            }
        }
        window.triggerQuotationTelegramNotification = triggerQuotationTelegramNotification;

        async function loadDocumentHistory(docType = currentDocType) {
            if (!currentUser) return;
            const config = DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG.quotation;
            const collName = config.firestoreCollection || 'quotations_history';
            const tbody = document.getElementById('historyTableBody');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px;">กำลังโหลดข้อมูล...</td></tr>';
            
            try {
                const historyRef = collection(db, 'users', currentUser.uid, collName);
                const q = query(historyRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                loadedHistory = [];
                tbody.innerHTML = '';
                
                if (querySnapshot.empty) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;">ยังไม่มีประวัติการออก${config.titleTH}</td></tr>`;
                    return;
                }

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const id = docSnap.id;
                    loadedHistory.push({ id, ...data, docType: docType });
                    
                    const dateObj = new Date(data.docDate || data.createdAt);
                    const formattedDate = isNaN(dateObj.getTime()) ? '-' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    
                    const index = loadedHistory.length - 1;

                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-color)';
                    tr.innerHTML = `
                        <td style="padding: 12px 24px;">${formattedDate}</td>
                        <td style="padding: 12px 24px; font-weight: 500;">
                            ${data.refNo || '-'}
                            ${data.parentRefNo ? `<div style="font-size: 0.72rem; color: #94a3b8;">อ้างอิง: ${data.parentRefNo}</div>` : ''}
                        </td>
                        <td style="padding: 12px 24px;">${data.toCompany || '-'}</td>
                        <td style="padding: 12px 24px; text-align: right; color: var(--primary-color); font-weight: 600;">${data.grandTotal || '0.00'}</td>
                        <td style="padding: 12px 24px; text-align: center;">
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 4px;" onclick="loadQuotationToForm(${index})">
                                <i class='bx bx-import'></i> โหลด
                            </button>
                            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteDocumentHistory('${id}', '${collName}')">
                                <i class='bx bx-trash'></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                console.error('Error loading history:', err);
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            }
        }
        const loadQuotationHistory = () => loadDocumentHistory(currentHistoryFilter);

        async function deleteDocumentHistory(id, collName = null) {
            const targetColl = collName || DOC_TYPE_CONFIG[currentHistoryFilter]?.firestoreCollection || 'quotations_history';
            if (typeof Swal !== 'undefined') {
                const res = await Swal.fire({
                    title: 'ยืนยันการลบประวัติเอกสาร?',
                    text: 'ข้อมูลเอกสารนี้จะถูกลบออกจากประวัติอย่างถาวรและไม่สามารถกู้คืนได้',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: '<i class="bx bx-trash"></i> ยืนยันการลบ',
                    cancelButtonText: 'ยกเลิก',
                    reverseButtons: true,
                    focusCancel: true
                });
                if (!res.isConfirmed) return;
            } else {
                if (!confirm('คุณต้องการลบประวัติเอกสารนี้ใช่หรือไม่?')) return;
            }

            try {
                await deleteDoc(doc(db, 'users', currentUser.uid, targetColl, id));
                loadDocumentHistory(currentHistoryFilter);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'ลบประวัติเอกสารสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            } catch (err) {
                console.error('Error deleting history:', err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        text: 'เกิดข้อผิดพลาดในการลบข้อมูล'
                    });
                } else {
                    alert('เกิดข้อผิดพลาดในการลบข้อมูล');
                }
            }
        }
        const deleteQuotationHistory = deleteDocumentHistory;

        function loadQuotationToForm(index) {
            const data = loadedHistory[index];
            if (!data) return;

            // Switch to the loaded docType
            const docTypeToSwitch = data.docType || (data.refNo?.startsWith('MTI') ? 'invoice' : (data.refNo?.startsWith('MTR') ? 'receipt' : 'quotation'));
            switchDocType(docTypeToSwitch, { generateNewRef: false });

            document.getElementById('refNo').value = data.refNo || '';
            document.getElementById('toCompany').value = data.toCompany || '';
            document.getElementById('toAddress').value = data.toAddress || '';
            document.getElementById('toAttn').value = data.toAttn || '';
            document.getElementById('toTel').value = data.toTel || '';
            document.getElementById('toEmail').value = data.toEmail || '';
            document.getElementById('docDate').value = data.docDate || '';
            document.getElementById('termValidity').value = data.termValidity || '';
            document.getElementById('termDelivery').value = data.termDelivery || '';
            document.getElementById('termPayment').value = data.termPayment || '';
            document.getElementById('remark').value = data.remark || '';

            const tbody = document.getElementById('itemsBody');
            tbody.innerHTML = '';
            
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    if (item.isHeader) {
                        addHeaderRow(item);
                    } else {
                        addTableRow(item);
                    }
                });
            } else {
                addTableRow();
            }

            updateRowNumbers();
            calculateAll();
            triggerLiveSync();
            closeHistoryModal();
            showToast('โหลดข้อมูลลงในฟอร์มสำเร็จ', 'success');
        }

        // --- Mobile Sidebar Controls ---
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        function setCurrentDate() {
            document.getElementById('docDate').valueAsDate = new Date();
            if (typeof triggerLiveSync === 'function') triggerLiveSync();
        }

        // --- Expose functions to global window scope for inline HTML events ---
        window.setCurrentDate = setCurrentDate;
        window.generateRefNo = generateRefNo;
        window.addTableRow = addTableRow;
        window.removeTableRow = removeTableRow;
        window.calculateRow = calculateRow;
        window.exportToPDF = exportToPDF;
        window.triggerQuotationTelegramNotification = triggerQuotationTelegramNotification;
        window.openRecipientModal = openRecipientModal;
        window.closeRecipientModal = closeRecipientModal;
        window.filterRecipientCards = filterRecipientCards;
        window.selectRecipientFromModal = selectRecipientFromModal;
        window.selectRecipientByIndex = selectRecipientByIndex;
        window.selectRecipientByData = selectRecipientByData;
        window.deleteRecipientFromModal = deleteRecipientFromModal;
        window.deleteRecipientItem = deleteRecipientItem;
        window.saveCurrentRecipient = saveCurrentRecipient;
        window.openTemplateSettingsModal = openTemplateSettingsModal;
        window.closeTemplateSettingsModal = closeTemplateSettingsModal;
        window.saveTemplateSettings = saveTemplateSettings;
        window.openIssuerSelectionModal = openIssuerSelectionModal;
        window.closeIssuerSelectionModal = closeIssuerSelectionModal;
        window.selectIssuerFromModal = selectIssuerFromModal;
        window.applyLivePreview = applyLivePreview;
        window.openHistoryModal = openHistoryModal;
        window.closeHistoryModal = closeHistoryModal;
        window.deleteQuotationHistory = deleteQuotationHistory;
        window.deleteDocumentHistory = deleteDocumentHistory;
        window.loadQuotationHistory = loadQuotationHistory;
        window.loadDocumentHistory = loadDocumentHistory;
        window.filterHistoryByDocType = filterHistoryByDocType;
        window.loadQuotationToForm = loadQuotationToForm;
        window.saveDocumentToHistory = saveDocumentToHistory;
        window.switchDocType = switchDocType;
        window.confirmAndAdvanceWorkflow = confirmAndAdvanceWorkflow;
        window.openWorkflowConfirmModal = openWorkflowConfirmModal;
        window.closeWorkflowConfirmModal = closeWorkflowConfirmModal;
        window.executeWorkflowTransition = executeWorkflowTransition;
        window.onWorkflowStepClick = onWorkflowStepClick;
        window.DOC_TYPE_CONFIG = DOC_TYPE_CONFIG;
        window.toggleSidebar = toggleSidebar;
        window.closeSidebar = closeSidebar;
        window.openImportProjectModal = openImportProjectModal;
        window.closeImportProjectModal = closeImportProjectModal;
        window.importItemsFromProject = importItemsFromProject;
        window.showProjectsForInstitution = showProjectsForInstitution;
        window.backToInstitutionList = backToInstitutionList;
        window.addHeaderRow = addHeaderRow;
        window.swapInfoPanels = swapInfoPanels;
        window.toggleInfoDrag = toggleInfoDrag;
        window.applyInfoPanelSettings = applyInfoPanelSettings;
        window.handleSignatureFileUpload = handleSignatureFileUpload;
        window.handleUseSignatureChange = handleUseSignatureChange;
        window.toggleQuickSignature = toggleQuickSignature;
        window.syncQuickSignatureToggle = syncQuickSignatureToggle;
        window.openSignatureUploaderDirect = openSignatureUploaderDirect;
        window.toggleSignatureToDocument = toggleSignatureToDocument;
        window.renderActiveSignaturesList = renderActiveSignaturesList;
        window.removeActiveSignature = removeActiveSignature;
        window.updateActiveSigProperty = updateActiveSigProperty;
        window.resetAllSignatureOffsets = resetAllSignatureOffsets;
        window.deleteSignatureFromGallery = deleteSignatureFromGallery;
        window.renderSavedSignaturesGallery = renderSavedSignaturesGallery;
        window.getSavedSignatures = getSavedSignatures;
        window.autoSaveCurrentIssuerTemplate = autoSaveCurrentIssuerTemplate;
        window.initSignatureDraggable = initSignatureDraggable;
        window.duplicateTableRow = duplicateTableRow;
        window.setTermPreset = setTermPreset;
        window.toggleAutoPageBreak = toggleAutoPageBreak;
        window.appendRemarkPreset = appendRemarkPreset;
        window.setViewMode = setViewMode;
        window.setPreviewZoom = setPreviewZoom;
        window.changePreviewZoom = changePreviewZoom;
        window.fitPreviewToScreen = fitPreviewToScreen;
        window.copyRefNo = copyRefNo;
        window.copyBahtText = copyBahtText;
        window.showToast = showToast;
        window.triggerLiveSync = triggerLiveSync;
        window.updateHeroDisplays = updateHeroDisplays;

        // Init info panel resizer
        initInfoResizer();

        // Initialize drag-and-drop reordering
        const initSortable = () => {
            const tbody = document.getElementById('itemsBody');
            if (tbody && typeof Sortable !== 'undefined') {
                new Sortable(tbody, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-slate-100',
                    onEnd: function (evt) {
                        updateRowNumbers();
                        calculateAll();
                        triggerLiveSync();
                    }
                });
            }
        };
        // Run immediately since script is at the end of body
        initSortable();
        window.addEventListener('load', initSortable);

        // Bind real-time input events for live preview & initialize default state
        const bindRealTimeInputs = () => {
            const fieldIds = [
                'refNo', 'docDate', 'toCompany', 'toAddress', 'toAttn', 
                'toTel', 'toEmail', 'toTaxId', 'termValidity', 'termDelivery', 
                'termPayment', 'remark', 'discountInput', 'vatTypeSelect'
            ];
            fieldIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', triggerLiveSync);
                    el.addEventListener('change', triggerLiveSync);
                }
            });

            // If empty table, add initial row only if not auto-importing
            const tbody = document.getElementById('itemsBody');
            const urlParams = new URLSearchParams(window.location.search);
            const autoImportId = urlParams.get('projectId');
            if (!autoImportId && tbody && tbody.children.length === 0) {
                addTableRow();
            }

            // Set current date if empty
            const docDateEl = document.getElementById('docDate');
            if (docDateEl && !docDateEl.value) {
                setCurrentDate();
            }

            // Restore view mode (Default: 'editor' - ตาราง)
            let savedMode = localStorage.getItem('quote_view_mode');
            if (savedMode !== 'preview') savedMode = 'editor';
            setViewMode(savedMode);
            // Bind issuer banner and switch button explicitly
            const banner = document.getElementById('currentIssuerBanner');
            if (banner) {
                banner.style.cursor = 'pointer';
                banner.addEventListener('click', (e) => {
                    e.preventDefault();
                    openIssuerSelectionModal();
                });
            }
            const switchBtn = document.querySelector('.issuer-switch-btn');
            if (switchBtn) {
                switchBtn.style.cursor = 'pointer';
                switchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openIssuerSelectionModal();
                });
            }

            triggerLiveSync();
        };

        function startApp() {
            fetchRegisteredShops();
            initializePage();
            bindRealTimeInputs();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startApp);
        } else {
            startApp();
        }
    