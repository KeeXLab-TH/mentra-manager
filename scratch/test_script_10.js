
        // Pre-load safe display caches (logos/details/shops don't affect auth filtering)
        let _cachedLogos = {};
        let _cachedDetails = {};
        let _cachedShops = [];
        try {
            const cl = localStorage.getItem('material_institution_logos');
            if (cl) _cachedLogos = JSON.parse(cl) || {};
            const cd = localStorage.getItem('material_institution_details');
            if (cd) _cachedDetails = JSON.parse(cd) || {};
            const cs = localStorage.getItem('material_registered_shops');
            if (cs) _cachedShops = JSON.parse(cs) || [];
        } catch(e) {}

        // Data Store — currentUserId/Role are set by Firebase auth (never from stale cache)
        // to avoid filtering private institutions with a null/wrong UID before auth confirms
        window.appData = {
            projects: [],
            institutionLogos: _cachedLogos,
            institutionDetails: _cachedDetails,
            registeredShops: _cachedShops,
            currentUserId: null,
            currentUserRole: 'user',
            isLoadingProjects: true,
            selectedShopsForForm: [],
            currentProjectId: null,
            currentInstitution: null,
            uploadingLogoFor: null,
            selectedLogoBase64: null,
            sharePermission: 'view',
            isReadOnly: false,
            hasAutoOpenedSharedProject: false,
            autoMarkup35: localStorage.getItem('materials_auto_markup_35') !== 'false',

            toggleAutoMarkup() {
                this.autoMarkup35 = !this.autoMarkup35;
                localStorage.setItem('materials_auto_markup_35', this.autoMarkup35 ? 'true' : 'false');
                this.updateAutoMarkupUI();
                this.showToast(this.autoMarkup35 ? 'เปิดการคำนวณราคาขาย (+35% อัตโนมัติ) แล้ว' : 'ปิดการคำนวณราคาขาย (+35% อัตโนมัติ) แล้ว', this.autoMarkup35 ? 'success' : 'info');
            },

            updateAutoMarkupUI() {
                const btn = document.getElementById('btn-toggle-markup');
                const status = document.getElementById('status-auto-markup');
                if (!btn || !status) return;
                
                if (this.autoMarkup35) {
                    btn.className = "bg-amber-50 border-2 border-amber-300 text-amber-800 hover:bg-amber-100 px-3 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-1.5 text-sm";
                    status.innerHTML = '<span class="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-bold"><i class="fa-solid fa-circle-check"></i> เปิด</span>';
                } else {
                    btn.className = "bg-slate-100 border-2 border-slate-300 text-slate-500 hover:bg-slate-200 px-3 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-1.5 text-sm opacity-75";
                    status.innerHTML = '<span class="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-xs font-bold"><i class="fa-solid fa-circle-xmark"></i> ปิด</span>';
                }
            },

            // Share Modal Logic
            openShareModal() {
                if (!this.currentProjectId) return;
                const modal = document.getElementById('share-modal');
                const content = document.getElementById('share-modal-content');
                if (!modal || !content) return;
                
                this.updateSharePermission(this.sharePermission || 'view');
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },

            closeShareModal() {
                const modal = document.getElementById('share-modal');
                const content = document.getElementById('share-modal-content');
                if (!modal || !content) return;
                
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 300);
            },

            updateSharePermission(perm) {
                this.sharePermission = perm;
                
                const viewCard = document.getElementById('share-perm-view-card');
                const editCard = document.getElementById('share-perm-edit-card');
                const viewRadio = viewCard ? viewCard.querySelector('input') : null;
                const editRadio = editCard ? editCard.querySelector('input') : null;
                
                if (perm === 'view') {
                    if (viewRadio) viewRadio.checked = true;
                    if (viewCard) viewCard.className = "flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all border-purple-500 bg-purple-50/50";
                    if (editCard) editCard.className = "flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300";
                } else {
                    if (editRadio) editRadio.checked = true;
                    if (editCard) editCard.className = "flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all border-purple-500 bg-purple-50/50";
                    if (viewCard) viewCard.className = "flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all border-slate-200 hover:border-slate-300";
                }
                
                const baseUrl = window.location.origin + window.location.pathname;
                const shareUrl = `${baseUrl}?projectId=${encodeURIComponent(this.currentProjectId)}&mode=${perm}`;
                const input = document.getElementById('share-url-input');
                if (input) input.value = shareUrl;
            },

            copyShareUrl() {
                const input = document.getElementById('share-url-input');
                if (!input || !input.value) return;
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(input.value).then(() => {
                        this.showToast('คัดลอกลิงก์แชร์เรียบร้อยแล้ว!', 'success');
                    }).catch(() => {
                        input.select();
                        document.execCommand('copy');
                        this.showToast('คัดลอกลิงก์แชร์เรียบร้อยแล้ว!', 'success');
                    });
                } else {
                    input.select();
                    document.execCommand('copy');
                    this.showToast('คัดลอกลิงก์แชร์เรียบร้อยแล้ว!', 'success');
                }
            },

            // Helpers for formatting
            formatCurrency(num) {
                return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
            },
            // Safely convert Firebase items (Array or Object) to Array.
            // Ensure every item has an id (Firebase key or auto-generated for arrays).
            _getItemsList(items) {
                if (!items) return [];
                let list = [];
                if (Array.isArray(items)) {
                    list = items.map((val, index) => {
                        if (!val.id) val.id = 'item_auto_' + index;
                        return val;
                    });
                } else {
                    list = Object.entries(items).map(([key, val]) => ({ ...val, id: val.id || key }));
                }

                // Filter out dead/stale blob URLs that were mistakenly saved previously
                list.forEach(item => {
                    if (item.images && Array.isArray(item.images)) {
                        item.images = item.images.filter(img => {
                            if (typeof img !== 'string') return false;
                            if (img.startsWith('blob:') && (!this.activeUploads || !this.activeUploads.has(img))) {
                                return false; // Clean stale dead blob
                            }
                            return true;
                        });
                    }
                    if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('blob:') && (!this.activeUploads || !this.activeUploads.has(item.imageUrl))) {
                        item.imageUrl = '';
                    }
                });

                return list;
            },
            getSafeImageUrl(url) {
                if (!url || typeof url !== 'string') return '';
                if (url.startsWith('blob:') || url.startsWith('data:')) return url;

                // Extract Google Drive File ID from any Google Drive URL format
                let fileId = null;
                let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match) fileId = match[1];
                else {
                    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (match) fileId = match[1];
                }

                if (fileId) {
                    // Google's high-speed CDN (lh3.googleusercontent.com/d/{id}=w1000)
                    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
                }
                return url;
            },
            
            showToast(msg, type = 'success') {
                const toast = document.createElement('div');
                toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg font-semibold text-sm transition-all transform translate-y-full opacity-0 z-50 flex items-center gap-2 ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`;
                toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i> ${msg}`;
                document.body.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-y-full', 'opacity-0');
                }, 10);
                
                // Remove
                setTimeout(() => {
                    toast.classList.add('translate-y-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            },
            
            confirmActionCallback: null,

            openConfirmModal(title, message, onConfirm) {
                document.getElementById('confirm-modal-title').innerText = title;
                document.getElementById('confirm-modal-message').innerText = message;
                this.confirmActionCallback = onConfirm;
                
                const btn = document.getElementById('confirm-modal-btn');
                btn.onclick = () => {
                    if(this.confirmActionCallback) this.confirmActionCallback();
                    this.closeConfirmModal();
                };

                const modal = document.getElementById('confirm-modal');
                const content = document.getElementById('confirm-modal-content');
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            closeConfirmModal() {
                const modal = document.getElementById('confirm-modal');
                const content = document.getElementById('confirm-modal-content');
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    this.confirmActionCallback = null;
                }, 300);
            },
            
            showExcelLoader() {
                const overlay = document.getElementById('excel-loading-overlay');
                const content = document.getElementById('excel-loading-content');
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            hideExcelLoader() {
                const overlay = document.getElementById('excel-loading-overlay');
                const content = document.getElementById('excel-loading-content');
                overlay.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
                }, 300);
            },
            
            showGlobalLoader(title = 'กำลังประมวลผล...', subtitle = 'กรุณารอสักครู่', iconClass = 'fa-spinner', options = {}) {
                const overlay = document.getElementById('global-loading-overlay');
                const content = document.getElementById('global-loading-content');
                const progressWrap = document.getElementById('global-loading-progress-wrap');
                
                document.getElementById('global-loading-title').innerText = title;
                document.getElementById('global-loading-subtitle').innerText = subtitle;
                document.getElementById('global-loading-icon').className = `fa-solid ${iconClass} absolute inset-0 flex items-center justify-center text-brand-500 text-xl animate-pulse`;
                
                if (progressWrap) {
                    if (options && options.showProgress) {
                        progressWrap.classList.remove('hidden');
                        this.updateGlobalLoaderProgress(
                            options.percent || 0,
                            options.filename || '',
                            options.bytes || '',
                            options.step || 'กำลังเริ่มเชื่อมต่อ...'
                        );
                    } else {
                        progressWrap.classList.add('hidden');
                    }
                }

                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            updateGlobalLoaderProgress(percent, filename, bytes, step) {
                const bar = document.getElementById('global-loading-bar');
                const pctText = document.getElementById('global-loading-percent');
                const fileText = document.getElementById('global-loading-filename');
                const bytesText = document.getElementById('global-loading-bytes');
                const stepText = document.getElementById('global-loading-step');

                const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
                if (bar) bar.style.width = clamped + '%';
                if (pctText) pctText.innerText = clamped + '%';
                if (fileText && filename !== undefined && filename !== null) {
                    fileText.innerText = filename;
                    fileText.title = filename;
                }
                if (bytesText && bytes !== undefined && bytes !== null) {
                    bytesText.innerText = bytes;
                }
                if (stepText && step !== undefined && step !== null) {
                    stepText.innerText = step;
                }
            },

            hideGlobalLoader() {
                const overlay = document.getElementById('global-loading-overlay');
                const content = document.getElementById('global-loading-content');
                const progressWrap = document.getElementById('global-loading-progress-wrap');
                overlay.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
                    if (progressWrap) {
                        progressWrap.classList.add('hidden');
                        const bar = document.getElementById('global-loading-bar');
                        if (bar) bar.style.width = '0%';
                    }
                }, 300);
            },
            
            getStatusConfig(status) {
                switch(status) {
                    case 'Processing': return { label: 'กำลังดำเนินงาน', icon: 'fa-spinner', class: 'bg-blue-100 text-blue-700 border border-blue-200' };
                    case 'Quoting': return { label: 'สืบราคา', icon: 'fa-magnifying-glass-dollar', class: 'bg-purple-100 text-purple-700 border border-purple-200' };
                    case 'Ordering': return { label: 'กำลังสั่งของ', icon: 'fa-cart-shopping', class: 'bg-amber-100 text-amber-700 border border-amber-200' };
                    case 'Delivered': return { label: 'ส่งของแล้ว', icon: 'fa-check-circle', class: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
                    default: return { label: 'ไม่ทราบสถานะ', icon: 'fa-circle-question', class: 'bg-slate-100 text-slate-700' };
                }
            },

            // View Management
            init() {
                // If URL has projectId, open it directly if cached projects already available
                const urlParams = new URLSearchParams(window.location.search);
                const paramProjId = urlParams.get('projectId');
                const paramMode = urlParams.get('mode');
                if (paramMode === 'view') this.isReadOnly = true;
                else if (paramMode === 'edit') this.isReadOnly = false;

                if (paramProjId && this.projects.length > 0) {
                    const sharedProj = this.projects.find(p => p.id === paramProjId);
                    if (sharedProj) {
                        this.hasAutoOpenedSharedProject = true;
                        this.showProjectDetails(paramProjId);
                    } else {
                        this.showInstitutionsView();
                    }
                } else {
                    this.showInstitutionsView();
                }
                
                // Bind paste event for copying from Excel
                document.addEventListener('paste', this.handleGlobalPaste.bind(this));
                
                // Init table resizers & UI
                setTimeout(() => {
                    this.initResizers();
                    this.updateAutoMarkupUI();
                }, 100);
            },

            // --- COLUMN RESIZING ---
            currentResizer: null,
            targetTh: null,
            startX: 0,
            startWidth: 0,

            resetColumnWidths() {
                localStorage.removeItem('mentra_col_widths');
                this.initResizers();
            },

            initResizers() {
                const table = document.getElementById('excel-table');
                if (!table) return;

                // Make table fixed layout to respect exact column widths
                table.style.tableLayout = 'fixed';

                const ths = table.querySelectorAll('th');
                
                // Read from localStorage
                let savedWidths = {};
                try {
                    savedWidths = JSON.parse(localStorage.getItem('mentra_col_widths') || '{}');
                } catch(e){}

                // Standard default widths for a balanced look
                const defaultWidths = {
                    no: 50,
                    qty: 60,
                    unit: 60,
                    unitPrice: 80,
                    totalSell: 100,
                    targetPrice: 80,
                    foundPrice: 80,
                    profitPct: 70,
                    storeInfo: 100,
                    link: 100,
                    action: 60
                };

                // Initialize exact widths for all columns
                ths.forEach(th => {
                    const colId = th.getAttribute('data-col');
                    if (!colId) return;

                    if (colId === 'name') {
                        th.style.width = 'auto'; // Let it absorb remaining space
                    } else {
                        // Use saved width if valid, else use standard default width
                        if (savedWidths[colId] && savedWidths[colId] >= 20) {
                            th.style.width = savedWidths[colId] + 'px';
                        } else if (defaultWidths[colId]) {
                            th.style.width = defaultWidths[colId] + 'px';
                        } else {
                            th.style.width = '80px';
                        }
                    }

                    // Remove tailwind width classes to prevent conflicts
                    th.className = th.className.replace(/w-\w+/g, '').replace(/min-w-\[.*?\]/g, '').trim();
                    const resizer = th.querySelector('.col-resizer');
                    if (!resizer) return;

                    resizer.addEventListener('mousedown', (e) => {
                        this.currentResizer = resizer;
                        this.targetTh = th;
                        this.startX = e.pageX;
                        this.startWidth = th.offsetWidth;
                        resizer.classList.add('resizing');
                        document.body.style.cursor = 'col-resize';
                        e.preventDefault();
                    });
                });

                document.addEventListener('mousemove', (e) => {
                    if (!this.currentResizer || !this.targetTh) return;
                    const diff = e.pageX - this.startX;
                    let newWidth = this.startWidth + diff;
                    if (newWidth < 20) newWidth = 20; // Min width reduced to 20px
                    this.targetTh.style.width = newWidth + 'px';
                });

                document.addEventListener('mouseup', (e) => {
                    if (this.currentResizer && this.targetTh) {
                        this.currentResizer.classList.remove('resizing');
                        document.body.style.cursor = 'default';
                        
                        const colId = this.targetTh.getAttribute('data-col');
                        if (colId && colId !== 'name') {
                            let saved = {};
                            try {
                                saved = JSON.parse(localStorage.getItem('mentra_col_widths') || '{}');
                            } catch(e){}
                            saved[colId] = this.targetTh.offsetWidth;
                            localStorage.setItem('mentra_col_widths', JSON.stringify(saved));
                        }
                        
                        this.currentResizer = null;
                        this.targetTh = null;
                    }
                });
            },

            syncCurrentProject() {
                if (!this.currentProjectId) return;
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                try {
                    localStorage.setItem('material_projects', JSON.stringify(this.projects));
                } catch(e) {}
                if (proj && window.saveProjectToFirestore) {
                    window.saveProjectToFirestore(proj).catch(e => console.error('Error syncing:', e));
                }
            },

            showInstitutionsView() {
                this.currentProjectId = null;
                this.currentInstitution = null;
                
                document.getElementById('view-institutions').classList.remove('hidden');
                document.getElementById('view-projects').classList.add('hidden');
                document.getElementById('view-project-details').classList.add('hidden');
                
                this.renderInstitutions();
            },

            addInstitution() {
                const modal = document.getElementById('add-inst-modal');
                const content = document.getElementById('add-inst-modal-content');
                document.getElementById('modal-inst-name').value = '';
                if (document.getElementById('modal-inst-taxid')) document.getElementById('modal-inst-taxid').value = '';
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    document.getElementById('modal-inst-name').focus();
                }, 10);
            },

            closeAddInstitutionModal() {
                const modal = document.getElementById('add-inst-modal');
                const content = document.getElementById('add-inst-modal-content');
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 300);
            },

            saveNewInstitution() {
                const nameInput = document.getElementById('modal-inst-name');
                const name = nameInput.value.trim();
                if (!name) {
                    nameInput.focus();
                    return;
                }
                
                const taxId = document.getElementById('modal-inst-taxid')?.value.trim() || '';
                const isVisible = document.getElementById('modal-add-inst-visible')?.value !== 'false';
                const adminOnlyVal = document.getElementById('modal-add-inst-adminonly')?.value || 'false';

                if (!this.institutionDetails) this.institutionDetails = {};
                if (!this.institutionDetails[name]) {
                    this.institutionDetails[name] = {};
                }
                this.institutionDetails[name].taxId = taxId;
                this.institutionDetails[name].visible = isVisible;
                this.institutionDetails[name].adminOnly = adminOnlyVal === 'private' ? 'private' : (adminOnlyVal === 'true');
                if (this.currentUserId) {
                    this.institutionDetails[name].createdBy = this.currentUserId;
                }

                if (window.saveInstitutionDetailsToFirestore) {
                    window.saveInstitutionDetailsToFirestore(this.institutionDetails);
                }

                if (this.institutionLogos[name] === undefined) {
                    this.institutionLogos[name] = '';
                    if (window.saveInstitutionLogoToFirestore) {
                        window.saveInstitutionLogoToFirestore(name, '');
                    }
                }

                this.renderInstitutions();
                this.closeAddInstitutionModal();
            },

            deleteInstitution(name) {
                this.openConfirmModal('ยืนยันการลบสถานศึกษา', `คุณแน่ใจหรือไม่ว่าต้องการลบสถานศึกษา "${name}"? โครงการทั้งหมดภายใต้สถานศึกษานี้จะถูกลบไปด้วย`, async () => {
                    delete this.institutionLogos[name];
                    const projectsToDelete = this.projects.filter(p => p.institution === name);
                    if (window.deleteProjectFromFirestore) {
                        for(let p of projectsToDelete) {
                            await window.deleteProjectFromFirestore(p.id);
                        }
                    }
                    if (window.deleteInstitutionFromFirestore) {
                        await window.deleteInstitutionFromFirestore(name);
                    }
                    this.projects = this.projects.filter(p => p.institution !== name);
                    this.renderInstitutions();
                });
            },

            // Shop Modal Management
            editingShopOriginalName: null,
            modalShopLogoBase64: null,
            
            openManageShopsModal() {
                const modal = document.getElementById('manage-shops-modal');
                const content = document.getElementById('manage-shops-modal-content');
                this.renderManageShopsList();
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },
            
            closeManageShopsModal() {
                const modal = document.getElementById('manage-shops-modal');
                const content = document.getElementById('manage-shops-modal-content');
                
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 300);
            },
            
            renderManageShopsList() {
                const list = document.getElementById('manage-shops-list');
                const countSpan = document.getElementById('manage-shops-count');
                if (!list) return;
                
                const shops = this.registeredShops || [];
                countSpan.innerText = `(ทั้งหมด ${shops.length} รายการ)`;
                
                if (shops.length === 0) {
                    list.innerHTML = `
                        <div class="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                            <i class="fa-solid fa-store-slash text-4xl text-slate-300 mb-3"></i>
                            <p>ยังไม่มีข้อมูลร้านค้าในระบบ</p>
                            <p class="text-sm mt-1">กดปุ่ม "เพิ่มร้านค้า" เพื่อเพิ่มข้อมูล</p>
                        </div>`;
                    return;
                }
                
                list.innerHTML = '';
                shops.forEach(shopData => {
                    const sName = typeof shopData === 'string' ? shopData : shopData.name;
                    const address = typeof shopData === 'string' ? '' : (shopData.address || '');
                    const taxId = typeof shopData === 'string' ? '' : (shopData.taxId || '');
                    const phone = typeof shopData === 'string' ? '' : (shopData.phone || '');
                    const logo = typeof shopData === 'string' ? null : shopData.logo;
                    const themeColor = typeof shopData === 'string' ? '#1A6FBF' : (shopData.themeColor || '#1A6FBF');
                    
                    let logoHtml = `<div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200"><i class="fa-solid fa-shop text-lg"></i></div>`;
                    if (logo) {
                        logoHtml = `<img src="${logo}" class="h-12 max-w-[6rem] w-auto rounded-xl object-contain bg-white border border-slate-200 shrink-0">`;
                    }
                    
                    const item = document.createElement('div');
                    item.className = 'p-4 sm:p-5 hover:bg-white transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group';
                    
                    const escapedName = sName.replace(/'/g, "\\'").replace(/"/g, '\\"');
                    
                    item.innerHTML = `
                        <div class="flex items-start gap-4 flex-1 overflow-hidden">
                            ${logoHtml}
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-200/50 shadow-sm" style="background-color: ${themeColor}" title="สีธีมเอกสาร"></div>
                                    <h4 class="font-bold text-slate-800 truncate text-base">${sName}</h4>
                                </div>
                                <div class="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                    ${taxId ? `<span class="flex items-center gap-1.5"><i class="fa-solid fa-id-card text-slate-400"></i> ${taxId}</span>` : ''}
                                    ${phone ? `<span class="flex items-center gap-1.5"><i class="fa-solid fa-phone text-slate-400"></i> ${phone}</span>` : ''}
                                </div>
                                ${address ? `<p class="text-sm text-slate-500 mt-1.5 truncate"><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i>${address}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0 border-t border-slate-100 sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                            <button onclick="appData.editShop('${escapedName}')" class="px-4 py-2 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                            </button>
                            <button onclick="appData.deleteShop('${escapedName}')" class="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="ลบร้านค้า">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
            },
            
            editShop(shopName) {
                const shopData = this.getShopData(shopName);
                if (!shopData) return;
                
                this.editingShopOriginalName = shopName;
                this.openAddShopModal(shopData);
            },
            
            deleteShop(shopName) {
                Swal.fire({
                    title: 'ยืนยันการลบร้านค้า',
                    html: `คุณต้องการลบร้านค้า <b>${shopName}</b> ใช่หรือไม่?<br><span class="text-sm text-red-500">โครงการที่เคยเลือกร้านนี้จะยังคงแสดงชื่อร้านอยู่ แต่ไม่สามารถดูรูปหรือรายละเอียดได้</span>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#94a3b8',
                    confirmButtonText: 'ลบทิ้ง',
                    cancelButtonText: 'ยกเลิก',
                    customClass: {
                        popup: 'rounded-2xl',
                        confirmButton: 'rounded-xl font-semibold px-6 py-2.5',
                        cancelButton: 'rounded-xl font-semibold px-6 py-2.5'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.registeredShops = this.registeredShops.filter(s => (typeof s === 'string' ? s : s.name) !== shopName);
                        if (window.saveShopToFirestore) {
                            window.saveShopToFirestore(this.registeredShops);
                        }
                        this.renderManageShopsList();
                        Swal.fire({
                            icon: 'success',
                            title: 'ลบเรียบร้อย',
                            showConfirmButton: false,
                            timer: 1500,
                            customClass: { popup: 'rounded-2xl' }
                        });
                    }
                });
            },
            
            previewShopLogo(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (event) => {
                    let base64 = event.target.result;
                    if (window.recompressImage) {
                        base64 = await window.recompressImage(base64, 400, 0.7);
                    }
                    this.modalShopLogoBase64 = base64;
                    const preview = document.getElementById('modal-shop-logo-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${base64}" class="w-full h-full object-contain">`;
                        preview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            },
            
            openAddShopModal(shopToEdit = null) {
                const modal = document.getElementById('add-shop-modal');
                const content = document.getElementById('add-shop-modal-content');
                const preview = document.getElementById('modal-shop-logo-preview');
                
                if (shopToEdit && typeof shopToEdit === 'object') {
                    document.getElementById('modal-shop-name').value = shopToEdit.name || '';
                    document.getElementById('modal-shop-address').value = shopToEdit.address || '';
                    document.getElementById('modal-shop-taxid').value = shopToEdit.taxId || '';
                    document.getElementById('modal-shop-phone').value = shopToEdit.phone || '';
                    document.getElementById('modal-shop-signer').value = shopToEdit.signer || '';
                    document.getElementById('modal-shop-logo-upload').value = '';
                    
                    if (shopToEdit.logo) {
                        this.modalShopLogoBase64 = shopToEdit.logo;
                        preview.innerHTML = `<img src="${shopToEdit.logo}" class="w-full h-full object-contain">`;
                        preview.classList.remove('hidden');
                    } else {
                        this.modalShopLogoBase64 = null;
                        preview.innerHTML = '';
                        preview.classList.add('hidden');
                    }
                    document.getElementById('modal-shop-theme').value = shopToEdit.themeColor || '#1A6FBF';
                } else {
                    this.editingShopOriginalName = null;
                    document.getElementById('modal-shop-name').value = '';
                    document.getElementById('modal-shop-address').value = '';
                    document.getElementById('modal-shop-taxid').value = '';
                    document.getElementById('modal-shop-phone').value = '';
                    document.getElementById('modal-shop-signer').value = '';
                    document.getElementById('modal-shop-logo-upload').value = '';
                    document.getElementById('modal-shop-theme').value = '#1A6FBF';
                    
                    this.modalShopLogoBase64 = null;
                    if (preview) {
                        preview.innerHTML = '';
                        preview.classList.add('hidden');
                    }
                }
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                    document.getElementById('modal-shop-name').focus();
                }, 10);
            },
            
            closeAddShopModal() {
                const modal = document.getElementById('add-shop-modal');
                const content = document.getElementById('add-shop-modal-content');
                
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 300);
            },
            
            saveNewShop() {
                const nameInput = document.getElementById('modal-shop-name');
                const name = nameInput.value.trim();
                const address = document.getElementById('modal-shop-address').value.trim();
                const taxId = document.getElementById('modal-shop-taxid').value.trim();
                const phone = document.getElementById('modal-shop-phone').value.trim();
                const signer = document.getElementById('modal-shop-signer').value.trim();
                const themeColor = document.getElementById('modal-shop-theme').value;
                
                if (!name) {
                    nameInput.focus();
                    return;
                }
                
                const shopData = {
                    name: name,
                    address: address,
                    taxId: taxId,
                    phone: phone,
                    signer: signer,
                    themeColor: themeColor,
                    logo: this.modalShopLogoBase64 || null
                };
                
                if (this.editingShopOriginalName) {
                    const existingIndex = this.registeredShops.findIndex(s => (typeof s === 'string' ? s : s.name) === this.editingShopOriginalName);
                    if (existingIndex >= 0) {
                        this.registeredShops[existingIndex] = shopData;
                    }
                } else {
                    const existingIndex = this.registeredShops.findIndex(s => (typeof s === 'string' ? s : s.name) === name);
                    if (existingIndex >= 0) {
                        this.registeredShops[existingIndex] = shopData;
                    } else {
                        this.registeredShops.push(shopData);
                    }
                }
                
                this.editingShopOriginalName = null;
                
                if (window.saveShopToFirestore) {
                    window.saveShopToFirestore(this.registeredShops);
                }
                
                this.closeAddShopModal();
                this.renderManageShopsList();
                
                this.selectedShopsForForm = [name];
                this.updateShopDisplay();
                this.populateShopDropdown();
                this.hideShopDropdown();
            },

            openInstDetailsModal(e, instName) {
                e.stopPropagation();
                if (instName === 'ไม่ระบุสถานศึกษา') return;
                
                const details = this.institutionDetails && this.institutionDetails[instName] ? this.institutionDetails[instName] : {};
                
                document.getElementById('modal-inst-details-old-name').value = instName;
                document.getElementById('modal-inst-details-name').value = instName;
                if (document.getElementById('modal-inst-details-taxid')) {
                    document.getElementById('modal-inst-details-taxid').value = details.taxId || '';
                }
                document.getElementById('modal-inst-details-address').value = details.address || '';
                document.getElementById('modal-inst-details-contact').value = details.contact || '';
                document.getElementById('modal-inst-details-phone').value = details.phone || '';
                document.getElementById('modal-inst-details-email').value = details.email || '';
                
                if (document.getElementById('modal-inst-details-visible')) {
                    document.getElementById('modal-inst-details-visible').value = details.visible !== false ? 'true' : 'false';
                }
                if (document.getElementById('modal-inst-details-adminonly')) {
                    if (details.adminOnly === 'private') {
                        document.getElementById('modal-inst-details-adminonly').value = 'private';
                    } else if (details.adminOnly === true) {
                        document.getElementById('modal-inst-details-adminonly').value = 'true';
                    } else {
                        document.getElementById('modal-inst-details-adminonly').value = 'false';
                    }
                }
                
                const modal = document.getElementById('inst-details-modal');
                const content = document.getElementById('inst-details-modal-content');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },
            
            closeInstDetailsModal() {
                const modal = document.getElementById('inst-details-modal');
                const content = document.getElementById('inst-details-modal-content');
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 300);
            },
            
            async saveInstDetails() {
                const oldName = document.getElementById('modal-inst-details-old-name').value;
                const newName = document.getElementById('modal-inst-details-name').value.trim();
                const taxId = document.getElementById('modal-inst-details-taxid')?.value.trim() || '';
                const address = document.getElementById('modal-inst-details-address').value.trim();
                const contact = document.getElementById('modal-inst-details-contact').value.trim();
                const phone = document.getElementById('modal-inst-details-phone').value.trim();
                const email = document.getElementById('modal-inst-details-email').value.trim();
                const isVisible = document.getElementById('modal-inst-details-visible')?.value !== 'false';
                const adminOnlyVal = document.getElementById('modal-inst-details-adminonly')?.value || 'false';
                const adminOnly = adminOnlyVal === 'private' ? 'private' : (adminOnlyVal === 'true');

                if (!newName) {
                    Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อสถานศึกษา', timer: 2000 });
                    return;
                }
                
                if (!this.institutionDetails) this.institutionDetails = {};
                const oldDetails = this.institutionDetails[oldName] || {};
                const createdBy = oldDetails.createdBy || this.currentUserId || null;
                
                const newDetails = { address, contact, phone, email, taxId, visible: isVisible, adminOnly: adminOnly, createdBy: createdBy };
                
                if (oldName !== newName) {
                    // Rename logic
                    this.institutionDetails[newName] = newDetails;
                    delete this.institutionDetails[oldName];
                    
                    if (this.institutionLogos[oldName]) {
                        this.institutionLogos[newName] = this.institutionLogos[oldName];
                        delete this.institutionLogos[oldName];
                        if (window.saveInstitutionLogoToFirestore) {
                            window.saveInstitutionLogoToFirestore(newName, this.institutionLogos[newName]);
                            window.saveInstitutionLogoToFirestore(oldName, null); // remove old
                        }
                    }
                    
                    // Update all projects
                    this.projects.forEach(p => {
                        if (p.institution === oldName) {
                            p.institution = newName;
                            p.taxId = taxId;
                            if (window.saveProjectToFirestore) {
                                window.saveProjectToFirestore(p);
                            }
                        }
                    });
                } else {
                    this.institutionDetails[oldName] = newDetails;
                    // Also propagate taxId to projects under this institution
                    this.projects.forEach(p => {
                        if (p.institution === oldName) {
                            p.taxId = taxId;
                            if (window.saveProjectToFirestore) {
                                window.saveProjectToFirestore(p);
                            }
                        }
                    });
                }
                
                if (window.saveInstitutionDetailsToFirestore) {
                    await window.saveInstitutionDetailsToFirestore(this.institutionDetails);
                }
                
                this.closeInstDetailsModal();
                this.renderInstitutions();
                if (this.currentProjectId) {
                    const curP = this.projects.find(p => p.id === this.currentProjectId);
                    if (curP) this.updateProjectDetailsUI(curP);
                }
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    text: 'บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                });
            },

            editInstitutionLogo(e, instName) {
                e.stopPropagation();
                if (instName === 'ไม่ระบุสถานศึกษา') return;
                
                this.uploadingLogoFor = instName;
                this.selectedLogoBase64 = null;
                
                document.getElementById('upload-logo-inst-name').innerText = instName;
                document.getElementById('logo-upload-input').value = '';
                document.getElementById('logo-preview-container').classList.add('hidden');
                document.getElementById('logo-upload-placeholder').classList.remove('hidden');
                
                const btnSave = document.getElementById('btn-save-logo');
                btnSave.disabled = true;
                btnSave.classList.add('opacity-50', 'cursor-not-allowed');
                btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> อัปโหลดและบันทึก';
                
                const modal = document.getElementById('upload-logo-modal');
                const content = document.getElementById('upload-logo-modal-content');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            closeUploadLogoModal() {
                const modal = document.getElementById('upload-logo-modal');
                const content = document.getElementById('upload-logo-modal-content');
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    this.uploadingLogoFor = null;
                    this.selectedLogoBase64 = null;
                }, 300);
            },

            handleLogoFileSelect(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        // Compress image using canvas
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 250;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                        appData.selectedLogoBase64 = compressedBase64;
                        
                        document.getElementById('logo-preview-img').src = compressedBase64;
                        document.getElementById('logo-preview-container').classList.remove('hidden');
                        document.getElementById('logo-upload-placeholder').classList.add('hidden');
                        
                        const btnSave = document.getElementById('btn-save-logo');
                        btnSave.disabled = false;
                        btnSave.classList.remove('opacity-50', 'cursor-not-allowed');
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            },

            async saveUploadedLogo() {
                if (!this.selectedLogoBase64 || !this.uploadingLogoFor) return;
                
                const btnSave = document.getElementById('btn-save-logo');
                btnSave.disabled = true;
                btnSave.classList.add('opacity-50', 'cursor-not-allowed');
                btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...';
                
                try {
                    this.institutionLogos[this.uploadingLogoFor] = this.selectedLogoBase64;
                    this.renderInstitutions();
                    if (window.saveInstitutionLogoToFirestore) {
                        await window.saveInstitutionLogoToFirestore(this.uploadingLogoFor, this.selectedLogoBase64);
                    }
                    this.closeUploadLogoModal();
                } catch (e) {
                    btnSave.disabled = false;
                    btnSave.classList.remove('opacity-50', 'cursor-not-allowed');
                    btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> อัปโหลดและบันทึก';
                    alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + e.message);
                }
            },

            showProjectsView(instName) {
                if (instName !== undefined && instName !== null && instName !== '') {
                    this.currentInstitution = instName;
                }
                if (!this.currentInstitution) {
                    this.currentInstitution = 'ไม่ระบุสถานศึกษา';
                }
                
                this.currentProjectId = null;
                document.getElementById('view-institutions').classList.add('hidden');
                document.getElementById('view-projects').classList.remove('hidden');
                document.getElementById('view-project-details').classList.add('hidden');
                
                // Update subtitle to show selected institution
                document.getElementById('projects-view-subtitle').innerText = this.currentInstitution;
                
                this.renderProjects();
            },

            showProjectDetails(projectId) {
                this.currentProjectId = projectId;
                const proj = this.projects.find(p => p.id === projectId);
                if (proj) {
                    this.currentInstitution = (proj.institution && proj.institution.trim()) ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                }

                document.getElementById('view-institutions').classList.add('hidden');
                document.getElementById('view-projects').classList.add('hidden');
                document.getElementById('view-project-details').classList.remove('hidden');

                if (!proj) return;

                // Handle Read-Only UI controls
                const sidebar = document.getElementById('sidebar');
                const banner = document.getElementById('read-only-banner');
                const btnEdit = document.getElementById('btn-edit-project');
                const btnDelete = document.getElementById('btn-delete-project');
                const statusContainer = document.getElementById('project-status-container');
                const btnClear = document.getElementById('btn-clear-table');
                const btnImport = document.getElementById('btn-import-excel');
                const btnAddHeader = document.getElementById('btn-add-header');
                const btnAddItem = document.getElementById('btn-add-item');

                if (this.isReadOnly) {
                    document.body.classList.add('no-sidebar');
                    if (sidebar) sidebar.style.display = 'none';
                    if (banner) banner.classList.remove('hidden');
                    if (btnEdit) btnEdit.classList.add('hidden');
                    if (btnDelete) btnDelete.classList.add('hidden');
                    if (statusContainer) statusContainer.classList.add('hidden');
                    if (btnClear) btnClear.classList.add('hidden');
                    if (btnImport) btnImport.classList.add('hidden');
                    if (btnAddHeader) btnAddHeader.classList.add('hidden');
                    if (btnAddItem) btnAddItem.classList.add('hidden');
                } else {
                    document.body.classList.remove('no-sidebar');
                    if (sidebar) sidebar.style.display = '';
                    if (banner) banner.classList.add('hidden');
                    if (btnEdit) btnEdit.classList.remove('hidden');
                    if (btnDelete) btnDelete.classList.remove('hidden');
                    if (statusContainer) statusContainer.classList.remove('hidden');
                    if (btnClear) btnClear.classList.remove('hidden');
                    if (btnImport) btnImport.classList.remove('hidden');
                    if (btnAddHeader) btnAddHeader.classList.remove('hidden');
                    if (btnAddItem) btnAddItem.classList.remove('hidden');
                }

                this.updateProjectDetailsUI(proj);
                this.renderExcelTable();
                this.updateAutoMarkupUI();
                this.renderDocuments();
                this.updateWorkflowUI(proj);
                this.switchDetailTab('table'); // Reset to table view
            },

            updateProjectDetailsUI(proj) {
                document.getElementById('detail-project-name').innerText = proj.name || 'ไม่มีชื่อโครงการ';
                document.getElementById('detail-project-code').innerText = `รหัสงาน: ${proj.code || '-'}`;
                document.getElementById('detail-project-status').value = proj.status || 'Processing';
                
                let displayDate = '-';
                if (proj.date) {
                    const d = new Date(proj.date);
                    if (!isNaN(d.getTime())) {
                        displayDate = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                }
                
                document.getElementById('detail-project-date').innerText = displayDate;
                document.getElementById('detail-project-dept').innerText = proj.department || 'ไม่ระบุแผนก';
                document.getElementById('detail-project-inst').innerText = proj.institution || 'ไม่ระบุสถานศึกษา';
                
                const taxIdContainer = document.getElementById('detail-project-taxid-container');
                if (taxIdContainer) {
                    const instTax = (proj.taxId || (this.institutionDetails && proj.institution && this.institutionDetails[proj.institution]?.taxId) || '').trim();
                    if (instTax) {
                        document.getElementById('detail-project-taxid').innerText = `TAX: ${instTax}`;
                        taxIdContainer.style.display = 'flex';
                    } else {
                        taxIdContainer.style.display = 'none';
                    }
                }
                
                const companyContainer = document.getElementById('detail-project-company-container');
                if (companyContainer) {
                    const dispCompany = this.getCompanyDisplayString(proj.company, proj.institution);
                    if (dispCompany) {
                        document.getElementById('detail-project-company').innerText = dispCompany;
                        companyContainer.style.display = 'flex';
                    } else {
                        companyContainer.style.display = 'none';
                    }
                }
                
                if (document.getElementById('detail-project-teacher')) {
                    document.getElementById('detail-project-teacher').innerText = proj.teacher || 'ไม่ระบุครูผู้สอน';
                }
                
                const remarksContainer = document.getElementById('detail-project-remarks-container');
                if (proj.remarks) {
                    document.getElementById('detail-project-remarks').innerText = proj.remarks;
                    remarksContainer.classList.remove('hidden');
                } else {
                    remarksContainer.classList.add('hidden');
                }
            },
            // Tab Management
            currentDetailTab: 'table',
            switchDetailTab(tab) {
                this.currentDetailTab = tab;
                const tableBtn = document.getElementById('tab-btn-table');
                const galleryBtn = document.getElementById('tab-btn-gallery');
                const docBtn = document.getElementById('tab-btn-documents');
                const activityBtn = document.getElementById('tab-btn-activity');
                const tableCard = document.getElementById('detail-view-table');
                const galleryCard = document.getElementById('detail-view-gallery');
                const docCard = document.getElementById('detail-view-documents');
                const activityCard = document.getElementById('detail-view-activity');
                
                // Reset active styles
                [tableBtn, galleryBtn, docBtn, activityBtn].forEach(btn => {
                    if (btn) btn.className = "px-5 py-3 border-b-2 font-medium transition-colors border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg whitespace-nowrap";
                });
                [tableCard, galleryCard, docCard, activityCard].forEach(card => {
                    if (card) card.classList.add('hidden');
                });
                
                if (tab === 'table') {
                    if (tableBtn) tableBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-lg whitespace-nowrap";
                    if (tableCard) tableCard.classList.remove('hidden');
                } else if (tab === 'gallery') {
                    if (galleryBtn) galleryBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-lg whitespace-nowrap";
                    if (galleryCard) galleryCard.classList.remove('hidden');
                    this.renderGallery();
                } else if (tab === 'documents') {
                    if (docBtn) docBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-lg whitespace-nowrap";
                    if (docCard) docCard.classList.remove('hidden');
                    this.renderDocuments();
                } else if (tab === 'activity') {
                    if (activityBtn) activityBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-indigo-500 text-indigo-600 bg-indigo-50/50 rounded-t-lg whitespace-nowrap";
                    if (activityCard) activityCard.classList.remove('hidden');
                    this.renderActivityLog();
                }
            },
            
            // Gallery Rendering
            renderGallery() {
                const grid = document.getElementById('gallery-grid');
                const badge = document.getElementById('gallery-count-badge');
                if (!grid) return;
                
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                // Safely convert items (Firebase may return Array or Object)
                const itemsList = this._getItemsList(proj ? proj.items : null);
                
                if (badge) {
                    badge.innerText = `${itemsList ? itemsList.length : 0} รายการ`;
                }

                if (!proj || itemsList.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <i class="fa-regular fa-image fa-2x mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">ยังไม่มีรายการวัสดุในโครงการนี้</p>
                            <p class="text-sm mt-1">กรุณาเพิ่มรายการสินค้าที่แท็บ "รายการวัสดุ"</p>
                        </div>
                    `;
                    return;
                }
                
                grid.innerHTML = '';
                itemsList.forEach((item, index) => {
                    // Data Migration for single imageUrl to images array
                    if (!item.images) {
                        item.images = [];
                        if (item.imageUrl && item.imageUrl.trim() !== '') {
                            item.images.push(item.imageUrl);
                        }
                    }

                    const card = document.createElement('div');
                    card.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch";
                    
                    const leftPanel = `
                        <div class="p-5 md:w-1/3 xl:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
                            <h4 class="font-bold text-slate-800 leading-tight mb-4" title="${item.name}">${index + 1}. ${item.name}</h4>
                            <div class="mt-auto space-y-3">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-slate-500 font-medium">จำนวน:</span>
                                    <span class="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">${item.qty || 0} <span class="text-xs font-normal text-slate-500">${item.unit || ''}</span></span>
                                </div>
                                ${item.link ? `<a href="${item.link}" target="_blank" class="w-full py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border border-brand-100" title="ไปที่ลิงก์สินค้า"><i class="fa-solid fa-cart-shopping"></i> เปิดลิงก์สินค้า</a>` : `<div class="text-center text-xs text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg">ไม่มีลิงก์สินค้า</div>`}
                            </div>
                        </div>
                    `;

                    // Safely convert images to array (Firebase may return Object instead of Array)
                    const imagesList = Array.isArray(item.images) ? item.images : Object.values(item.images);
                    let imagesHtml = '';
                    imagesList.forEach((img, imgIndex) => {
                        const isUploading = typeof img === 'string' && img.startsWith('blob:') && this.activeUploads && this.activeUploads.has(img);
                        
                        let driveId = null;
                        if (!isUploading && typeof img === 'string') {
                            let match = img.match(/\/d\/([a-zA-Z0-9_-]+)/) || img.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                            if (match) driveId = match[1];
                        }
                        const fallbackHandler = driveId 
                            ? `if(!this.dataset.fallback){this.dataset.fallback='1';this.src='https://drive.google.com/thumbnail?id=${driveId}&sz=w1000';}else{this.src='https://placehold.co/150x150/f8fafc/cbd5e1?text=No+Image';this.onerror=null;}`
                            : `this.src='https://placehold.co/150x150/f8fafc/cbd5e1?text=No+Image'; this.onerror=null;`;

                        imagesHtml += `
                            <div class="h-32 min-w-[8rem] max-w-sm shrink-0 relative bg-slate-100 flex items-center justify-center rounded-xl overflow-hidden group cursor-pointer border border-slate-200 shadow-sm hover:border-brand-300 transition-colors" ${isUploading ? '' : `onclick="appData.openLightbox('${item.id}', ${imgIndex})"`}>
                                <img src="${isUploading ? img : appData.getSafeImageUrl(img)}" alt="Image" loading="lazy" referrerpolicy="no-referrer" class="h-full w-auto max-w-full object-contain ${isUploading ? 'opacity-50 blur-sm scale-105' : ''}" onerror="${fallbackHandler}">
                                ${isUploading ? `
                                <div class="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[2px]">
                                    <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-sm"></div>
                                    <span class="text-[10px] font-bold text-brand-700 mt-2 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">กำลังอัปโหลด</span>
                                </div>
                                ` : `
                                <div class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div class="bg-white/90 backdrop-blur-sm text-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                                        <i class="fa-solid fa-expand text-xs"></i>
                                    </div>
                                </div>
                                `}
                            </div>
                        `;
                    });

                    const rightPanel = `
                        <div class="p-5 flex-1 overflow-hidden flex flex-col justify-center">
                            <div class="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
                                ${imagesHtml}
                                <button onclick="appData.quickAddImageFromClipboard('${item.id}')" class="w-32 h-32 shrink-0 bg-slate-50 border-2 border-dashed border-brand-200 hover:border-brand-400 hover:bg-brand-50/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                                    <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                                        <i class="fa-solid fa-plus"></i>
                                    </div>
                                    <span class="text-xs font-semibold text-brand-600">เพิ่มรูปภาพ</span>
                                    <span class="text-[10px] text-slate-400">Ctrl+V ได้เลย</span>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    card.innerHTML = leftPanel + rightPanel;
                    grid.appendChild(card);
                });
            },

            // Gallery PDF Export
            exportGalleryPDF() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) {
                    this.showToast('กรุณาเลือกโครงการก่อนดำเนินการ', 'error');
                    return;
                }
                const itemsList = this._getItemsList(proj.items);
                if (itemsList.length === 0) {
                    Swal.fire({
                        title: 'ไม่มีรายการวัสดุ',
                        text: 'ไม่พบรายการสินค้าในโครงการนี้ กรุณาเพิ่มรายการสินค้าก่อนส่งออก PDF',
                        icon: 'warning',
                        confirmButtonColor: '#1A6FBF'
                    });
                    return;
                }

                const modal = document.getElementById('gallery-pdf-modal');
                const content = document.getElementById('gallery-pdf-modal-content');
                if (!modal || !content) return;

                this.refreshGalleryPDFPreview();

                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },

            closeGalleryPDFModal() {
                const modal = document.getElementById('gallery-pdf-modal');
                const content = document.getElementById('gallery-pdf-modal-content');
                if (!modal || !content) return;
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 280);
            },

            refreshGalleryPDFPreview() {
                const container = document.getElementById('gallery-pdf-preview-container');
                if (!container) return;

                const showPrice = document.getElementById('pdf-opt-show-price')?.checked || false;
                const showStore = document.getElementById('pdf-opt-show-store')?.checked || false;
                const cols = parseInt(document.getElementById('pdf-opt-cols')?.value || '3', 10);

                container.innerHTML = this.buildGalleryPDFContent({ showPrice, showStore, cols, isPrint: false });
            },

            buildGalleryPDFContent({ showPrice = false, showStore = true, cols = 3, isPrint = false } = {}) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return '<div class="p-6 text-center text-slate-400">ไม่พบข้อมูลโครงการ</div>';

                const itemsList = this._getItemsList(proj.items);
                let displayDate = '-';
                if (proj.date) {
                    const d = new Date(proj.date);
                    if (!isNaN(d.getTime())) {
                        displayDate = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                }

                const dispCompany = this.getCompanyDisplayString ? this.getCompanyDisplayString(proj.company, proj.institution) : ((proj.company && proj.company !== proj.institution) ? proj.company : '-');
                const instLogo = (this.institutionLogos && proj.institution && this.institutionLogos[proj.institution]) ? this.institutionLogos[proj.institution] : '';
                const totalQty = itemsList.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
                const printTimestamp = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                let colStyle = 'grid-template-columns: repeat(3, minmax(0, 1fr));';
                if (cols === 2) {
                    colStyle = 'grid-template-columns: repeat(2, minmax(0, 1fr));';
                } else if (cols === 4) {
                    colStyle = 'grid-template-columns: repeat(4, minmax(0, 1fr));';
                }

                let itemsHtml = '';
                itemsList.forEach((item, index) => {
                    const imagesList = Array.isArray(item.images) ? item.images : (item.images ? Object.values(item.images) : []);
                    if (imagesList.length === 0 && item.imageUrl && item.imageUrl.trim() !== '') {
                        imagesList.push(item.imageUrl);
                    }

                    let imagesGridHtml = '';
                    if (imagesList.length > 0) {
                        let imgCards = '';
                        imagesList.forEach((img, imgIdx) => {
                            const safeUrl = this.getSafeImageUrl(img);
                            const imgHeight = cols === 2 ? '170px' : (cols === 4 ? '110px' : '135px');
                            imgCards += `
                                <div style="height: ${imgHeight}; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 4px; box-sizing: border-box;">
                                    <img src="${safeUrl}" alt="${item.name || 'สินค้า'} - ${imgIdx + 1}" referrerpolicy="no-referrer" style="max-height: 100%; max-width: 100%; object-fit: contain; display: block;" onerror="this.src='https://placehold.co/150x150/f8fafc/cbd5e1?text=No+Image';">
                                </div>
                            `;
                        });
                        imagesGridHtml = `
                            <div style="display: grid; ${colStyle} gap: 10px; margin-top: 10px; width: 100%; box-sizing: border-box;">
                                ${imgCards}
                            </div>
                        `;
                    } else {
                        imagesGridHtml = `
                            <div style="margin-top: 8px; padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #94a3b8; font-size: 12px;">
                                <i class="fa-regular fa-image" style="margin-right: 4px;"></i> ไม่มีรูปภาพแนบสำหรับรายการนี้
                            </div>
                        `;
                    }

                    let priceBadge = '';
                    if (showPrice && (item.unitPrice || item.totalSell)) {
                        const uPrice = parseFloat(item.unitPrice) || 0;
                        const tPrice = parseFloat(item.totalSell) || (uPrice * (parseFloat(item.qty) || 0));
                        priceBadge = `
                            <span style="display: inline-flex; align-items: center; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">
                                ฿${uPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / หน่วย (รวม ฿${tPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                        `;
                    }

                    let storeBadge = '';
                    if (showStore && item.storeInfo) {
                        storeBadge = `
                            <span style="display: inline-flex; align-items: center; gap: 4px; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 6px;">
                                <i class="fa-solid fa-store" style="font-size: 10px; color: #64748b;"></i> ${item.storeInfo}
                            </span>
                        `;
                    }

                    const itemNoDisplay = (item.customNo || item.mainNo || '').trim();

                    itemsHtml += `
                        <div class="gallery-pdf-item" style="border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 14px; padding: 12px 14px; background-color: #ffffff; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;">
                            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                                <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                                    ${itemNoDisplay ? `
                                        <span style="background-color: #1A6FBF; color: #ffffff; font-weight: 700; font-size: 12px; padding: 2px 10px; border-radius: 6px; white-space: nowrap;">
                                            ข้อ ${itemNoDisplay}
                                        </span>
                                    ` : ''}
                                    <span style="font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.3;">
                                        ${item.name || 'ไม่มีชื่อรายการ'}
                                    </span>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 6px;">
                                        จำนวน: ${item.qty || 0} ${item.unit || ''}
                                    </span>
                                    ${priceBadge}
                                    ${storeBadge}
                                </div>
                            </div>
                            ${imagesGridHtml}
                        </div>
                    `;
                });

                return `
                    <div class="gallery-pdf-page-container" style="font-family: 'Kanit', 'Sarabun', 'Inter', sans-serif; color: #1e293b; line-height: 1.4; width: 100%; box-sizing: border-box; background: #ffffff;">
                        <!-- HEADER -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #1A6FBF; margin-bottom: 14px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                ${instLogo ? `<img src="${instLogo}" alt="Logo" style="height: 48px; width: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;">` : `
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #1A6FBF, #0e4a85); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">
                                    <i class="fa-solid fa-boxes-stacked"></i>
                                </div>`}
                                <div>
                                    <div style="font-size: 16px; font-weight: 800; color: #1A6FBF; letter-spacing: -0.2px;">Mentra Manager</div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">ระบบบริหารจัดการวัสดุอุปกรณ์และการจัดซื้อ</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">เอกสารแคตตาล็อกรูปภาพและรายการวัสดุ</div>
                                <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">MATERIALS & EQUIPMENT SPECIFICATION</div>
                                <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">พิมพ์เมื่อ: ${printTimestamp}</div>
                            </div>
                        </div>

                        <!-- PROJECT DETAILS CARD -->
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;">
                                <div style="font-size: 14px; font-weight: 700; color: #1A6FBF;">
                                    <i class="fa-solid fa-folder-open" style="margin-right: 4px;"></i> ${proj.name || 'ไม่มีชื่อโครงการ'}
                                </div>
                                <div style="font-size: 12px; font-weight: 600; color: #475569; background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                                    รหัสงาน: ${proj.code || '-'}
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11.5px;">
                                <div><span style="color: #64748b;">สถานศึกษา:</span> <strong style="color: #1e293b;">${proj.institution || '-'}</strong></div>
                                <div><span style="color: #64748b;">แผนก/สาขา:</span> <strong style="color: #1e293b;">${proj.department || '-'}</strong></div>
                                <div><span style="color: #64748b;">วันที่:</span> <strong style="color: #1e293b;">${displayDate}</strong></div>
                                <div><span style="color: #64748b;">คู่ค้า/ร้านค้า:</span> <strong style="color: #1e293b;">${dispCompany || '-'}</strong></div>
                                <div><span style="color: #64748b;">ครูผู้สอน/ผู้ประสาน:</span> <strong style="color: #1e293b;">${proj.teacher || '-'}</strong></div>
                                <div><span style="color: #64748b;">สรุปรายการ:</span> <strong style="color: #1A6FBF;">${itemsList.length} รายการ (รวม ${totalQty} ชิ้น)</strong></div>
                            </div>
                        </div>

                        <!-- ITEMS GALLERY -->
                        <div style="display: flex; flex-direction: column; width: 100%;">
                            ${itemsHtml}
                        </div>

                        <!-- FOOTER -->
                        <div style="margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
                            <span>เอกสารนี้สร้างโดยระบบ Mentra Manager — หน้าแคตตาล็อกรูปภาพและรายการวัสดุอุปกรณ์</span>
                            <span>หน้าแคตตาล็อกสินค้า</span>
                        </div>
                    </div>
                `;
            },

            executePrintGalleryPDF() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) {
                    this.showToast('ไม่พบข้อมูลโครงการ', 'error');
                    return;
                }

                const printArea = document.getElementById('galleryPrintArea');
                const wrapper = document.getElementById('galleryPrintOnlyWrapper');
                if (!printArea || !wrapper) return;

                const showPrice = document.getElementById('pdf-opt-show-price')?.checked || false;
                const showStore = document.getElementById('pdf-opt-show-store')?.checked || false;
                const cols = parseInt(document.getElementById('pdf-opt-cols')?.value || '3', 10);

                printArea.innerHTML = this.buildGalleryPDFContent({ showPrice, showStore, cols, isPrint: true });

                const statusEl = document.getElementById('gallery-pdf-status-text');
                if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-brand-500"></i> กำลังโหลดรูปภาพและจัดเตรียม PDF...';

                // Preload all images
                const images = Array.from(printArea.querySelectorAll('img'));
                const imgPromises = images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 2000); // 2s fallback per image
                    });
                });

                Promise.all([document.fonts.ready, ...imgPromises]).then(() => {
                    if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-check text-emerald-500"></i> พร้อมพิมพ์ / บันทึก PDF';
                    const originalTitle = document.title;
                    const safeName = (proj.name || 'โครงการ').replace(/[\\/:*?"<>|]/g, '_');
                    const safeCode = proj.code ? `[${proj.code}] ` : '';
                    document.title = `${safeCode}${safeName}_แกลลอรี่รูปภาพและรายการวัสดุ`;

                    wrapper.style.display = 'block';

                    setTimeout(() => {
                        window.print();
                        setTimeout(() => {
                            document.title = originalTitle;
                            wrapper.style.display = 'none';
                        }, 500);
                    }, 250);
                });
            },
            
            // Document Management
            getDocTypeInfo(fileName, mimeType = '') {
                const ext = (fileName || '').split('.').pop().toLowerCase();
                if (['pdf'].includes(ext) || mimeType.includes('pdf')) {
                    return { icon: 'fa-file-pdf', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200', type: 'pdf' };
                }
                if (['doc', 'docx'].includes(ext) || mimeType.includes('word')) {
                    return { icon: 'fa-file-word', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', type: 'word' };
                }
                if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
                    return { icon: 'fa-file-excel', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', type: 'excel' };
                }
                if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType.includes('image')) {
                    return { icon: 'fa-file-image', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', type: 'image' };
                }
                if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    return { icon: 'fa-file-zipper', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', type: 'archive' };
                }
                return { icon: 'fa-file-lines', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', type: 'other' };
            },

            renderDocuments() {
                const grid = document.getElementById('documents-grid');
                const badge = document.getElementById('doc-count-badge');
                if (!grid) return;
                
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                const docs = proj && proj.documents ? this._getItemsList(proj.documents) : [];
                
                if (badge) badge.innerText = docs.length;

                if (!proj || docs.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <i class="fa-solid fa-folder-open fa-3x mb-3 text-slate-300"></i>
                            <p class="font-bold text-slate-700 text-base">ยังไม่มีไฟล์เอกสารแนบในโครงการนี้</p>
                            <p class="text-xs text-slate-400 mt-1">กดปุ่ม "อัปโหลดเอกสาร" หรือลากไฟล์มาวางด้านบนเพื่อเริ่มแนบไฟล์</p>
                        </div>
                    `;
                    return;
                }
                
                grid.innerHTML = '';
                docs.forEach(docItem => {
                    const info = this.getDocTypeInfo(docItem.name, docItem.type);
                    const card = document.createElement('div');
                    card.className = "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group";
                    
                    card.innerHTML = `
                        <div class="flex items-start gap-3.5 mb-4">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${info.bg} ${info.color} shadow-sm group-hover:scale-105 transition-transform">
                                <i class="fa-solid ${info.icon} text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-slate-800 text-sm truncate leading-tight group-hover:text-brand-600 transition-colors" title="${docItem.name}">${docItem.name}</h4>
                                <div class="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                                    <span class="font-semibold text-slate-500">${docItem.size || 'ไม่ทราบขนาด'}</span>
                                    <span>•</span>
                                    <span>${docItem.uploadedAt || ''}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <button onclick="appData.openDocPreview('${docItem.id}')" class="flex-1 py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-brand-100 shadow-sm">
                                <i class="fa-solid fa-eye text-xs"></i> ดูเอกสาร
                            </button>
                            <a href="${docItem.url}" target="_blank" download="${docItem.name}" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0" title="ดาวน์โหลด">
                                <i class="fa-solid fa-download text-xs"></i>
                            </a>
                            ${this.isReadOnly ? '' : `
                            <button onclick="appData.deleteDocument('${docItem.id}')" class="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors shrink-0" title="ลบเอกสาร">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                            `}
                        </div>
                    `;
                    grid.appendChild(card);
                });
            },

            async handleDocUpload(e) {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                this.uploadFilesList(Array.from(files));
                e.target.value = '';
            },

            handleDocDragOver(e) {
                e.preventDefault();
                e.stopPropagation();
                const dropZone = document.getElementById('doc-drop-zone');
                if (dropZone) dropZone.classList.add('border-brand-500', 'bg-brand-50/50');
            },

            handleDocDragLeave(e) {
                e.preventDefault();
                e.stopPropagation();
                const dropZone = document.getElementById('doc-drop-zone');
                if (dropZone) dropZone.classList.remove('border-brand-500', 'bg-brand-50/50');
            },

            handleDocDrop(e) {
                e.preventDefault();
                e.stopPropagation();
                this.handleDocDragLeave(e);
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.uploadFilesList(Array.from(files));
                }
            },

            async uploadFilesList(files) {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                if (!proj.documents) proj.documents = [];

                const totalFiles = files.length;
                const formatBytes = (bytes) => {
                    if (!bytes || isNaN(bytes)) return '0 B';
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                };

                this.showGlobalLoader('กำลังอัปโหลดเอกสาร...', totalFiles > 1 ? `ไฟล์ที่ 1 จาก ${totalFiles} ไฟล์` : 'กรุณารอสักครู่', 'fa-cloud-arrow-up', {
                    showProgress: true,
                    percent: 5,
                    filename: files[0]?.name || 'เอกสาร',
                    bytes: `0 KB / ${formatBytes(files[0]?.size || 0)}`,
                    step: 'กำลังเตรียมโฟลเดอร์ Google Drive...'
                });

                try {
                    // Resolve Folders ONCE for all files in this batch (cached in memory)
                    let sysFolderId = null;
                    if (window.driveIntegration && window.GAS_URL) {
                        try {
                            const instName = proj.institution && proj.institution.trim() !== '' ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                            const instFolderId = await window.driveIntegration.getOrCreateFolder(instName, window.DRIVE_ROOT_FOLDER_ID);
                            sysFolderId = await window.driveIntegration.getOrCreateFolder('เอกสารโครงการ', instFolderId);
                        } catch (fErr) {
                            console.warn('Folder resolution fallback:', fErr);
                        }
                    }

                    for (let i = 0; i < totalFiles; i++) {
                        const file = files[i];
                        const fileNum = i + 1;
                        let fileUrl = '';
                        const totalSizeStr = formatBytes(file.size);
                        
                        const basePct = (i / totalFiles) * 100;
                        const fileShare = 100 / totalFiles;

                        this.showGlobalLoader(
                            'กำลังอัปโหลดเอกสาร...', 
                            totalFiles > 1 ? `ไฟล์ที่ ${fileNum} จาก ${totalFiles} ไฟล์` : 'กรุณารอสักครู่', 
                            'fa-cloud-arrow-up',
                            {
                                showProgress: true,
                                percent: Math.round(basePct + 2),
                                filename: file.name,
                                bytes: `0 KB / ${totalSizeStr}`,
                                step: 'กำลังเริ่มอัปโหลด...'
                            }
                        );
                        
                        // Upload directly to Drive or fallback to base64
                        if (window.driveIntegration && window.GAS_URL && sysFolderId) {
                            try {
                                const filename = `doc_${Date.now()}_${file.name}`;
                                fileUrl = await window.driveIntegration.uploadFileDirect(
                                    file, 
                                    filename, 
                                    sysFolderId,
                                    (filePct, loaded, total, stepDesc) => {
                                        const overallPct = Math.round(basePct + (filePct * (fileShare / 100)));
                                        const loadedStr = formatBytes(loaded);
                                        const totalStr = formatBytes(total);
                                        this.updateGlobalLoaderProgress(
                                            overallPct,
                                            file.name,
                                            `${loadedStr} / ${totalStr}`,
                                            stepDesc || `กำลังอัปโหลด... ${filePct}%`
                                        );
                                    }
                                );
                            } catch (driveErr) {
                                console.warn('Drive direct upload fallback:', driveErr);
                                this.updateGlobalLoaderProgress(Math.round(basePct + 30), file.name, totalSizeStr, 'กำลังบันทึกไฟล์สำรอง...');
                                fileUrl = await this._fileToBase64(file, (pct, loaded, total) => {
                                    const overallPct = Math.round(basePct + (pct * (fileShare / 100)));
                                    this.updateGlobalLoaderProgress(overallPct, file.name, `${formatBytes(loaded)} / ${formatBytes(total)}`, `กำลังประมวลผลไฟล์... ${pct}%`);
                                });
                            }
                        } else {
                            this.updateGlobalLoaderProgress(Math.round(basePct + 30), file.name, totalSizeStr, 'กำลังบันทึกไฟล์สำรอง...');
                            fileUrl = await this._fileToBase64(file, (pct, loaded, total) => {
                                const overallPct = Math.round(basePct + (pct * (fileShare / 100)));
                                this.updateGlobalLoaderProgress(overallPct, file.name, `${formatBytes(loaded)} / ${formatBytes(total)}`, `กำลังประมวลผลไฟล์... ${pct}%`);
                            });
                        }

                        this.updateGlobalLoaderProgress(
                            Math.round(((i + 1) / totalFiles) * 100),
                            file.name,
                            `${totalSizeStr} / ${totalSizeStr}`,
                            'อัปโหลดไฟล์นี้เสร็จแล้ว'
                        );

                        proj.documents.push({
                            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            name: file.name,
                            size: totalSizeStr,
                            type: file.type || '',
                            url: fileUrl,
                            uploadedAt: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        });
                    }

                    this.updateGlobalLoaderProgress(100, 'เสร็จสมบูรณ์!', 'บันทึกข้อมูลเรียบร้อย', 'กำลังบันทึกลงระบบ...');
                    this.syncCurrentProject();
                    this.renderDocuments();
                    setTimeout(() => {
                        this.hideGlobalLoader();
                        this.showToast(`อัปโหลดเอกสารสำเร็จ ${files.length} รายการ`, 'success');
                    }, 400);
                } catch (err) {
                    console.error('Doc Upload Error:', err);
                    this.hideGlobalLoader();
                    this.showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message, 'error');
                }
            },

            _fileToBase64(file, onProgress) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    if (typeof onProgress === 'function') {
                        reader.onprogress = e => {
                            if (e.lengthComputable) {
                                const pct = Math.round((e.loaded / e.total) * 100);
                                onProgress(pct, e.loaded, e.total);
                            }
                        };
                    }
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = err => reject(err);
                    reader.readAsDataURL(file);
                });
            },

            openDocPreview(docId) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj || !proj.documents) return;
                const docItem = this._getItemsList(proj.documents).find(d => String(d.id) === String(docId));
                if (!docItem) return;

                const modal = document.getElementById('doc-preview-modal');
                const content = document.getElementById('doc-preview-modal-content');
                const title = document.getElementById('doc-preview-title');
                const meta = document.getElementById('doc-preview-meta');
                const icon = document.getElementById('doc-preview-icon');
                const body = document.getElementById('doc-preview-body');
                const downloadBtn = document.getElementById('doc-preview-download-btn');

                title.innerText = docItem.name || 'เอกสาร';
                meta.innerHTML = `<span>${docItem.size || ''}</span> • <span>${docItem.uploadedAt || ''}</span>`;
                downloadBtn.href = docItem.url;
                downloadBtn.download = docItem.name || 'document';

                const info = this.getDocTypeInfo(docItem.name, docItem.type);
                icon.className = `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${info.bg} ${info.color}`;
                icon.innerHTML = `<i class="fa-solid ${info.icon} text-lg"></i>`;

                // Preview Body logic
                let previewHtml = '';
                const url = docItem.url || '';
                let embedUrl = url;
                if (url.includes('drive.google.com/uc?id=')) {
                    const fileId = new URLSearchParams(url.split('?')[1]).get('id');
                    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                }

                if (info.type === 'image' || url.startsWith('data:image/')) {
                    previewHtml = `<div class="w-full h-full flex items-center justify-center max-h-[75vh] p-2"><img src="${this.getSafeImageUrl(url)}" class="max-w-full max-h-full object-contain rounded-xl shadow-md"></div>`;
                } else if (info.type === 'pdf' || url.includes('drive.google.com') || url.endsWith('.pdf')) {
                    previewHtml = `<iframe src="${embedUrl}" class="w-full h-[75vh] rounded-xl border-0 bg-white shadow-inner" allow="autoplay"></iframe>`;
                } else {
                    previewHtml = `
                        <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full mx-auto my-auto">
                            <div class="w-20 h-20 rounded-2xl ${info.bg} ${info.color} flex items-center justify-center mx-auto mb-4 border shadow-sm">
                                <i class="fa-solid ${info.icon} text-3xl"></i>
                            </div>
                            <h4 class="font-bold text-slate-800 text-lg mb-1 truncate px-2" title="${docItem.name}">${docItem.name}</h4>
                            <p class="text-xs text-slate-500 mb-6">ไฟล์ประเภทนี้ไม่สามารถแสดงตัวอย่างบนเว็บโดยตรงได้ สามารถกดปุ่มด้านล่างเพื่อดาวน์โหลดเปิดดู</p>
                            <a href="${url}" target="_blank" download="${docItem.name}" class="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-600 transition-all shadow-md">
                                <i class="fa-solid fa-download"></i> ดาวน์โหลดไฟล์เอกสาร
                            </a>
                        </div>
                    `;
                }

                body.innerHTML = previewHtml;

                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },

            closeDocPreviewModal() {
                const modal = document.getElementById('doc-preview-modal');
                const content = document.getElementById('doc-preview-modal-content');
                if (!modal || !content) return;
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                    const body = document.getElementById('doc-preview-body');
                    if (body) body.innerHTML = '';
                }, 300);
            },

            deleteDocument(docId) {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                this.openConfirmModal('ยืนยันลบเอกสาร', 'คุณแน่ใจหรือไม่ที่จะลบไฟล์เอกสารนี้ออกจากโครงการ?', () => {
                    const proj = this.projects.find(p => p.id === this.currentProjectId);
                    if (!proj || !proj.documents) return;
                    
                    proj.documents = this._getItemsList(proj.documents).filter(d => String(d.id) !== String(docId));
                    this.syncCurrentProject();
                    this.renderDocuments();
                    this.showToast('ลบไฟล์เอกสารเรียบร้อยแล้ว', 'success');
                });
            },
            
            // Image Modal Management
            currentImageItemId: null,
            async openImageModal(itemId) {
                console.log('openImageModal called for item:', itemId);
                
                let proj = null;
                let item = null;
                
                for (const p of this.projects) {
                    const foundItem = this._getItemsList(p.items).find(i => String(i.id) === String(itemId));
                    if (foundItem) {
                        proj = p;
                        item = foundItem;
                        break;
                    }
                }
                if (!proj || !item) {
                    console.error('openImageModal: Item not found in any project!', itemId);
                    if (window.Swal) {
                        Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลรายการสินค้าในระบบ (รหัส: ' + itemId + ') กรุณารีเฟรชหน้าเว็บ', 'error');
                    } else {
                        alert('ไม่พบข้อมูลรายการสินค้า กรุณารีเฟรชหน้าเว็บ');
                    }
                    return;
                }
                
                if (!this.currentProjectId) {
                    this.currentProjectId = proj.id;
                }
                
                this.currentImageItemId = itemId;
                document.getElementById('image-modal-item-name').innerText = item.name || 'ไม่มีชื่อรายการ';
                
                const url = item.imageUrl || '';
                document.getElementById('image-modal-url').value = url;
                this.updateImagePreview(url);
                
                const modal = document.getElementById('image-url-modal');
                const content = document.getElementById('image-url-modal-content');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
                setTimeout(() => document.getElementById('image-paste-area').focus(), 100);
            },
            
            async quickAddImageFromClipboard(itemId) {
                try {
                    if (navigator.clipboard && navigator.clipboard.read) {
                        const clipboardItems = await navigator.clipboard.read();
                        for (const clipboardItem of clipboardItems) {
                            const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
                            if (imageTypes.length > 0) {
                                const blob = await clipboardItem.getType(imageTypes[0]);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const base64Data = event.target.result;
                                    const img = new Image();
                                    img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const MAX_WIDTH = 1200;
                                        const MAX_HEIGHT = 1200;
                                        let width = img.width;
                                        let height = img.height;
                                        
                                        if (width > height) {
                                            if (width > MAX_WIDTH) {
                                                height = Math.round((height * MAX_WIDTH) / width);
                                                width = MAX_WIDTH;
                                            }
                                        } else {
                                            if (height > MAX_HEIGHT) {
                                                width = Math.round((width * MAX_HEIGHT) / height);
                                                height = MAX_HEIGHT;
                                            }
                                        }
                                        
                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(img, 0, 0, width, height);
                                        
                                        canvas.toBlob(async (blob) => {
                                            try {
                                                let proj = null;
                                                let item = null;
                                                for (const p of this.projects) {
                                                    const foundItem = this._getItemsList(p.items).find(i => String(i.id) === String(itemId));
                                                    if (foundItem) {
                                                        proj = p;
                                                        item = foundItem;
                                                        break;
                                                    }
                                                }
                                                if (!proj) throw new Error('ไม่พบข้อมูลโครงการ');
                                                if (!item) throw new Error('ไม่พบข้อมูลรายการสินค้า');
                                                
                                                if (!this.currentProjectId) {
                                                    this.currentProjectId = proj.id;
                                                }
                                                
                                                if (!item.images) {
                                                    item.images = [];
                                                    if (item.imageUrl && item.imageUrl.trim() !== '') {
                                                        item.images.push(item.imageUrl);
                                                    }
                                                }
                                                if (item.images.length >= 6) {
                                                    this.showToast('เพิ่มรูปภาพได้สูงสุด 6 รูปเท่านั้น (ลบรูปเก่าก่อนเพื่อเพิ่มใหม่)', 'error');
                                                    return;
                                                }

                                                // OPTIMISTIC UI: Show placeholder immediately
                                                this.activeUploads = this.activeUploads || new Set();
                                                const tempUrl = URL.createObjectURL(blob);
                                                this.activeUploads.add(tempUrl);
                                                item.images.push(tempUrl);
                                                this.renderGallery();
                                                this.showToast('กำลังอัปโหลดรูปภาพในเบื้องหลัง...', 'info');
                                                
                                                // 1. Get/Create Folders
                                                const instName = proj.institution && proj.institution.trim() !== '' ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                                                const instFolderId = await window.driveIntegration.getOrCreateFolder(instName, window.DRIVE_ROOT_FOLDER_ID);
                                                const sysFolderId = await window.driveIntegration.getOrCreateFolder('ระบบจัดซื้อวัสดุอุปกรณ์', instFolderId);
                                                
                                                // 2. Upload using Resumable Upload
                                                const filename = `item_${itemId}_${Date.now()}.jpg`;
                                                const driveUrl = await window.driveIntegration.uploadImageResumable(blob, filename, sysFolderId);
                                                
                                                // 3. Replace temp placeholder with actual Drive URL & Save to Firebase
                                                const tempIndex = item.images.indexOf(tempUrl);
                                                if (tempIndex !== -1) {
                                                    item.images[tempIndex] = driveUrl;
                                                } else {
                                                    item.images.push(driveUrl);
                                                }
                                                this.activeUploads.delete(tempUrl);
                                                URL.revokeObjectURL(tempUrl); // Clean up memory
                                                
                                                this.updateItem(itemId, 'images', item.images);
                                                this.renderGallery();
                                                this.showToast('อัปโหลดรูปภาพเสร็จสมบูรณ์!', 'success');
                                            } catch (error) {
                                                console.error('Drive Upload Error:', error);
                                                // Remove the temporary image placeholder on error
                                                if (item && item.images) {
                                                    item.images = item.images.filter(img => !img.startsWith('blob:'));
                                                    this.renderGallery();
                                                }
                                                if (typeof tempUrl !== 'undefined') {
                                                    this.activeUploads.delete(tempUrl);
                                                    URL.revokeObjectURL(tempUrl);
                                                }
                                                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปภาพได้: ' + error.message, 'error');
                                            }
                                        }, 'image/jpeg', 0.7);
                                    };
                                    img.onerror = () => {
                                        this.showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
                                    };
                                    img.src = base64Data;
                                };
                                reader.readAsDataURL(blob);
                                return;
                            }
                        }
                    }
                    this.showToast('ไม่พบรูปภาพในคลิปบอร์ด', 'error');
                    this.openImageModal(itemId);
                } catch (err) {
                    console.log('Clipboard read failed:', err);
                    if (err.name === 'NotAllowedError') {
                        this.showToast('เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด', 'error');
                    }
                    this.openImageModal(itemId);
                }
            },
            
            closeImageModal() {
                const modal = document.getElementById('image-url-modal');
                const content = document.getElementById('image-url-modal-content');
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                    this.currentImageItemId = null;
                }, 300);
            },
            
            async saveImageUrl() {
                if (!this.currentImageItemId) return;
                const url = document.getElementById('image-modal-url').value;
                
                let proj = null;
                let item = null;
                
                for (const p of this.projects) {
                    const foundItem = this._getItemsList(p.items).find(i => String(i.id) === String(this.currentImageItemId));
                    if (foundItem) {
                        proj = p;
                        item = foundItem;
                        break;
                    }
                }
                
                if (!proj || !item) {
                    console.error('saveImageUrl: Item not found!');
                    this.showToast('ไม่พบข้อมูลรายการสินค้า', 'error');
                    return;
                }
                
                if (!this.currentProjectId) {
                    this.currentProjectId = proj.id;
                }
                if (!item.images) {
                    item.images = [];
                    if (item.imageUrl && item.imageUrl.trim() !== '') {
                        item.images.push(item.imageUrl);
                    }
                }
                if (item.images.length >= 6) {
                    this.showToast('เพิ่มรูปภาพได้สูงสุด 6 รูปเท่านั้น', 'error');
                    return;
                }
                
                if (url.startsWith('data:image/')) {
                    // OPTIMISTIC UI: Show placeholder immediately and close modal
                    this.activeUploads = this.activeUploads || new Set();
                    this.activeUploads.add(url);
                    item.images.push(url);
                    this.renderGallery();
                    this.closeImageModal();
                    this.showToast('กำลังอัปโหลดรูปภาพในเบื้องหลัง...', 'info');
                    
                    try {
                        const fetchResponse = await fetch(url);
                        const blob = await fetchResponse.blob();
                        
                        const instName = proj.institution && proj.institution.trim() !== '' ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                        const instFolderId = await window.driveIntegration.getOrCreateFolder(instName, window.DRIVE_ROOT_FOLDER_ID);
                        const sysFolderId = await window.driveIntegration.getOrCreateFolder('ระบบจัดซื้อวัสดุอุปกรณ์', instFolderId);
                        
                        const filename = `item_${this.currentImageItemId}_${Date.now()}.jpg`;
                        const driveUrl = await window.driveIntegration.uploadImageResumable(blob, filename, sysFolderId);
                        
                        // Replace temp placeholder
                        const tempIndex = item.images.indexOf(url);
                        if (tempIndex !== -1) {
                            item.images[tempIndex] = driveUrl;
                        } else {
                            item.images.push(driveUrl);
                        }
                        this.activeUploads.delete(url);
                        
                        this.updateItem(this.currentImageItemId, 'images', item.images);
                        this.renderGallery();
                        this.showToast('อัปโหลดรูปภาพเสร็จสมบูรณ์!', 'success');
                    } catch (error) {
                        console.error('Drive Upload Error:', error);
                        // Remove the temp image on error
                        if (item && item.images) {
                            item.images = item.images.filter(img => img !== url);
                            this.renderGallery();
                        }
                        this.activeUploads.delete(url);
                        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปภาพได้: ' + error.message, 'error');
                    }
                } else {
                    item.images.push(url);
                    this.updateItem(this.currentImageItemId, 'images', item.images);
                    this.closeImageModal();
                    this.renderGallery();
                }
            },

            // Lightbox Methods
            currentLightboxItemId: null,
            currentLightboxImageIndex: 0,
            
            openLightbox(itemId, index) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                const item = this._getItemsList(proj.items).find(i => String(i.id) === String(itemId));
                if (!item || !item.images || item.images.length === 0) return;
                
                this.currentLightboxItemId = itemId;
                this.currentLightboxImageIndex = index;
                
                this.updateLightboxImage();
                
                const modal = document.getElementById('lightbox-modal');
                const img = document.getElementById('lightbox-image');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    img.classList.remove('scale-95');
                    img.classList.add('scale-100');
                }, 10);
            },
            
            updateLightboxImage() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                const item = this._getItemsList(proj.items).find(i => String(i.id) === String(this.currentLightboxItemId));
                if (!item || !item.images) return;
                
                const imagesList = Array.isArray(item.images) ? item.images : Object.values(item.images);
                const imgUrl = imagesList[this.currentLightboxImageIndex];
                const imgElement = document.getElementById('lightbox-image');
                if (imgElement) imgElement.src = this.getSafeImageUrl(imgUrl);
                
                const counter = document.getElementById('lightbox-counter');
                if (counter) counter.innerText = `${this.currentLightboxImageIndex + 1} / ${imagesList.length}`;
            },
            
            prevLightboxImage() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                const item = this._getItemsList(proj.items).find(i => String(i.id) === String(this.currentLightboxItemId));
                if (!item || !item.images) return;
                
                const imagesList = Array.isArray(item.images) ? item.images : Object.values(item.images);
                this.currentLightboxImageIndex--;
                if (this.currentLightboxImageIndex < 0) {
                    this.currentLightboxImageIndex = imagesList.length - 1;
                }
                this.updateLightboxImage();
            },
            
            nextLightboxImage() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                const item = this._getItemsList(proj.items).find(i => String(i.id) === String(this.currentLightboxItemId));
                if (!item || !item.images) return;
                
                const imagesList = Array.isArray(item.images) ? item.images : Object.values(item.images);
                this.currentLightboxImageIndex++;
                if (this.currentLightboxImageIndex >= imagesList.length) {
                    this.currentLightboxImageIndex = 0;
                }
                this.updateLightboxImage();
            },
            
            closeLightbox() {
                const modal = document.getElementById('lightbox-modal');
                const img = document.getElementById('lightbox-image');
                modal.classList.add('opacity-0');
                img.classList.remove('scale-100');
                img.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                    this.currentLightboxItemId = null;
                }, 300);
            },
            
            deleteCurrentLightboxImage() {
                this.openConfirmModal('ยืนยันลบรูปภาพ', 'คุณต้องการลบรูปภาพนี้ใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้', () => {
                    const proj = this.projects.find(p => p.id === this.currentProjectId);
                    const item = proj.items.find(i => i.id === this.currentLightboxItemId);
                    if (!item || !item.images) return;
                    
                    const imageUrl = item.images[this.currentLightboxImageIndex];
                    
                    (async () => {
                        try {
                            this.showGlobalLoader('กำลังลบรูปภาพ...', 'ลบรูปออกจาก Google Drive');
                            
                            // Extract File ID from drive URL if it exists
                            if (imageUrl && imageUrl.includes('drive.google.com/uc?id=')) {
                                const urlParams = new URLSearchParams(imageUrl.split('?')[1]);
                                const fileId = urlParams.get('id');
                                if (fileId) {
                                    await window.driveIntegration.deleteFile(fileId);
                                }
                            }
                            
                            // Remove from array and update Firebase
                            item.images.splice(this.currentLightboxImageIndex, 1);
                            this.updateItem(this.currentLightboxItemId, 'images', item.images);
                            
                            if (item.images.length === 0) {
                                this.closeLightbox();
                            } else {
                                if (this.currentLightboxImageIndex >= item.images.length) {
                                    this.currentLightboxImageIndex = item.images.length - 1;
                                }
                                this.updateLightboxImage();
                            }
                            this.renderGallery();
                            this.hideGlobalLoader();
                            this.showToast('ลบรูปภาพสำเร็จ', 'success');
                        } catch (error) {
                            console.error('Drive Delete Error:', error);
                            this.hideGlobalLoader();
                            this.showToast('ลบรูปล้มเหลว: ' + error.message, 'error');
                        }
                    })();
                });
            },

            updateImagePreview(url) {
                const preview = document.getElementById('image-preview');
                const placeholder = document.getElementById('image-placeholder-content');
                const removeBtn = document.getElementById('remove-image-btn');
                const pasteArea = document.getElementById('image-paste-area');
                
                if (url && url.trim() !== '') {
                    preview.src = url;
                    preview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    removeBtn.classList.remove('hidden');
                    pasteArea.classList.remove('border-dashed', 'border-brand-300');
                    pasteArea.classList.add('border-solid', 'border-brand-500');
                } else {
                    preview.src = '';
                    preview.classList.add('hidden');
                    placeholder.classList.remove('hidden');
                    removeBtn.classList.add('hidden');
                    pasteArea.classList.add('border-dashed', 'border-brand-300');
                    pasteArea.classList.remove('border-solid', 'border-brand-500');
                }
            },

            previewImageUrl() {
                const url = document.getElementById('image-modal-url').value;
                this.updateImagePreview(url);
            },

            clearImagePreview(e) {
                if(e) e.stopPropagation();
                document.getElementById('image-modal-url').value = '';
                this.updateImagePreview('');
                document.getElementById('image-paste-area').focus();
            },

            handleImagePaste(e) {
                e.preventDefault();
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file' && item.type.startsWith('image/')) {
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const base64Data = event.target.result;
                            document.getElementById('image-modal-url').value = base64Data;
                            this.updateImagePreview(base64Data);
                        };
                        reader.readAsDataURL(blob);
                        return;
                    }
                }
            },

            // Modal Management
            isEditMode: false,
            
            openAddProjectModal() {
                this.isEditMode = false;
                const modal = document.getElementById('add-project-modal');
                const content = document.getElementById('add-project-modal-content');
                
                document.getElementById('modal-project-title').innerHTML = '<i class="fa-solid fa-folder-plus text-brand-500"></i> เพิ่มโครงการจัดซื้อใหม่';
                
                // Reset form fields
                document.getElementById('modal-proj-name').value = '';
                document.getElementById('modal-proj-code').value = '';
                document.getElementById('modal-proj-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('modal-proj-dept').value = '';
                const curInst = this.currentInstitution || '';
                document.getElementById('modal-proj-inst').value = curInst;
                const curInstTax = (this.institutionDetails && curInst && this.institutionDetails[curInst]?.taxId) || '';
                if (document.getElementById('modal-proj-taxid')) {
                    document.getElementById('modal-proj-taxid').value = curInstTax;
                }
                this.selectedShopsForForm = [];
                this.updateShopDisplay();
                this.populateShopDropdown();
                document.getElementById('modal-proj-teacher').value = '';
                document.getElementById('modal-proj-status').value = 'Processing';
                document.getElementById('modal-proj-remarks').value = '';
                
                // Show modal
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                // Trigger animation
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },
            
            openEditProjectModal() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                this.isEditMode = true;
                const modal = document.getElementById('add-project-modal');
                const content = document.getElementById('add-project-modal-content');
                
                document.getElementById('modal-project-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-500"></i> แก้ไขรายละเอียดโครงการ';
                
                // Populate form fields
                document.getElementById('modal-proj-name').value = proj.name || '';
                document.getElementById('modal-proj-code').value = proj.code || '';
                document.getElementById('modal-proj-date').value = proj.date || new Date().toISOString().split('T')[0];
                document.getElementById('modal-proj-dept').value = proj.department || '';
                const projInst = proj.institution || '';
                document.getElementById('modal-proj-inst').value = projInst;
                const projInstTax = proj.taxId || (this.institutionDetails && projInst && this.institutionDetails[projInst]?.taxId) || '';
                if (document.getElementById('modal-proj-taxid')) {
                    document.getElementById('modal-proj-taxid').value = projInstTax;
                }
                let validCompany = (proj.company && proj.company !== proj.institution) ? proj.company : '';
                if (!validCompany && proj.shop && proj.shop !== proj.institution) {
                    validCompany = proj.shop;
                }
                this.selectedShopsForForm = Array.isArray(validCompany) ? [...validCompany] : (validCompany ? [validCompany] : []);
                this.updateShopDisplay();
                this.populateShopDropdown();
                document.getElementById('modal-proj-teacher').value = proj.teacher || '';
                document.getElementById('modal-proj-status').value = proj.status || 'Processing';
                document.getElementById('modal-proj-remarks').value = proj.remarks || '';
                
                // Show modal
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                // Trigger animation
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }, 10);
            },
            
            onProjectInstitutionChange() {
                const instName = document.getElementById('modal-proj-inst')?.value.trim();
                if (instName && this.institutionDetails && this.institutionDetails[instName]?.taxId) {
                    const taxInput = document.getElementById('modal-proj-taxid');
                    if (taxInput && !taxInput.value) {
                        taxInput.value = this.institutionDetails[instName].taxId;
                    }
                }
            },
            
            closeAddProjectModal() {
                const modal = document.getElementById('add-project-modal');
                const content = document.getElementById('add-project-modal-content');
                
                // Trigger exit animation
                modal.classList.add('opacity-0');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
                
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 300);
            },
            
            generateProjectCode() {
                const year = new Date().getFullYear();
                const randomNum = Math.floor(Math.random() * 9000) + 1000;
                document.getElementById('modal-proj-code').value = `PRJ-${year}-${randomNum}`;
            },
            
            async saveProject() {
                const name = document.getElementById('modal-proj-name').value.trim();
                const code = document.getElementById('modal-proj-code').value.trim();
                const date = document.getElementById('modal-proj-date').value;
                const dept = document.getElementById('modal-proj-dept').value.trim();
                const inst = document.getElementById('modal-proj-inst').value.trim();
                const taxId = document.getElementById('modal-proj-taxid')?.value.trim() || '';
                const company = this.selectedShopsForForm.length > 0 ? this.selectedShopsForForm[0] : '';
                const teacher = document.getElementById('modal-proj-teacher').value.trim();
                const status = document.getElementById('modal-proj-status').value;
                const remarks = document.getElementById('modal-proj-remarks').value.trim();
                
                if (!name || !code || !date) {
                    alert('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
                    return;
                }
                
                // If taxId is entered and institution exists, keep institutionDetails in sync
                if (inst && taxId && this.institutionDetails) {
                    if (!this.institutionDetails[inst]) this.institutionDetails[inst] = {};
                    if (!this.institutionDetails[inst].taxId || this.institutionDetails[inst].taxId !== taxId) {
                        this.institutionDetails[inst].taxId = taxId;
                        if (window.saveInstitutionDetailsToFirestore) {
                            window.saveInstitutionDetailsToFirestore(this.institutionDetails);
                        }
                    }
                }
                
                if (this.isEditMode) {
                    const proj = this.projects.find(p => String(p.id) === String(this.currentProjectId));
                    if (proj) {
                        proj.name = name;
                        proj.code = code;
                        proj.date = date;
                        proj.department = dept;
                        proj.institution = inst;
                        proj.taxId = taxId;
                        proj.company = company;
                        proj.shop = company; // Synchronize shop with selected company issuer
                        proj.teacher = teacher;
                        proj.status = status;
                        proj.remarks = remarks;
                        
                        // Immediately update UI & workflow
                        this.updateProjectDetailsUI(proj);
                        this.updateWorkflowUI(proj);
                        this.renderProjects();
                        
                        // Immediately update selected issuer in localStorage
                        if (company) {
                            try {
                                localStorage.setItem('selected_issuer_company', company);
                            } catch(e) {}
                        }

                        // Immediately refresh lightweight localStorage cache so cross-page actions have fresh shop
                        try {
                            const lightProjects = this.projects.map(p => {
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
                        
                        // Sync to firebase
                        if (window.saveProjectToFirestore) {
                            window.saveProjectToFirestore(proj).catch(e => console.warn('Background saveProjectToFirestore error:', e));
                        }
                    }
                } else {
                    const newProj = {
                        id: 'proj_' + Date.now(),
                        name: name,
                        code: code,
                        date: date,
                        department: dept,
                        institution: inst,
                        taxId: taxId,
                        company: company,
                        shop: company,
                        teacher: teacher,
                        status: status,
                        remarks: remarks,
                        items: []
                    };
                    if (company) {
                        try {
                            localStorage.setItem('selected_issuer_company', company);
                        } catch(e) {}
                    }
                    if (window.saveProjectToFirestore) {
                        window.saveProjectToFirestore(newProj).catch(e => console.warn('Background saveProjectToFirestore error:', e));
                    } else {
                        this.projects.unshift(newProj);
                        this.renderProjects();
                    }
                }
                
                this.closeAddProjectModal();
            },
            
            getProjectShopName(proj) {
                if (!proj) return '';
                let shop = '';
                const instStr = (proj.institution || '').trim();
                // 1. Prioritize proj.company (selected by user in the project form)
                if (proj.company) {
                    const c = Array.isArray(proj.company) ? proj.company[0] : proj.company;
                    if (c && String(c).trim() && String(c).trim() !== instStr) {
                        shop = String(c).trim();
                    }
                }
                // 2. Try proj.shop
                if (!shop && proj.shop) {
                    const s = Array.isArray(proj.shop) ? proj.shop[0] : proj.shop;
                    if (s && String(s).trim() && String(s).trim() !== instStr) {
                        shop = String(s).trim();
                    }
                }
                // 3. Fallback to active workspace or saved issuer company
                if (!shop) {
                    try {
                        const saved = localStorage.getItem('selected_issuer_company') || localStorage.getItem('mentra_active_workspace') || '';
                        if (saved && !saved.includes('กรุณาเลือกบริษัท') && saved.trim() !== instStr) {
                            shop = saved.trim();
                        }
                    } catch(e) {}
                }
                // 4. Final fallback
                if (!shop) {
                    shop = 'บริษัท เมนทร้า โซลูชั่น จำกัด (สำนักงานใหญ่)';
                }
                return String(shop).trim();
            },
            
            async openQuotationForProject() {
                if (this.currentProjectId) {
                    let proj = this.projects.find(p => String(p.id) === String(this.currentProjectId));
                    if (!proj) {
                        try {
                            const cached = localStorage.getItem('material_projects');
                            if (cached) {
                                const list = JSON.parse(cached);
                                if (Array.isArray(list)) proj = list.find(p => String(p.id) === String(this.currentProjectId));
                            }
                        } catch(e) {}
                    }

                    if (proj) {
                        const rawItems = Array.isArray(proj.items) ? proj.items : (proj.items && typeof proj.items === 'object' ? Object.values(proj.items) : []);
                        const cleanItems = rawItems.map(it => {
                            const rawPrice = it.unitPrice !== undefined && it.unitPrice !== null && it.unitPrice !== '' ? Number(it.unitPrice)
                                           : it.targetPrice !== undefined && it.targetPrice !== null && it.targetPrice !== '' ? Number(it.targetPrice)
                                           : it.foundPrice !== undefined && it.foundPrice !== null && it.foundPrice !== '' ? Number(it.foundPrice)
                                           : '';
                            const hasPrice = rawPrice !== '' && !isNaN(rawPrice) && rawPrice > 0;
                            const price = rawPrice !== '' && !isNaN(rawPrice) ? rawPrice : '';

                            const rawQty = it.qty !== undefined && it.qty !== null && it.qty !== '' ? Number(it.qty) : '';
                            const qty = rawQty !== '' ? rawQty : (hasPrice ? 1 : '');

                            return {
                                id: it.id,
                                isHeader: !!it.isHeader,
                                mainNo: it.mainNo !== undefined ? it.mainNo : '',
                                customNo: it.customNo || '',
                                name: it.name || it.desc || '',
                                desc: it.desc || it.name || '',
                                qty: qty,
                                unit: it.unit || '',
                                unitPrice: price,
                                price: price,
                                storeInfo: it.storeInfo || ''
                            };
                        });

                        const instDetails = (this.institutionDetails && proj.institution) ? (this.institutionDetails[proj.institution] || {}) : {};
                        const pendingData = {
                            source: 'school',
                            projectId: this.currentProjectId,
                            institution: proj.institution || '',
                            items: cleanItems,
                            company: '',
                            shop: '',
                            name: proj.name || '',
                            code: proj.code || '',
                            address: proj.address || instDetails.address || '',
                            attn: proj.teacher || proj.attn || instDetails.contact || '',
                            tel: proj.tel || instDetails.phone || '',
                            email: proj.email || instDetails.email || '',
                            taxId: proj.taxId || instDetails.taxId || '',
                            discountType: proj.discountType || 'percent',
                            discountValue: proj.discountValue || 0,
                            timestamp: Date.now()
                        };

                        try {
                            sessionStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {}

                        try {
                            localStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {
                            console.warn("Could not save pending_quotation_project to localStorage:", e);
                        }

                        // Also set pending_load_quotation as a guaranteed cross-page fallback
                        try {
                            const loadQuotationFallback = {
                                docType: 'quotation',
                                projectId: this.currentProjectId,
                                toCompany: proj.institution || '',
                                toAddress: proj.address || instDetails.address || '',
                                toAttn: proj.teacher || proj.attn || instDetails.contact || '',
                                toTel: proj.tel || instDetails.phone || '',
                                toEmail: proj.email || instDetails.email || '',
                                toTaxId: proj.taxId || instDetails.taxId || '',
                                items: cleanItems,
                                shop: '',
                                timestamp: Date.now()
                            };
                            localStorage.setItem('pending_load_quotation', JSON.stringify(loadQuotationFallback));
                        } catch(e) {}

                        // Also cache full projects list without heavy images
                        try {
                            const lightProjects = this.projects.map(p => {
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

                        // Ensure latest data is synced to Firestore (await with short timeout so navigation does not cancel the request)
                        if (window.saveProjectToFirestore) {
                            try {
                                await Promise.race([
                                    window.saveProjectToFirestore(proj),
                                    new Promise(r => setTimeout(r, 400))
                                ]);
                            } catch(e) {
                                console.warn('Sync on openQuotation error:', e);
                            }
                        }
                    }
                    let taxParam = '';
                    const instTax = (proj?.taxId || instDetails?.taxId || '').trim();
                    if (instTax) {
                        taxParam = `&taxId=${encodeURIComponent(instTax)}`;
                    }
                    window.location.href = typeof getDeptUrl === 'function' ? getDeptUrl(`quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school${taxParam}`) : `../accounting/quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school${taxParam}`;
                }
            },

            // =============================================
            // WORKFLOW STEPPER & ACTIVITY LOG
            // =============================================

            _ensureDocWorkflow(proj) {
                if (!proj.docWorkflow) {
                    proj.docWorkflow = {
                        currentStep: 1,
                        quotation: { status: 'draft', confirmedAt: null, confirmedBy: null, docNumber: '' },
                        invoice: { status: 'pending', createdAt: null, confirmedAt: null, confirmedBy: null, docNumber: null },
                        receipt: { status: 'pending', createdAt: null, confirmedAt: null, confirmedBy: null, docNumber: null }
                    };
                }
                if (proj.docWorkflow.quotation && proj.docWorkflow.quotation.docNumber && proj.docWorkflow.quotation.docNumber.includes('PRJ')) {
                    proj.docWorkflow.quotation.docNumber = '';
                }
                if (proj.docWorkflow.invoice && proj.docWorkflow.invoice.docNumber && proj.docWorkflow.invoice.docNumber.includes('PRJ')) {
                    proj.docWorkflow.invoice.docNumber = '';
                }
                if (proj.docWorkflow.receipt && proj.docWorkflow.receipt.docNumber && proj.docWorkflow.receipt.docNumber.includes('PRJ')) {
                    proj.docWorkflow.receipt.docNumber = '';
                }
                if (!proj.activityLog) proj.activityLog = [];
                return proj;
            },

            addActivityLog(proj, action, details, icon) {
                if (!proj.activityLog) proj.activityLog = [];
                const userNameEl = document.getElementById('userName');
                const userName = userNameEl ? userNameEl.innerText : 'ระบบ';
                proj.activityLog.unshift({
                    action: action,
                    details: details,
                    icon: icon || 'fa-solid fa-circle-info',
                    timestamp: new Date().toISOString(),
                    user: userName
                });
                // Keep max 200 entries
                if (proj.activityLog.length > 200) proj.activityLog = proj.activityLog.slice(0, 200);
            },

            getProjectWorkflowBadge(proj) {
                if (!proj) return '';
                this._ensureDocWorkflow(proj);
                const wf = proj.docWorkflow;
                const isCompleted = !!wf.isCompleted || (wf.receipt && wf.receipt.status === 'confirmed');

                let effectiveStep = wf.currentStep || 1;
                if (isCompleted) {
                    effectiveStep = 4;
                } else if (effectiveStep === 1 && wf.quotation && wf.quotation.status === 'confirmed') {
                    effectiveStep = 2;
                } else if (effectiveStep === 2 && wf.invoice && wf.invoice.status === 'confirmed') {
                    effectiveStep = 3;
                }

                const s1State = (isCompleted || effectiveStep > 1) ? 'completed' : (effectiveStep === 1 ? 'active' : 'pending');
                const s2State = (isCompleted || effectiveStep > 2) ? 'completed' : (effectiveStep === 2 ? 'active' : 'pending');
                const s3State = isCompleted ? 'completed' : (effectiveStep === 3 ? 'active' : 'pending');

                const renderStepItem = (num, label, state, tooltip) => {
                    if (state === 'active') {
                        return `
                            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50/90 border border-blue-200/90 rounded-xl shadow-xs transition-all shrink-0" title="${tooltip}">
                                <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">${num}</span>
                                <span class="text-xs font-bold text-blue-900 whitespace-nowrap">${label}</span>
                            </div>
                        `;
                    } else if (state === 'completed') {
                        return `
                            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 border border-emerald-200/80 rounded-xl shadow-2xs transition-all shrink-0" title="${tooltip}">
                                <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0">
                                    <i class="fa-solid fa-check"></i>
                                </span>
                                <span class="text-xs font-semibold text-emerald-800 whitespace-nowrap">${label}</span>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="inline-flex items-center gap-1.5 px-2 py-1 text-slate-400 select-none transition-all shrink-0" title="${tooltip}">
                                <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center font-bold text-[11px] shrink-0">${num}</span>
                                <span class="text-xs font-medium text-slate-400 whitespace-nowrap">${label}</span>
                            </div>
                        `;
                    }
                };

                const renderArrow = (isDone) => {
                    const strokeClass = isDone ? 'text-emerald-400' : 'text-slate-300';
                    return `
                        <div class="inline-flex items-center ${strokeClass} px-0.5 sm:px-1 select-none shrink-0" aria-hidden="true">
                            <svg class="w-5 sm:w-7 h-2.5" viewBox="0 0 28 10" fill="none" stroke="currentColor">
                                <path d="M0 5h23M19 1l4 4-4 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    `;
                };

                const s1Tooltip = s1State === 'completed' ? 'ขั้นตอนที่ 1: ใบเสนอราคา (ยืนยันแล้ว ✓)' : (s1State === 'active' ? 'ขั้นตอนที่ 1: กำลังทำใบเสนอราคา' : 'ขั้นตอนที่ 1: ใบเสนอราคา');
                const s2Tooltip = s2State === 'completed' ? 'ขั้นตอนที่ 2: ใบส่งของ/ใบแจ้งหนี้ (ยืนยันแล้ว ✓)' : (s2State === 'active' ? 'ขั้นตอนที่ 2: กำลังทำใบส่งของ/ใบแจ้งหนี้' : 'ขั้นตอนที่ 2: ใบส่งของ/ใบแจ้งหนี้');
                const s3Tooltip = s3State === 'completed' ? 'ขั้นตอนที่ 3: ใบเสร็จรับเงิน (เสร็จสมบูรณ์ ✓)' : (s3State === 'active' ? 'ขั้นตอนที่ 3: กำลังทำใบเสร็จรับเงิน' : 'ขั้นตอนที่ 3: ใบเสร็จรับเงิน');

                return `
                    <div class="workflow-stepper-mini inline-flex items-center flex-wrap sm:flex-nowrap gap-1 sm:gap-1.5 py-0.5">
                        ${renderStepItem(1, 'ใบเสนอราคา', s1State, s1Tooltip)}
                        ${renderArrow(s1State === 'completed')}
                        ${renderStepItem(2, 'ใบส่งของ/ใบแจ้งหนี้', s2State, s2Tooltip)}
                        ${renderArrow(s2State === 'completed')}
                        ${renderStepItem(3, 'ใบเสร็จรับเงิน', s3State, s3Tooltip)}
                        ${isCompleted ? `
                            <span class="ml-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 whitespace-nowrap shadow-2xs">
                                <i class="fa-solid fa-circle-check text-emerald-600"></i> เสร็จสมบูรณ์
                            </span>
                        ` : ''}
                    </div>
                `;
            },

            updateWorkflowUI(proj) {
                this._ensureDocWorkflow(proj);
                const wf = proj.docWorkflow;
                const step = wf.currentStep || 1;
                const isCompleted = !!wf.isCompleted || (wf.receipt && wf.receipt.status === 'confirmed');

                // Update stepper visual
                for (let i = 1; i <= 3; i++) {
                    const stepEl = document.getElementById(`wf-step-${i}`);
                    const statusEl = document.getElementById(`wf-status-${i}`);
                    if (!stepEl) continue;

                    stepEl.classList.remove('active', 'completed', 'disabled');
                    if (isCompleted || i < step) {
                        stepEl.classList.add('completed');
                        if (statusEl) statusEl.textContent = 'ยืนยันแล้ว ✓';
                    } else if (i === step) {
                        stepEl.classList.add('active');
                        if (statusEl) statusEl.textContent = 'กำลังดำเนินการ';
                    } else {
                        stepEl.classList.add('disabled');
                        if (statusEl) statusEl.textContent = 'รอดำเนินการ';
                    }
                }
                // Connectors
                const conn1 = document.getElementById('wf-connector-1');
                const conn2 = document.getElementById('wf-connector-2');
                if (conn1) conn1.classList.toggle('completed', isCompleted || step > 1);
                if (conn2) conn2.classList.toggle('completed', isCompleted || step > 2);

                // Smart Action Buttons in Header
                const mainBtn = document.getElementById('btn-main-workflow-doc');
                const mainBtnIcon = document.getElementById('btn-main-workflow-icon');
                const mainBtnText = document.getElementById('btn-main-workflow-text');
                const confirmBtn = document.getElementById('btn-confirm-workflow-step');
                const confirmBtnText = document.getElementById('btn-confirm-workflow-text');
                const viewPrevBtn = document.getElementById('btn-view-previous-step');
                const viewPrevText = document.getElementById('btn-view-previous-text');
                const cancelBtn = document.getElementById('btn-cancel-quotation');
                const cancelBtnText = document.getElementById('btn-cancel-quotation-text');

                if (mainBtn && mainBtnText && mainBtnIcon) {
                    if (isCompleted) {
                        mainBtnIcon.className = 'fa-solid fa-circle-check text-emerald-500';
                        mainBtnText.textContent = 'ดูเอกสาร (เสร็จสมบูรณ์)';
                        mainBtn.title = 'ดูใบเสร็จรับเงินและเอกสารทั้งหมด';
                    } else if (step === 3) {
                        mainBtnIcon.className = 'fa-solid fa-receipt text-purple-600';
                        mainBtnText.textContent = 'ออกใบเสร็จรับเงิน';
                        mainBtn.title = 'ไปยังขั้นตอนที่ 3: ใบเสร็จรับเงิน';
                    } else if (step === 2) {
                        mainBtnIcon.className = 'fa-solid fa-file-invoice text-blue-600';
                        mainBtnText.textContent = 'ออกใบส่งของ/ใบแจ้งหนี้';
                        mainBtn.title = 'ไปยังขั้นตอนที่ 2: ใบส่งของ/ใบแจ้งหนี้';
                    } else {
                        mainBtnIcon.className = 'fa-solid fa-file-invoice-dollar text-brand-600';
                        mainBtnText.textContent = wf.quotation?.status === 'confirmed' ? 'ดูใบเสนอราคา' : 'ออกใบเสนอราคา';
                        mainBtn.title = 'ไปยังขั้นตอนที่ 1: ใบเสนอราคา';
                    }
                }

                if (confirmBtn && confirmBtnText) {
                    if (isCompleted) {
                        confirmBtn.classList.add('hidden');
                    } else if (step === 3) {
                        confirmBtn.classList.remove('hidden');
                        confirmBtnText.textContent = 'ยืนยันใบเสร็จ (เสร็จสมบูรณ์)';
                    } else if (step === 2) {
                        confirmBtn.classList.remove('hidden');
                        confirmBtnText.textContent = 'ยืนยันใบส่งของ/แจ้งหนี้';
                    } else {
                        confirmBtn.classList.toggle('hidden', wf.quotation?.status === 'confirmed');
                        confirmBtnText.textContent = 'ยืนยันใบเสนอราคา';
                    }
                }

                if (viewPrevBtn && viewPrevText) {
                    if (step === 2) {
                        viewPrevBtn.classList.remove('hidden');
                        viewPrevText.textContent = 'ดูใบเสนอราคา (ล็อค)';
                    } else if (step === 3 || isCompleted) {
                        viewPrevBtn.classList.remove('hidden');
                        viewPrevText.textContent = 'ดูใบส่งของ (ล็อค)';
                    } else {
                        viewPrevBtn.classList.add('hidden');
                    }
                }

                if (cancelBtn) {
                    if (isCompleted || step === 3 || step === 2 || wf.quotation?.status === 'confirmed') {
                        cancelBtn.classList.remove('hidden');
                        if (cancelBtnText) cancelBtnText.textContent = 'ย้อนกลับ/รีเซ็ต (PIN)';
                        cancelBtn.title = 'ย้อนกลับขั้นตอน หรือ รีเซ็ตกระบวนการทั้งหมด (ต้องใช้รหัส PIN 1234)';
                    } else {
                        cancelBtn.classList.add('hidden');
                    }
                }

                // Update badge
                const badge = document.getElementById('activity-count-badge');
                if (badge) badge.textContent = (proj.activityLog || []).length;
            },

            handleMainWorkflowAction() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);
                const step = proj.docWorkflow.currentStep || 1;

                if (step === 1) {
                    this.openQuotationForProject();
                } else if (step === 2) {
                    this.goToInvoice();
                } else if (step === 3 || proj.docWorkflow.isCompleted) {
                    this.goToReceipt();
                }
            },

            handleWorkflowStepConfirm() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);
                const step = proj.docWorkflow.currentStep || 1;

                if (step === 1) {
                    this.confirmQuotation();
                } else if (step === 2) {
                    this.confirmInvoice();
                } else if (step === 3) {
                    this.confirmReceipt();
                }
            },

            openPreviousConfirmedDoc() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);
                const step = proj.docWorkflow.currentStep || 1;
                const dt = step === 2 ? 'quotation' : 'invoice';
                let shopParam = '';
                const shopName = this.getProjectShopName(proj);
                if (shopName) shopParam = `&shop=${encodeURIComponent(shopName)}`;

                window.location.href = typeof getDeptUrl === 'function' ? getDeptUrl(`quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=${dt}&viewOnly=true${shopParam}`) : `../accounting/quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=${dt}&viewOnly=true${shopParam}`;
            },

            async verifyWorkflowSecurityPin(actionDesc = 'ย้อนกลับขั้นตอนเอกสาร') {
                if (typeof Swal === 'undefined') {
                    const pin = prompt(`กรุณากรอกรหัสความปลอดภัย (Security PIN) 4 หลัก เพื่อ${actionDesc}:`);
                    return pin === '1234';
                }
                const { value: pin } = await Swal.fire({
                    title: '🔐 รหัสความปลอดภัย (PIN)',
                    html: `กรุณากรอกรหัสความปลอดภัย 4 หลัก เพื่อ<b>${actionDesc}</b><br><small style="color:#64748b;">(การย้อนกลับขั้นตอนจะมีผลต่อการออกเอกสารทางการ)</small>`,
                    input: 'password',
                    inputPlaceholder: 'กรอกรหัส PIN 4 หลัก',
                    inputAttributes: {
                        maxlength: '4',
                        autocapitalize: 'off',
                        autocorrect: 'off',
                        style: 'letter-spacing: 0.5em; text-align: center; font-size: 1.6rem; font-weight: bold;'
                    },
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'ยืนยันรหัส PIN',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#2563eb',
                    cancelButtonColor: '#64748b',
                    customClass: { popup: 'mentra-swal-popup' },
                    preConfirm: (val) => {
                        if (!val) {
                            Swal.showValidationMessage('กรุณากรอกรหัสความปลอดภัย');
                            return false;
                        }
                        if (val !== '1234') {
                            Swal.showValidationMessage('❌ รหัสความปลอดภัยไม่ถูกต้อง (PIN คือ 1234)');
                            return false;
                        }
                        return val;
                    }
                });
                return pin === '1234';
            },

            async cancelStepConfirmation() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);
                const step = proj.docWorkflow.currentStep || 1;

                if (step === 1 && proj.docWorkflow.quotation.status !== 'confirmed') {
                    this.showToast('ใบเสนอราคายังไม่ได้ยืนยัน ยังอยู่ที่ขั้นตอนเริ่มต้น', 'info');
                    return;
                }

                const prevStepName = (step === 3 || proj.docWorkflow.isCompleted) ? 'ใบส่งของ/ใบแจ้งหนี้ (ขั้นที่ 2)' : 'ใบเสนอราคา (ขั้นที่ 1)';

                if (typeof Swal === 'undefined') {
                    const pin = prompt(`กรุณากรอกรหัสความปลอดภัย PIN เพื่อย้อนกลับหรือรีเซ็ตขั้นตอน:`);
                    if (pin !== '1234') {
                        alert('❌ รหัสความปลอดภัยไม่ถูกต้อง');
                        return;
                    }
                    if (confirm(`ต้องการย้อนกลับ 1 ขั้นตอนหรือไม่? (กดยกเลิกเพื่อรีเซ็ตทั้งหมด)`)) {
                        if (step === 3 || proj.docWorkflow.isCompleted) {
                            proj.docWorkflow.receipt.status = 'pending';
                            proj.docWorkflow.invoice.status = 'draft';
                            proj.docWorkflow.currentStep = 2;
                            proj.docWorkflow.isCompleted = false;
                        } else if (step === 2) {
                            proj.docWorkflow.invoice.status = 'pending';
                            proj.docWorkflow.quotation.status = 'draft';
                            proj.docWorkflow.currentStep = 1;
                        }
                    } else {
                        proj.docWorkflow.quotation.status = 'draft';
                        proj.docWorkflow.quotation.confirmedAt = null;
                        proj.docWorkflow.invoice = { status: 'pending', confirmedAt: null, confirmedBy: null, docNumber: '' };
                        proj.docWorkflow.receipt = { status: 'pending', confirmedAt: null, confirmedBy: null, docNumber: '' };
                        proj.docWorkflow.currentStep = 1;
                        proj.docWorkflow.isCompleted = false;
                    }
                    this.syncCurrentProject();
                    this.updateWorkflowUI(proj);
                    return;
                }

                const { value: formValues } = await Swal.fire({
                    title: '🔐 จัดการกระบวนการเอกสาร (Security PIN)',
                    html: `
                        <div style="text-align:left; font-size:0.92rem; color:#475569; margin-bottom:12px;">
                            เลือกการกระทำที่ต้องการสำหรับโครงการนี้:
                        </div>
                        <div style="text-align:left; margin-bottom:16px; display:flex; flex-direction:column; gap:8px;">
                            <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px;">
                                <input type="radio" name="wf_action_school" value="rollback_one" checked style="margin-top:3px;">
                                <div>
                                    <b style="color:#1e293b;">ย้อนกลับ 1 ขั้นตอน</b><br>
                                    <span style="font-size:0.82rem; color:#64748b;">ย้อนกลับไปแก้ไข ${prevStepName}</span>
                                </div>
                            </label>
                            <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:10px;">
                                <input type="radio" name="wf_action_school" value="reset_all" style="margin-top:3px;">
                                <div>
                                    <b style="color:#b91c1c;">รีเซ็ตกระบวนการทั้งหมด (เริ่มใหม่)</b><br>
                                    <span style="font-size:0.82rem; color:#64748b;">รีเซ็ตทุกขั้นตอนกลับไปเริ่มต้นที่ใบเสนอราคา (ขั้นที่ 1)</span>
                                </div>
                            </label>
                        </div>
                        <div style="text-align:left; font-size:0.88rem; font-weight:600; color:#334155; margin-bottom:6px;">
                            ใส่รหัสความปลอดภัย (Security PIN 4 หลัก):
                        </div>
                        <input id="swal_wf_school_pin" type="password" maxlength="4" placeholder="••••"
                            style="width:100%; text-align:center; font-size:1.6rem; letter-spacing:0.5em; padding:8px; border:2px solid #cbd5e1; border-radius:8px; outline:none; font-family:monospace;"
                            onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'">
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'ยืนยันดำเนินการ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#2563eb',
                    cancelButtonColor: '#64748b',
                    customClass: { popup: 'mentra-swal-popup' },
                    focusConfirm: false,
                    preConfirm: () => {
                        const selectedAction = document.querySelector('input[name="wf_action_school"]:checked')?.value || 'rollback_one';
                        const pinInput = document.getElementById('swal_wf_school_pin')?.value;
                        if (!pinInput) {
                            Swal.showValidationMessage('กรุณากรอกรหัสความปลอดภัย 4 หลัก');
                            return false;
                        }
                        if (pinInput !== '1234') {
                            Swal.showValidationMessage('❌ รหัสความปลอดภัยไม่ถูกต้อง (PIN คือ 1234)');
                            return false;
                        }
                        return { action: selectedAction, pin: pinInput };
                    }
                });

                if (!formValues) return;

                if (formValues.action === 'reset_all') {
                    proj.docWorkflow.quotation.status = 'draft';
                    proj.docWorkflow.quotation.confirmedAt = null;
                    proj.docWorkflow.quotation.confirmedBy = null;
                    proj.docWorkflow.invoice = { status: 'pending', confirmedAt: null, confirmedBy: null, docNumber: '' };
                    proj.docWorkflow.receipt = { status: 'pending', confirmedAt: null, confirmedBy: null, docNumber: '' };
                    proj.docWorkflow.currentStep = 1;
                    proj.docWorkflow.isCompleted = false;

                    this.addActivityLog(proj, 'workflow_reset_all', `รีเซ็ตกระบวนการเอกสารทั้งหมดกลับสู่ขั้นตอนที่ 1 ใบเสนอราคา (ผ่าน PIN)`, 'fa-solid fa-rotate-left');
                    this.syncCurrentProject();
                    this.updateWorkflowUI(proj);
                    this.showToast('รีเซ็ตกระบวนการทั้งหมดกลับไปเริ่มต้นที่ใบเสนอราคาแล้ว', 'success');
                } else {
                    if (step === 3 || proj.docWorkflow.isCompleted) {
                        proj.docWorkflow.receipt.status = 'pending';
                        proj.docWorkflow.invoice.status = 'draft';
                        proj.docWorkflow.currentStep = 2;
                        proj.docWorkflow.isCompleted = false;
                        this.addActivityLog(proj, 'invoice_uncancelled', `ยกเลิกการยืนยันใบส่งของ (${proj.docWorkflow.invoice.docNumber || ''}) ย้อนกลับมาขั้นตอนที่ 2 (ผ่าน PIN)`, 'fa-solid fa-rotate-left');
                    } else if (step === 2) {
                        proj.docWorkflow.invoice.status = 'pending';
                        proj.docWorkflow.quotation.status = 'draft';
                        proj.docWorkflow.currentStep = 1;
                        this.addActivityLog(proj, 'quotation_uncancelled', `ยกเลิกการยืนยันใบเสนอราคา (${proj.docWorkflow.quotation.docNumber || ''}) ย้อนกลับมาขั้นตอนที่ 1 (ผ่าน PIN)`, 'fa-solid fa-rotate-left');
                    }
                    this.syncCurrentProject();
                    this.updateWorkflowUI(proj);
                    this.showToast('ย้อนกลับขั้นตอนเรียบร้อย สามารถแก้ไขเอกสารได้แล้ว', 'success');
                }
            },

            cancelQuotationConfirmation() {
                this.cancelStepConfirmation();
            },

            confirmQuotation() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);

                if (proj.docWorkflow.quotation.status === 'confirmed') {
                    this.showToast('ใบเสนอราคายืนยันแล้ว กดไปหน้า Invoice ได้เลย', 'info');
                    return;
                }

                Swal.fire({
                    title: 'ยืนยันใบเสนอราคา?',
                    html: '<p style="color:#64748b;">เมื่อยืนยันแล้ว ระบบจะเปิดขั้นตอน<br><b>"ใบส่งของ / ใบแจ้งหนี้"</b> ให้อัตโนมัติ<br><br><small style="color:#94a3b8;">เอกสารใบเสนอราคาจะถูกล็อคเป็นทางการ</small></p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fa-solid fa-circle-check"></i> ยืนยัน',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#10b981',
                    customClass: { popup: 'mentra-swal-popup' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const now = new Date().toISOString();
                        proj.docWorkflow.quotation.status = 'confirmed';
                        proj.docWorkflow.quotation.confirmedAt = now;
                        const userEl = document.getElementById('userName');
                        proj.docWorkflow.quotation.confirmedBy = userEl ? userEl.innerText : 'ระบบ';
                        const d = new Date();
                        const yy = d.getFullYear().toString().slice(-2);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const seq1 = String(Math.floor(Math.random() * 900) + 100);
                        const seq2 = String(Math.floor(Math.random() * 900) + 100);
                        if (!proj.docWorkflow.quotation.docNumber) {
                            proj.docWorkflow.quotation.docNumber = `MTQ${yy}${mm}${dd}${seq1}`;
                        }
                        proj.docWorkflow.currentStep = 2;
                        proj.docWorkflow.invoice.status = 'draft';
                        proj.docWorkflow.invoice.createdAt = now;
                        proj.docWorkflow.invoice.parentRef = proj.docWorkflow.quotation.docNumber;
                        if (!proj.docWorkflow.invoice.docNumber) {
                            const qRef = proj.docWorkflow.quotation.docNumber || '';
                            const qSuffix = qRef.replace(/^(?:MT[A-Z]|REC|INV|QT)[-_]?/i, '');
                            proj.docWorkflow.invoice.docNumber = qSuffix ? `MTI${qSuffix}` : `MTI${yy}${mm}${dd}${seq2}`;
                        }

                        this.addActivityLog(proj, 'quotation_confirmed', `ยืนยันใบเสนอราคา (${proj.docWorkflow.quotation.docNumber})`, 'fa-solid fa-circle-check');
                        this.addActivityLog(proj, 'invoice_created', `เปิดขั้นตอนใบส่งของ/ใบแจ้งหนี้ (${proj.docWorkflow.invoice.docNumber}) (อ้างอิง: ${proj.docWorkflow.invoice.parentRef})`, 'fa-solid fa-file-invoice');

                        this.syncCurrentProject();
                        this.updateWorkflowUI(proj);
                        
                        if (window.TelegramService) {
                            try {
                                const totalAmt = (proj.items || []).reduce((sum, it) => sum + ((Number(it.qty) || 1) * (Number(it.unitPrice) || Number(it.targetPrice) || 0)), 0);
                                window.TelegramService.sendQuotationAlert({
                                    refNo: proj.docWorkflow.quotation.docNumber,
                                    toCompany: proj.institution || proj.name || 'โครงการ',
                                    issuer: this.getProjectShopName(proj),
                                    grandTotal: totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                    itemsCount: (proj.items || []).length,
                                    signer: userEl ? userEl.innerText : 'ระบบ'
                                });
                            } catch (e) {
                                console.warn('[Telegram] Could not send quotation alert:', e);
                            }
                        }
                        
                        Swal.fire({
                            title: 'ยืนยันใบเสนอราคาเรียบร้อย!',
                            html: 'ระบบเปิดขั้นตอน <b>"ใบส่งของ / ใบแจ้งหนี้"</b> ให้แล้ว',
                            icon: 'success',
                            confirmButtonText: 'ไปออกใบส่งของทันที',
                            showCancelButton: true,
                            cancelButtonText: 'ปิดหน้าต่าง',
                            confirmButtonColor: '#10b981',
                            customClass: { popup: 'mentra-swal-popup' }
                        }).then((goToNext) => {
                            if (goToNext.isConfirmed) {
                                this.goToInvoice();
                            }
                        });
                    }
                });
            },

            confirmInvoice() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);

                if (proj.docWorkflow.invoice.status === 'confirmed') {
                    this.showToast('ใบส่งของ/แจ้งหนี้ยืนยันแล้ว สามารถไปขั้นตอนใบเสร็จได้เลย', 'info');
                    return;
                }

                Swal.fire({
                    title: 'ยืนยันใบส่งของ / ใบแจ้งหนี้?',
                    html: '<p style="color:#64748b;">เมื่อยืนยันแล้ว ระบบจะเปิดขั้นตอน<br><b>"ใบเสร็จรับเงิน / ใบกำกับภาษี"</b> ให้อัตโนมัติ<br><br><small style="color:#94a3b8;">เอกสารใบส่งของจะถูกล็อคเป็นทางการ</small></p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fa-solid fa-circle-check"></i> ยืนยัน',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#10b981',
                    customClass: { popup: 'mentra-swal-popup' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const now = new Date().toISOString();
                        proj.docWorkflow.invoice.status = 'confirmed';
                        proj.docWorkflow.invoice.confirmedAt = now;
                        const userEl = document.getElementById('userName');
                        proj.docWorkflow.invoice.confirmedBy = userEl ? userEl.innerText : 'ระบบ';
                        const d = new Date();
                        const yy = d.getFullYear().toString().slice(-2);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const seq1 = String(Math.floor(Math.random() * 900) + 100);
                        const seq2 = String(Math.floor(Math.random() * 900) + 100);
                        if (!proj.docWorkflow.invoice.docNumber) {
                            const qRef = proj.docWorkflow.quotation?.docNumber || '';
                            const qSuffix = qRef.replace(/^(?:MT[A-Z]|REC|INV|QT)[-_]?/i, '');
                            proj.docWorkflow.invoice.docNumber = qSuffix ? `MTI${qSuffix}` : `MTI${yy}${mm}${dd}${seq1}`;
                        }
                        proj.docWorkflow.currentStep = 3;
                        proj.docWorkflow.receipt.status = 'draft';
                        proj.docWorkflow.receipt.createdAt = now;
                        proj.docWorkflow.receipt.parentRef = proj.docWorkflow.invoice.docNumber;
                        if (!proj.docWorkflow.receipt.docNumber) {
                            const iRef = proj.docWorkflow.invoice.docNumber || proj.docWorkflow.quotation?.docNumber || '';
                            const iSuffix = iRef.replace(/^(?:MT[A-Z]|REC|INV|QT)[-_]?/i, '');
                            proj.docWorkflow.receipt.docNumber = iSuffix ? `MTR${iSuffix}` : `MTR${yy}${mm}${dd}${seq2}`;
                        }

                        this.addActivityLog(proj, 'invoice_confirmed', `ยืนยันใบส่งของ/ใบแจ้งหนี้ (${proj.docWorkflow.invoice.docNumber})`, 'fa-solid fa-circle-check');
                        this.addActivityLog(proj, 'receipt_created', `เปิดขั้นตอนใบเสร็จรับเงิน (${proj.docWorkflow.receipt.docNumber}) (อ้างอิง: ${proj.docWorkflow.receipt.parentRef})`, 'fa-solid fa-receipt');

                        this.syncCurrentProject();
                        this.updateWorkflowUI(proj);

                        Swal.fire({
                            title: 'ยืนยันใบส่งของเรียบร้อย!',
                            html: 'ระบบเปิดขั้นตอน <b>"ใบเสร็จรับเงิน"</b> ให้เรียบร้อยแล้ว',
                            icon: 'success',
                            confirmButtonText: 'ไปออกใบเสร็จรับเงินทันที',
                            showCancelButton: true,
                            cancelButtonText: 'ปิดหน้าต่าง',
                            confirmButtonColor: '#10b981',
                            customClass: { popup: 'mentra-swal-popup' }
                        }).then((goToNext) => {
                            if (goToNext.isConfirmed) {
                                this.goToReceipt();
                            }
                        });
                    }
                });
            },

            confirmReceipt() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);

                if (proj.docWorkflow.receipt.status === 'confirmed' || proj.docWorkflow.isCompleted) {
                    this.showToast('ใบเสร็จรับเงินยืนยันแล้ว เอกสารสมบูรณ์ครบ 3 ขั้นตอน', 'info');
                    return;
                }

                Swal.fire({
                    title: 'ยืนยันใบเสร็จรับเงิน (เสร็จสิ้น)?',
                    html: '<p style="color:#64748b;">ยืนยันการรับชำระเงินและปิดขั้นตอนเอกสารทั้งหมด<br><br><small style="color:#10b981; font-weight:600;">(ใบเสนอราคา → ใบส่งของ → ใบเสร็จรับเงิน สมบูรณ์ครบถ้วน)</small></p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fa-solid fa-circle-check"></i> ยืนยันเสร็จสมบูรณ์',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#10b981',
                    customClass: { popup: 'mentra-swal-popup' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const now = new Date().toISOString();
                        proj.docWorkflow.receipt.status = 'confirmed';
                        proj.docWorkflow.receipt.confirmedAt = now;
                        const userEl = document.getElementById('userName');
                        proj.docWorkflow.receipt.confirmedBy = userEl ? userEl.innerText : 'ระบบ';
                        if (!proj.docWorkflow.receipt.docNumber) {
                            const iRef = proj.docWorkflow.invoice?.docNumber || proj.docWorkflow.quotation?.docNumber || '';
                            const iSuffix = iRef.replace(/^(?:MT[A-Z]|REC|INV|QT)[-_]?/i, '');
                            proj.docWorkflow.receipt.docNumber = iSuffix ? `MTR${iSuffix}` : `MTR${yy}${mm}${dd}${seq1}`;
                        }
                        proj.docWorkflow.isCompleted = true;

                        this.addActivityLog(proj, 'receipt_confirmed', `ยืนยันใบเสร็จรับเงิน (${proj.docWorkflow.receipt.docNumber}) - เสร็จสมบูรณ์ครบ 3 ขั้นตอน`, 'fa-solid fa-circle-check');

                        this.syncCurrentProject();
                        this.updateWorkflowUI(proj);

                        Swal.fire({
                            title: '🎉 กระบวนการเสร็จสมบูรณ์!',
                            text: 'เอกสารโครงการออกครบถ้วนสมบูรณ์ทั้ง 3 ขั้นตอนแล้ว',
                            icon: 'success',
                            confirmButtonText: 'ตกลง',
                            confirmButtonColor: '#10b981',
                            customClass: { popup: 'mentra-swal-popup' }
                        });
                    }
                });
            },

            onWorkflowStepClick(stepNum) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                this._ensureDocWorkflow(proj);
                const currentStep = proj.docWorkflow.isCompleted ? 3 : (proj.docWorkflow.currentStep || 1);

                // 1. Block skipping forward
                if (stepNum > currentStep) {
                    const stepTitles = ['', 'ใบเสนอราคา', 'ใบส่งของ/ใบแจ้งหนี้', 'ใบเสร็จรับเงิน'];
                    Swal.fire({
                        title: 'ยังไม่ถึงขั้นตอนนี้',
                        html: `กรุณาดำเนินการและยืนยันขั้นตอนที่ ${currentStep} (${stepTitles[currentStep]}) ให้เรียบร้อยก่อน`,
                        icon: 'warning',
                        confirmButtonColor: '#1A6FBF',
                        confirmButtonText: 'เข้าใจแล้ว'
                    });
                    return;
                }

                // 2. Prevent accidental reversion / Prompt read-only view
                if (stepNum < currentStep) {
                    const stepTitles = ['', 'ใบเสนอราคา', 'ใบส่งของ/ใบแจ้งหนี้', 'ใบเสร็จรับเงิน'];
                    const dtNames = ['', 'quotation', 'invoice', 'receipt'];
                    Swal.fire({
                        title: '🔒 เอกสารขั้นตอนนี้ได้รับการยืนยันแล้ว',
                        html: `<div style="text-align:left; font-size:0.95rem; line-height:1.6; color:#475569;">
                            ขั้นตอน <b>"${stepTitles[stepNum]}"</b> ได้รับการยืนยันและส่งต่อไปยังขั้นตอนถัดไปแล้ว<br><br>
                            <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; color:#92400e; font-size:0.88rem;">
                                <i class="fa-solid fa-lock" style="margin-right:6px;"></i>
                                <b>เพื่อความถูกต้องทางบัญชี:</b><br>
                                ระบบจะเปิดเอกสารนี้ในโหมด <b>"อ่านอย่างเดียว (Locked)"</b> เพื่อตรวจทานหรือสั่งพิมพ์เท่านั้น<br>
                                หากต้องการแก้ไข ให้กด <b>"ปลดล็อคแก้ไข (PIN)"</b> เพื่อย้อนกลับมาขั้นตอนนี้
                            </div>
                        </div>`,
                        icon: 'info',
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: '<i class="fa-regular fa-eye"></i> ดูเอกสาร (อ่านอย่างเดียว)',
                        denyButtonText: '<i class="fa-solid fa-lock-open"></i> ปลดล็อคแก้ไข (PIN)',
                        cancelButtonText: 'ยกเลิก',
                        confirmButtonColor: '#1A6FBF',
                        denyButtonColor: '#d97706',
                        cancelButtonColor: '#64748b'
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            let shopParam = '';
                            const shopName = this.getProjectShopName(proj);
                            if (shopName) shopParam = `&shop=${encodeURIComponent(shopName)}`;
                            window.location.href = typeof getDeptUrl === 'function' ? getDeptUrl(`quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=${dtNames[stepNum]}&viewOnly=true${shopParam}`) : `../accounting/quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=${dtNames[stepNum]}&viewOnly=true${shopParam}`;
                        } else if (result.isDenied) {
                            const pinOk = await this.verifyWorkflowSecurityPin(`ย้อนกลับกระบวนการไปยัง ${stepTitles[stepNum]}`);
                            if (!pinOk) return;

                            if (stepNum === 1) {
                                proj.docWorkflow.receipt.status = 'pending';
                                proj.docWorkflow.invoice.status = 'pending';
                                proj.docWorkflow.quotation.status = 'draft';
                                proj.docWorkflow.currentStep = 1;
                                proj.docWorkflow.isCompleted = false;
                                this.addActivityLog(proj, 'workflow_rollback', `ย้อนกลับกระบวนการมายังขั้นตอนที่ 1 (ใบเสนอราคา) ผ่าน PIN`, 'fa-solid fa-rotate-left');
                            } else if (stepNum === 2) {
                                proj.docWorkflow.receipt.status = 'pending';
                                proj.docWorkflow.invoice.status = 'draft';
                                proj.docWorkflow.currentStep = 2;
                                proj.docWorkflow.isCompleted = false;
                                this.addActivityLog(proj, 'workflow_rollback', `ย้อนกลับกระบวนการมายังขั้นตอนที่ 2 (ใบส่งของ/ใบแจ้งหนี้) ผ่าน PIN`, 'fa-solid fa-rotate-left');
                            }
                            this.syncCurrentProject();
                            this.updateWorkflowUI(proj);
                            this.showToast(`ย้อนกลับกระบวนการมายัง ${stepTitles[stepNum]} เรียบร้อยแล้ว`, 'success');
                        }
                    });
                    return;
                }

                // 3. Current active step
                if (stepNum === 1) {
                    this.openQuotationForProject();
                } else if (stepNum === 2) {
                    this.goToInvoice();
                } else if (stepNum === 3) {
                    this.goToReceipt();
                }
            },

            async goToInvoice() {
                if (this.currentProjectId) {
                    let proj = this.projects.find(p => String(p.id) === String(this.currentProjectId));
                    if (!proj) {
                        try {
                            const cached = localStorage.getItem('material_projects');
                            if (cached) {
                                const list = JSON.parse(cached);
                                if (Array.isArray(list)) proj = list.find(p => String(p.id) === String(this.currentProjectId));
                            }
                        } catch(e) {}
                    }

                    let shopParam = '';
                    let parentRefParam = '';
                    if (proj) {
                        const shopName = this.getProjectShopName(proj);
                        if (shopName) {
                            shopParam = `&shop=${encodeURIComponent(shopName)}`;
                        }
                        const rawItems = Array.isArray(proj.items) ? proj.items : (proj.items && typeof proj.items === 'object' ? Object.values(proj.items) : []);
                        const cleanItems = rawItems.map(it => ({
                            id: it.id,
                            isHeader: !!it.isHeader,
                            mainNo: it.mainNo !== undefined ? it.mainNo : '',
                            customNo: it.customNo || '',
                            name: it.name || it.desc || '',
                            desc: it.desc || it.name || '',
                            qty: Number(it.qty) || 1,
                            unit: it.unit || 'ชุด',
                            unitPrice: Number(it.unitPrice) || Number(it.targetPrice) || Number(it.foundPrice) || 0,
                            price: Number(it.unitPrice) || Number(it.targetPrice) || Number(it.foundPrice) || 0,
                            storeInfo: it.storeInfo || ''
                        }));

                        const parentRef = proj.docWorkflow?.invoice?.parentRef || proj.docWorkflow?.quotation?.docNumber || '';
                        if (parentRef) {
                            parentRefParam = `&parentRef=${encodeURIComponent(parentRef)}`;
                        }

                        const instDetails = (this.institutionDetails && proj.institution) ? (this.institutionDetails[proj.institution] || {}) : {};
                        const pendingData = {
                            source: 'school',
                            projectId: this.currentProjectId,
                            institution: proj.institution || '',
                            items: cleanItems,
                            company: (proj.company && proj.company !== proj.institution) ? proj.company : (shopName || ''),
                            shop: shopName,
                            name: proj.name || '',
                            code: proj.code || '',
                            parentRefNo: parentRef,
                            address: proj.address || instDetails.address || '',
                            attn: proj.teacher || proj.attn || instDetails.contact || '',
                            tel: proj.tel || instDetails.phone || '',
                            email: proj.email || instDetails.email || '',
                            taxId: proj.taxId || instDetails.taxId || '',
                            discountType: proj.discountType || 'percent',
                            discountValue: proj.discountValue || 0,
                            timestamp: Date.now()
                        };

                        try {
                            sessionStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {}
                        try {
                            localStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {}

                        // Also set pending_load_quotation as a guaranteed cross-page fallback
                        try {
                            const loadInvoiceFallback = {
                                docType: 'invoice',
                                projectId: this.currentProjectId,
                                toCompany: proj.institution || '',
                                toAddress: proj.address || instDetails.address || '',
                                toAttn: proj.teacher || proj.attn || instDetails.contact || '',
                                toTel: proj.tel || instDetails.phone || '',
                                toEmail: proj.email || instDetails.email || '',
                                toTaxId: proj.taxId || instDetails.taxId || '',
                                parentRefNo: parentRef,
                                items: cleanItems,
                                shop: shopName,
                                timestamp: Date.now()
                            };
                            localStorage.setItem('pending_load_quotation', JSON.stringify(loadInvoiceFallback));
                        } catch(e) {}

                        // Also cache full projects list without heavy images
                        try {
                            const lightProjects = this.projects.map(p => {
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

                        if (window.saveProjectToFirestore) {
                            window.saveProjectToFirestore(proj).catch(e => console.warn('Sync on goToInvoice error:', e));
                        }
                    }
                    const taxParam = (proj?.taxId || instDetails?.taxId) ? `&taxId=${encodeURIComponent((proj.taxId || instDetails.taxId).trim())}` : '';
                    window.location.href = typeof getDeptUrl === 'function' ? getDeptUrl(`quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=invoice${shopParam}${parentRefParam}${taxParam}`) : `../accounting/quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=invoice${shopParam}${parentRefParam}${taxParam}`;
                }
            },

            async goToReceipt() {
                if (this.currentProjectId) {
                    let proj = this.projects.find(p => String(p.id) === String(this.currentProjectId));
                    if (!proj) {
                        try {
                            const cached = localStorage.getItem('material_projects');
                            if (cached) {
                                const list = JSON.parse(cached);
                                if (Array.isArray(list)) proj = list.find(p => String(p.id) === String(this.currentProjectId));
                            }
                        } catch(e) {}
                    }

                    let shopParam = '';
                    let parentRefParam = '';
                    if (proj) {
                        const shopName = this.getProjectShopName(proj);
                        if (shopName) {
                            shopParam = `&shop=${encodeURIComponent(shopName)}`;
                        }
                        const parentRef = proj.docWorkflow?.receipt?.parentRef || proj.docWorkflow?.invoice?.docNumber || '';
                        if (parentRef) {
                            parentRefParam = `&parentRef=${encodeURIComponent(parentRef)}`;
                        }
                        const rawItems = Array.isArray(proj.items) ? proj.items : (proj.items && typeof proj.items === 'object' ? Object.values(proj.items) : []);
                        const cleanItems = rawItems.map(it => ({
                            id: it.id,
                            isHeader: !!it.isHeader,
                            mainNo: it.mainNo !== undefined ? it.mainNo : '',
                            customNo: it.customNo || '',
                            name: it.name || it.desc || '',
                            desc: it.desc || it.name || '',
                            qty: Number(it.qty) || 1,
                            unit: it.unit || 'ชุด',
                            unitPrice: Number(it.unitPrice) || Number(it.targetPrice) || Number(it.foundPrice) || 0,
                            price: Number(it.unitPrice) || Number(it.targetPrice) || Number(it.foundPrice) || 0,
                            storeInfo: it.storeInfo || ''
                        }));

                        const instDetails = (this.institutionDetails && proj.institution) ? (this.institutionDetails[proj.institution] || {}) : {};
                        const pendingData = {
                            source: 'school',
                            projectId: this.currentProjectId,
                            institution: proj.institution || '',
                            items: cleanItems,
                            company: (proj.company && proj.company !== proj.institution) ? proj.company : (shopName || ''),
                            shop: shopName,
                            name: proj.name || '',
                            code: proj.code || '',
                            parentRefNo: parentRef,
                            address: proj.address || instDetails.address || '',
                            attn: proj.teacher || proj.attn || instDetails.contact || '',
                            tel: proj.tel || instDetails.phone || '',
                            email: proj.email || instDetails.email || '',
                            taxId: proj.taxId || instDetails.taxId || '',
                            discountType: proj.discountType || 'percent',
                            discountValue: proj.discountValue || 0,
                            timestamp: Date.now()
                        };

                        try {
                            sessionStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {}
                        try {
                            localStorage.setItem('pending_quotation_project', JSON.stringify(pendingData));
                        } catch(e) {}

                        // Also set pending_load_quotation as a guaranteed cross-page fallback
                        try {
                            const loadReceiptFallback = {
                                docType: 'receipt',
                                projectId: this.currentProjectId,
                                toCompany: proj.institution || '',
                                toAddress: proj.address || instDetails.address || '',
                                toAttn: proj.teacher || proj.attn || instDetails.contact || '',
                                toTel: proj.tel || instDetails.phone || '',
                                toEmail: proj.email || instDetails.email || '',
                                toTaxId: proj.taxId || instDetails.taxId || '',
                                parentRefNo: parentRef,
                                items: cleanItems,
                                shop: shopName,
                                timestamp: Date.now()
                            };
                            localStorage.setItem('pending_load_quotation', JSON.stringify(loadReceiptFallback));
                        } catch(e) {}
                        if (window.saveProjectToFirestore) {
                            window.saveProjectToFirestore(proj).catch(e => console.warn('Sync on goToReceipt error:', e));
                        }
                    }
                    const taxParam = (proj?.taxId || instDetails?.taxId) ? `&taxId=${encodeURIComponent((proj.taxId || instDetails.taxId).trim())}` : '';
                    window.location.href = typeof getDeptUrl === 'function' ? getDeptUrl(`quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=receipt${shopParam}${parentRefParam}${taxParam}`) : `../accounting/quotation.html?projectId=${encodeURIComponent(this.currentProjectId)}&source=school&docType=receipt${shopParam}${parentRefParam}${taxParam}`;
                }
            },

            renderActivityLog() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                const list = document.getElementById('activity-log-list');
                const empty = document.getElementById('activity-log-empty');
                if (!list || !empty) return;

                const logs = proj && proj.activityLog ? proj.activityLog : [];
                const badge = document.getElementById('activity-count-badge');
                if (badge) badge.textContent = logs.length;

                if (logs.length === 0) {
                    list.classList.add('hidden');
                    empty.classList.remove('hidden');
                    return;
                }
                list.classList.remove('hidden');
                empty.classList.add('hidden');

                const iconMap = {
                    'project_created': { icon: 'fa-solid fa-folder-plus', bg: 'bg-blue-100', text: 'text-blue-600' },
                    'quotation_confirmed': { icon: 'fa-solid fa-circle-check', bg: 'bg-emerald-100', text: 'text-emerald-600' },
                    'invoice_created': { icon: 'fa-solid fa-file-invoice', bg: 'bg-amber-100', text: 'text-amber-600' },
                    'invoice_confirmed': { icon: 'fa-solid fa-circle-check', bg: 'bg-emerald-100', text: 'text-emerald-600' },
                    'receipt_created': { icon: 'fa-solid fa-receipt', bg: 'bg-teal-100', text: 'text-teal-600' },
                    'receipt_confirmed': { icon: 'fa-solid fa-circle-check', bg: 'bg-emerald-100', text: 'text-emerald-600' },
                    'item_updated': { icon: 'fa-solid fa-pen', bg: 'bg-slate-100', text: 'text-slate-600' },
                    'status_changed': { icon: 'fa-solid fa-arrow-right-arrow-left', bg: 'bg-purple-100', text: 'text-purple-600' },
                    'project_edited': { icon: 'fa-solid fa-pen-to-square', bg: 'bg-blue-100', text: 'text-blue-600' },
                };

                list.innerHTML = logs.map(log => {
                    const mapping = iconMap[log.action] || { icon: log.icon || 'fa-solid fa-circle-info', bg: 'bg-slate-100', text: 'text-slate-600' };
                    const dt = new Date(log.timestamp);
                    const timeStr = dt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="activity-log-item">
                            <div class="log-icon ${mapping.bg} ${mapping.text}"><i class="${mapping.icon}"></i></div>
                            <div class="log-content">
                                <div class="log-action">${log.details || log.action}</div>
                                <div class="log-time"><i class="fa-regular fa-clock mr-1"></i>${timeStr}</div>
                                <div class="log-user"><i class="fa-regular fa-user mr-1"></i>${log.user || 'ระบบ'}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            },

            deleteProject() {
                this.openConfirmModal('ยืนยันลบโครงการ', 'คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การลบไม่สามารถกู้คืนได้', () => {
                    const idToDelete = this.currentProjectId;
                    if (window.deleteProjectFromFirestore) {
                        window.deleteProjectFromFirestore(idToDelete);
                    } else {
                        this.projects = this.projects.filter(p => p.id !== idToDelete);
                    }
                    this.showProjectsView();
                });
            },

            // Project Actions

            updateProjectStatus(newStatus) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (proj) {
                    proj.status = newStatus;
                    this.syncCurrentProject();
                }
            },

            renderInstitutions() {
                const grid = document.getElementById('institutions-grid');
                if (!grid) return;
                grid.innerHTML = '';
                
                // Auth not confirmed yet — always show spinner to avoid
                // filtering institutions incorrectly before userId/Role are set
                if (!this.currentUserId) {
                    grid.innerHTML = `
                        <div class="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60 backdrop-blur">
                            <div class="inline-block animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mb-3"></div>
                            <p class="font-medium text-slate-700 text-base">กำลังโหลดข้อมูลสถานศึกษาและโครงการ...</p>
                            <p class="text-xs text-slate-400 mt-1">กำลังเชื่อมต่อฐานข้อมูล กรุณารอสักครู่</p>
                        </div>
                    `;
                    return;
                }
                
                // Group projects by institution
                const instMap = new Map();
                
                this.projects.forEach(p => {
                    const instName = p.institution ? p.institution.trim() : 'ไม่ระบุสถานศึกษา';
                    if (!instMap.has(instName)) {
                        instMap.set(instName, { count: 0, itemsCount: 0 });
                    }
                    const stats = instMap.get(instName);
                    stats.count++;
                    stats.itemsCount += (p.items ? p.items.length : 0);
                });
                
                // Add explicitly created institutions that might not have projects yet
                Object.keys(this.institutionLogos).forEach(instName => {
                    if (!instMap.has(instName) && instName !== 'ไม่ระบุสถานศึกษา') {
                        instMap.set(instName, { count: 0, itemsCount: 0 });
                    }
                });
                
                if (instMap.size === 0) {
                    if (this.isLoadingProjects) {
                        grid.innerHTML = `
                            <div class="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-white/60 backdrop-blur">
                                <div class="inline-block animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mb-3"></div>
                                <p class="font-medium text-slate-700 text-base">กำลังโหลดข้อมูลสถานศึกษาและโครงการ...</p>
                                <p class="text-xs text-slate-400 mt-1">กำลังเชื่อมต่อฐานข้อมูล กรุณารอสักครู่</p>
                            </div>
                        `;
                        return;
                    }
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <i class="fa-solid fa-school fa-2x mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">ยังไม่มีข้อมูลสถานศึกษา</p>
                            <p class="text-sm mt-1">โปรดเพิ่มโครงการเพื่อเริ่มต้นใช้งาน</p>
                        </div>
                    `;
                    return;
                }
                
                const isAdmin = this.currentUserRole === 'admin';
                const currentUid = this.currentUserId;

                Array.from(instMap.entries()).forEach(([instName, stats]) => {
                    const details = (this.institutionDetails && this.institutionDetails[instName]) ? this.institutionDetails[instName] : {};
                    const isVisible = details.visible !== false;
                    const adminOnlySetting = details.adminOnly;
                    const createdBy = details.createdBy;

                    // Filter logic:
                    // 1. If adminOnlySetting === 'private' or adminOnlySetting === 'true' / boolean:
                    // - 'private': Only creator (createdBy === currentUid) can see it! Even Admins cannot see other people's private institutions unless they created it.
                    // - true: All Admins can see
                    // - false: Everyone can see
                    if (adminOnlySetting === 'private') {
                        if (createdBy && createdBy !== currentUid) {
                            return; // Hide from everyone except the creator
                        }
                    } else if (!isAdmin) {
                        if (!isVisible || adminOnlySetting === true) {
                            return; // Skip rendering for regular users
                        }
                    }

                    const el = document.createElement('div');
                    el.className = "bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(26,111,191,0.08)] hover:border-brand-200 transition-all cursor-pointer group";
                    el.onclick = () => this.showProjectsView(instName);
                    
                    const isUnknown = instName === 'ไม่ระบุสถานศึกษา';
                    const iconBg = isUnknown ? 'bg-slate-100 text-slate-500 group-hover:bg-slate-200' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100';
                    const titleClass = isUnknown ? 'text-slate-600' : 'text-slate-800 group-hover:text-brand-600';
                    
                    const logoUrl = this.institutionLogos[instName];
                    const logoHtml = logoUrl 
                        ? `<img src="${logoUrl}" class="w-full h-full object-contain rounded-2xl" alt="logo" onerror="this.src=''; this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-school text-2xl\\'></i>';"/>`
                        : `<i class="fa-solid fa-school text-2xl"></i>`;
                        
                    const editLogoBtn = isUnknown ? '' : `
                        <button onclick="appData.editInstitutionLogo(event, '${instName}')" class="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm text-slate-400 hover:text-brand-500 hover:border-brand-300 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10" title="เปลี่ยนโลโก้">
                            <i class="fa-solid fa-pen text-[11px]"></i>
                        </button>
                    `;
                    
                    // Admin & Owner status badges
                    let statusBadgeHtml = '';
                    if (adminOnlySetting === 'private') {
                        statusBadgeHtml += `<span class="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-user-lock mr-1"></i>ส่วนตัว (เห็นคนเดียว)</span> `;
                    }
                    if (isAdmin) {
                        if (!isVisible) {
                            statusBadgeHtml += `<span class="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-eye-slash mr-1"></i>ปิดการมองเห็น</span> `;
                        }
                        if (adminOnlySetting === true) {
                            statusBadgeHtml += `<span class="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-lock mr-1"></i>เฉพาะ Admin ทั้งหมด</span> `;
                        }
                    }

                    el.className = "bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(26,111,191,0.08)] hover:border-brand-200 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4";
                    
                    el.innerHTML = `
                        <div class="flex items-center gap-5 flex-1">
                            <div class="relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${iconBg}">
                                ${logoHtml}
                                ${editLogoBtn}
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-xl font-bold transition-colors line-clamp-1 ${titleClass}">${instName}</h3>
                                    ${statusBadgeHtml}
                                </div>
                                <div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-sm text-slate-500 font-medium">
                                    <div class="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide">
                                        ${stats.count} โครงการ
                                    </div>
                                    <span class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-boxes-stacked text-slate-400"></i> รวม ${stats.itemsCount} รายการพัสดุ
                                    </span>
                                    ${details.taxId ? `<span class="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md"><i class="fa-solid fa-id-card text-brand-500"></i> เลขผู้เสียภาษี: <span class="font-mono font-semibold text-slate-700">${details.taxId}</span></span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="shrink-0 flex items-center justify-end mt-2 sm:mt-0">
                            <span class="text-sm font-bold text-brand-600 bg-brand-50 px-4 py-2.5 rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-colors flex items-center gap-2">
                                ดูโครงการ <i class="fa-solid fa-arrow-right"></i>
                            </span>
                            ${isUnknown ? '' : `<button onclick="event.stopPropagation(); appData.deleteInstitution('${instName}');" class="ml-2 w-10 h-10 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shadow-sm z-10" title="ลบสถานศึกษา"><i class="fa-solid fa-trash"></i></button>`}
                            ${isUnknown ? '' : `
                            <button onclick="appData.openInstDetailsModal(event, '${instName}')" class="ml-3 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-brand-600 transition-colors" title="แก้ไขรายละเอียดสถานศึกษา">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            `}
                        </div>
                    `;
                    grid.appendChild(el);
                });

                if (grid.children.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <i class="fa-solid fa-school fa-2x mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">ไม่มีสถานศึกษาที่เปิดใช้งาน หรือที่คุณมีสิทธิ์เข้าถึง</p>
                        </div>
                    `;
                }
            },

            shopSet: new Set(),
            
            getCompanyDisplayString(companyField, institution = '') {
                if (!companyField) return null;
                const instStr = (institution || '').trim();
                const arr = Array.isArray(companyField) ? companyField : [companyField];
                const filtered = arr.filter(s => s && s.trim() !== '' && s.trim() !== instStr);
                return filtered.length > 0 ? filtered.join(', ') : null;
            },
            
            toggleShopDropdownUI() {
                const dropdown = document.getElementById('shop-custom-dropdown');
                if (dropdown) {
                    if (dropdown.classList.contains('hidden')) {
                        this.showShopDropdown();
                    } else {
                        this.hideShopDropdown();
                    }
                }
            },
            
            toggleShopSelection(shop) {
                if (this.selectedShopsForForm.includes(shop)) {
                    this.selectedShopsForForm = [];
                } else {
                    this.selectedShopsForForm = [shop];
                }
                this.updateShopDisplay();
                this.renderShopDropdown(Array.from(this.shopSet));
                this.hideShopDropdown();
            },
            
            updateShopDisplay() {
                const display = document.getElementById('modal-proj-company-display');
                if (!display) return;
                
                if (this.selectedShopsForForm.length === 0) {
                    display.innerHTML = '<span class="text-slate-400">เลือกร้านค้า...</span>';
                } else {
                    display.innerHTML = this.selectedShopsForForm.map(shop => 
                        `<span class="bg-brand-50 border border-brand-200 text-brand-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"><i class="fa-solid fa-shop"></i> ${shop}</span>`
                    ).join('');
                }
            },
            
            getShopData(shopName) {
                if (!this.registeredShops) return null;
                return this.registeredShops.find(s => (typeof s === 'string' ? s : s.name) === shopName);
            },
            
            populateShopDropdown() {
                const dropdown = document.getElementById('shop-custom-dropdown');
                if (!dropdown) return;
                
                this.shopSet.clear();
                
                if (this.registeredShops && Array.isArray(this.registeredShops)) {
                    this.registeredShops.forEach(shop => {
                        const sName = typeof shop === 'string' ? shop : shop.name;
                        if (sName && sName.trim() !== '') this.shopSet.add(sName.trim());
                    });
                }
                
                this.projects.forEach(p => {
                    if (p.company) {
                        const comps = Array.isArray(p.company) ? p.company : [p.company];
                        const instStr = (p.institution || '').trim();
                        comps.forEach(c => {
                            if (c && c.trim() !== '' && c.trim() !== instStr) this.shopSet.add(c.trim());
                        });
                    }
                });
                this.renderShopDropdown(Array.from(this.shopSet));
            },
            
            renderShopDropdown(shops) {
                const dropdown = document.getElementById('shop-custom-dropdown');
                if (!dropdown) return;
                
                dropdown.innerHTML = '';
                if (shops.length === 0) {
                    dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500 text-center">ไม่มีประวัติร้านค้า</div>';
                    return;
                }
                
                shops.forEach(shop => {
                    const item = document.createElement('div');
                    item.className = 'px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between select-none';
                    
                    const isChecked = this.selectedShopsForForm.includes(shop);
                    
                    const shopData = this.getShopData(shop);
                    let logoHtml = `<div class="w-7 h-7 rounded bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200"><i class="fa-solid fa-shop text-[10px]"></i></div>`;
                    if (shopData && shopData.logo) {
                        logoHtml = `<img src="${shopData.logo}" class="h-7 max-w-[4rem] w-auto rounded object-contain bg-white border border-slate-200 shrink-0">`;
                    }
                    
                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'flex items-center gap-3';
                    labelSpan.innerHTML = `${logoHtml} <span class="${isChecked ? 'text-brand-600 font-bold' : 'font-medium'}">${shop}</span>`;
                    
                    const checkIcon = document.createElement('i');
                    checkIcon.className = `fa-solid fa-check text-brand-500 transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0'}`;
                    
                    item.appendChild(labelSpan);
                    item.appendChild(checkIcon);
                    
                    item.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleShopSelection(shop);
                    };
                    
                    dropdown.appendChild(item);
                });
            },
            
            showShopDropdown() {
                const dropdown = document.getElementById('shop-custom-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('hidden');
                    this.populateShopDropdown();
                }
            },
            
            hideShopDropdown() {
                const dropdown = document.getElementById('shop-custom-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            },

            // Rendering Projects Grid
            renderProjects() {
                const grid = document.getElementById('projects-grid');
                if (!grid) return;
                grid.innerHTML = '';

                // Filter by current institution
                const targetInst = (this.currentInstitution && this.currentInstitution.trim()) ? this.currentInstitution.trim() : 'ไม่ระบุสถานศึกษา';
                let filteredProjects = this.projects.filter(p => {
                    const inst = p.institution ? p.institution.trim() : 'ไม่ระบุสถานศึกษา';
                    return inst === targetInst;
                });
                
                // Sort descending (latest on top) assuming ID or Date logic. ID includes timestamp (e.g. proj_17... or proj_2026...)
                // We'll sort by ID as string, which usually puts larger timestamps first
                filteredProjects.sort((a, b) => {
                    const idA = a.id || '';
                    const idB = b.id || '';
                    return idB.localeCompare(idA);
                });

                if (filteredProjects.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <i class="fa-regular fa-folder-open fa-2x mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">ยังไม่มีโครงการในวิทยาลัยนี้</p>
                            <p class="text-sm mt-1">คลิกปุ่ม "เพิ่มโครงการจัดซื้อ" เพื่อเริ่มต้น</p>
                        </div>
                    `;
                    return;
                }

                filteredProjects.forEach(proj => {
                    const statusConfig = this.getStatusConfig(proj.status);
                    
                    let displayDate = '-';
                    if (proj.date) {
                        const d = new Date(proj.date);
                        if (!isNaN(d.getTime())) {
                            displayDate = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                        }
                    }
                    
                    const deptText = proj.department || 'ไม่ระบุแผนก';
                    const teacherText = proj.teacher || 'ไม่ระบุครูผู้สอน';
                    
                    let totalSell = 0;
                    if (proj.items && Array.isArray(proj.items)) {
                        proj.items.forEach(item => {
                            totalSell += (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                        });
                    }
                    const formattedTotalSell = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalSell);

                    const card = document.createElement('div');
                    card.className = "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative overflow-hidden";
                    card.onclick = () => this.showProjectDetails(proj.id);
                    
                    // Accent bar
                    const accent = document.createElement('div');
                    accent.className = "absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity";
                    card.appendChild(accent);

                    card.innerHTML += `
                        <div class="flex items-start gap-4 pl-2 flex-1 min-w-0">
                            <div class="w-full">
                                <div class="flex flex-wrap items-center gap-2.5 mb-1.5">
                                    <h3 class="font-bold text-lg text-slate-800 leading-tight group-hover:text-brand-600 transition-colors">${proj.name}</h3>
                                    <span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">${proj.code}</span>
                                </div>
                                <div class="my-2 overflow-x-auto py-0.5 scrollbar-none">
                                    ${this.getProjectWorkflowBadge(proj)}
                                </div>
                                <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-2">
                                    <span class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-boxes-stacked text-slate-400"></i> จำนวน ${proj.items.length} รายการ
                                    </span>
                                    <span class="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-solid fa-building text-slate-400"></i> ${deptText}
                                    </span>
                                    <span class="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-regular fa-calendar text-slate-400"></i> ${displayDate}
                                    </span>
                                    <span class="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-solid fa-user-tie text-slate-400"></i> ${teacherText}
                                    </span>
                                    ${this.getCompanyDisplayString(proj.company, proj.institution) ? `
                                    <span class="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-solid fa-shop text-slate-400"></i> ${this.getCompanyDisplayString(proj.company, proj.institution)}
                                    </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-5 sm:pl-5 sm:border-l border-slate-100 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start pt-3 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-t-0">
                            <div class="flex flex-col items-end">
                                <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">ยอดขายรวม</span>
                                <span class="text-[15px] font-black text-amber-600 leading-none mt-1">${formattedTotalSell}</span>
                            </div>
                            <div class="hidden sm:block w-px h-8 bg-slate-100"></div>
                            <span class="status-badge ${statusConfig.class} px-3 py-1.5 text-xs">
                                <i class="fa-solid ${statusConfig.icon}"></i> ${statusConfig.label}
                            </span>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold text-brand-600 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                                    ดูรายละเอียด <i class="fa-solid fa-arrow-right-long"></i>
                                </span>
                                <button onclick="event.stopPropagation(); appData.currentProjectId = '${proj.id}'; appData.deleteProject();" class="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shadow-sm z-10 ml-2" title="ลบโครงการ">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            },

            // Rendering Excel Table
            renderExcelTable() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                const tbody = document.getElementById('excel-tbody');
                
                // --- SAVE FOCUS STATE ---
                let activeId = null;
                let activeField = null;
                let selStart = null;
                let selEnd = null;
                
                if (document.activeElement && document.activeElement.classList.contains('excel-input')) {
                    activeId = document.activeElement.dataset.id;
                    activeField = document.activeElement.dataset.field;
                    try {
                        selStart = document.activeElement.selectionStart;
                        selEnd = document.activeElement.selectionEnd;
                    } catch(e) {} // Some input types don't support selection
                }
                
                tbody.innerHTML = '';

                let sumTotal = 0;
                let sumTarget = 0;
                let sumFound = 0;
                let sumProfit = 0;
                let currentNo = 1;

                proj.items.forEach((item, index) => {
                    // Auto-calculate targetPrice (ควรซื้อ = unitPrice / 1.35) if unitPrice exists and targetPrice is not set
                    const cleanUnitPrice = Number(String(item.unitPrice || 0).replace(/[฿,\s]/g, '')) || 0;
                    const cleanTargetPrice = Number(String(item.targetPrice || 0).replace(/[฿,\s]/g, '')) || 0;
                    if (!item.isHeader && cleanUnitPrice > 0 && cleanTargetPrice <= 0) {
                        item.targetPrice = Math.round(cleanUnitPrice / 1.35);
                    }

                    // Calculations
                    const hasSellPrice = item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '' && !isNaN(cleanUnitPrice) && cleanUnitPrice > 0;
                    const cleanQty = Number(String(item.qty !== undefined && item.qty !== null ? item.qty : '').replace(/,/g, ''));
                    const hasQty = item.qty !== undefined && item.qty !== null && item.qty !== '' && !isNaN(cleanQty) && cleanQty > 0;
                    const totalAmt = (hasQty && hasSellPrice) ? (cleanQty * cleanUnitPrice) : 0;
                    
                    // Display for total sell amount: show currency if priced, '-' if blank/unset
                    let displayTotalAmt = '-';
                    if (hasSellPrice && hasQty) {
                        displayTotalAmt = this.formatCurrency(totalAmt);
                    } else if (item.unitPrice !== '' && item.unitPrice !== null && item.unitPrice !== undefined && Number(item.unitPrice) === 0 && item.unit) {
                        displayTotalAmt = this.formatCurrency(0);
                    }
                    
                    // Profit (%) calculation based on requirement: diff between unitPrice and foundPrice
                    // Profit = unitPrice - foundPrice
                    // Profit % = (Profit / unitPrice) * 100
                    let profitPct = 0;
                    if (hasSellPrice && item.foundPrice && Number(item.foundPrice) > 0) {
                        profitPct = ((Number(item.unitPrice) - Number(item.foundPrice)) / Number(item.foundPrice)) * 100;
                    }
                    
                    let profitClass = profitPct > 0 ? 'text-emerald-600' : (profitPct < 0 ? 'text-red-500' : 'text-slate-500');

                    // Sum all valid non-header items
                    if (!item.isHeader) {
                        if (hasSellPrice && hasQty) {
                            sumTotal += totalAmt;
                        }
                        const curTarget = Number(String(item.targetPrice || 0).replace(/[฿,\s]/g, '')) || 0;
                        if (curTarget > 0) {
                            sumTarget += (cleanQty > 0 ? cleanQty : 1) * curTarget;
                        }
                        const actualFoundTotal = item.foundTotalPrice !== undefined && item.foundTotalPrice !== null && item.foundTotalPrice !== '' ? (parseFloat(String(item.foundTotalPrice).replace(/,/g, '')) || 0) : ((parseFloat(String(item.qty).replace(/,/g, '')) || 0) * (parseFloat(String(item.foundPrice).replace(/,/g, '')) || 0));
                        sumFound += actualFoundTotal;
                    }

                    const activeColor = this.getItemRowColor(item);
                    const tr = document.createElement('tr');
                    if (activeColor) {
                        tr.className = `row-highlight-${activeColor}`;
                    }
                    
                    let mainNoDisplay = '';
                    if (item.mainNo !== undefined) {
                        mainNoDisplay = item.mainNo;
                    } else if (item.isHeader) {
                        mainNoDisplay = '';
                    } else if (item.customNo && item.customNo.trim() !== '') {
                        mainNoDisplay = '';
                    } else {
                        mainNoDisplay = (currentNo++).toString();
                    }

                    const displayNoStr = (item.customNo || mainNoDisplay || '').trim();
                    let nameIndentClass = (item.customNo?.trim() !== '' || (item.mainNo && item.mainNo.includes('.'))) ? 'pl-8' : '';

                    const isManual = Boolean(item.isManualColor);

                    const colorMenuBtn = `
                        <div class="relative inline-block text-left" id="color-menu-${item.id}">
                            <button onclick="appData.toggleColorMenu(event, '${item.id}')" class="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center relative" title="${isManual ? 'กำหนดสีเอง' : 'ไฮไลท์สีอัตโนมัติตามการกรอก'}">
                                <i class="fa-solid fa-highlighter text-xs ${activeColor === 'green' ? 'text-emerald-600 font-bold' : activeColor === 'yellow' ? 'text-amber-500 font-bold' : activeColor === 'red' ? 'text-red-500 font-bold' : ''}"></i>
                                ${isManual ? '<span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-1 ring-white" title="ปรับแต่งเอง"></span>' : ''}
                            </button>
                            <div id="color-popup-${item.id}" class="hidden absolute right-0 bottom-full mb-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 flex items-center gap-1.5">
                                <button onclick="appData.setRowColor(event, '${item.id}', 'green')" class="w-6 h-6 rounded-full bg-emerald-400 hover:bg-emerald-500 border border-emerald-500 flex items-center justify-center text-white text-[10px] shadow-sm transition-transform hover:scale-110" title="สีเขียว (กำหนดเอง)">
                                    ${activeColor === 'green' && isManual ? '<i class="fa-solid fa-check"></i>' : ''}
                                </button>
                                <button onclick="appData.setRowColor(event, '${item.id}', 'yellow')" class="w-6 h-6 rounded-full bg-amber-300 hover:bg-amber-400 border border-amber-400 flex items-center justify-center text-amber-900 text-[10px] shadow-sm transition-transform hover:scale-110" title="สีเหลือง (กำหนดเอง)">
                                    ${activeColor === 'yellow' && isManual ? '<i class="fa-solid fa-check"></i>' : ''}
                                </button>
                                <button onclick="appData.setRowColor(event, '${item.id}', 'red')" class="w-6 h-6 rounded-full bg-rose-400 hover:bg-rose-500 border border-rose-500 flex items-center justify-center text-white text-[10px] shadow-sm transition-transform hover:scale-110" title="สีแดง (กำหนดเอง)">
                                    ${activeColor === 'red' && isManual ? '<i class="fa-solid fa-check"></i>' : ''}
                                </button>
                                <button onclick="appData.setRowColor(event, '${item.id}', 'auto')" class="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 text-[10px] shadow-sm transition-transform hover:scale-110" title="อัตโนมัติ (ตามการกรอกข้อมูล)">
                                    <i class="fa-solid fa-rotate-left"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    if (item.isHeader) {
                        tr.innerHTML = `
                            <td class="text-center p-0">
                                <input type="text" class="excel-input text-center text-slate-500 font-bold" data-id="${item.id}" data-field="mainNo" value="${this.escapeAttr(mainNoDisplay)}" onchange="appData.updateItem('${item.id}', 'mainNo', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="-" title="เลขข้อหลัก (สามารถเว้นว่างหรือแก้ไขได้อิสระ)">
                            </td>
                            <td>
                                <input type="text" class="excel-input text-center text-slate-500 font-medium" data-id="${item.id}" data-field="customNo" value="${this.escapeAttr(item.customNo || '')}" onchange="appData.updateItem('${item.id}', 'customNo', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="เช่น 1.">
                            </td>
                            <td colspan="11" class="bg-slate-50">
                                <input type="text" class="excel-input font-bold text-brand-600 bg-transparent w-full" data-id="${item.id}" data-field="name" value="${this.escapeAttr(item.name || '')}" onchange="appData.updateItem('${item.id}', 'name', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="ชื่อหัวข้อ/หมวดหมู่">
                            </td>
                            <td class="text-center bg-slate-50">
                                <div class="flex items-center justify-center gap-1">
                                    <button class="w-7 h-7 rounded bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors flex items-center justify-center drag-handle cursor-grab active:cursor-grabbing" title="ลากเพื่อจัดเรียง">
                                        <i class="fa-solid fa-grip-vertical text-xs"></i>
                                    </button>
                                    ${colorMenuBtn}
                                    <button onclick="appData.deleteItem('${item.id}')" class="w-7 h-7 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center justify-center" title="ลบรายการ">
                                        <i class="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                    } else {
                        const displayFoundTotal = item.foundTotalPrice !== undefined && item.foundTotalPrice !== null && item.foundTotalPrice !== '' ? item.foundTotalPrice : (item.foundPrice ? Math.round((item.qty || 0) * item.foundPrice * 100) / 100 : '');
                        const qtyDisplayVal = (item.qty !== undefined && item.qty !== null && item.qty !== '') ? item.qty : '';
                        const unitPriceDisplayVal = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '') ? item.unitPrice : '';
                        const targetPriceDisplayVal = (item.targetPrice !== undefined && item.targetPrice !== null && item.targetPrice !== '') ? item.targetPrice : '';
                        
                        tr.innerHTML = `
                            <td class="text-center p-0">
                                <input type="text" class="excel-input text-center text-slate-700 font-bold" data-id="${item.id}" data-field="mainNo" value="${this.escapeAttr(mainNoDisplay)}" onchange="appData.updateItem('${item.id}', 'mainNo', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="-" title="เลขข้อหลัก (สามารถเว้นว่างหรือแก้ไขได้อิสระ)">
                            </td>
                            <td>
                                <input type="text" class="excel-input text-center text-slate-500" data-id="${item.id}" data-field="customNo" value="${this.escapeAttr(item.customNo || '')}" onchange="appData.updateItem('${item.id}', 'customNo', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="เช่น 1.1">
                            </td>
                            <td>
                                <input type="text" class="excel-input font-medium text-slate-800 ${nameIndentClass}" data-id="${item.id}" data-field="name" value="${this.escapeAttr(item.name || '')}" onchange="appData.updateItem('${item.id}', 'name', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="ชื่อรายการ">
                            </td>
                            <td>
                                <input type="number" class="excel-input text-right" data-id="${item.id}" data-field="qty" value="${qtyDisplayVal}" onchange="appData.updateItem('${item.id}', 'qty', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0" placeholder="-">
                            </td>
                            <td>
                                <input type="text" class="excel-input text-center" data-id="${item.id}" data-field="unit" value="${this.escapeAttr(item.unit || '')}" onchange="appData.updateItem('${item.id}', 'unit', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="หน่วย">
                            </td>
                            <td>
                                <input type="number" class="excel-input text-right" data-id="${item.id}" data-field="unitPrice" value="${unitPriceDisplayVal}" onchange="appData.updateItem('${item.id}', 'unitPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0" step="any" placeholder="-">
                            </td>
                            <td class="col-total p-0">
                                <div class="px-1 py-2 ${displayTotalAmt === '-' ? 'text-slate-400 font-normal text-center' : 'text-amber-900'} text-[13px] sm:text-sm truncate" title="${displayTotalAmt}">${displayTotalAmt}</div>
                            </td>
                            <td>
                                <input type="number" class="excel-input text-right text-blue-700" data-id="${item.id}" data-field="targetPrice" value="${targetPriceDisplayVal}" onchange="appData.updateItem('${item.id}', 'targetPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0" step="any" placeholder="-">
                            </td>
                            <td>
                                <input type="number" class="excel-input text-right text-emerald-700 font-semibold" data-id="${item.id}" data-field="foundPrice" value="${item.foundPrice || ''}" onchange="appData.updateItem('${item.id}', 'foundPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0" step="any" placeholder="ทุน/ชิ้น">
                            </td>
                            <td>
                                <input type="number" class="excel-input text-right text-emerald-700 font-semibold" data-id="${item.id}" data-field="foundTotalPrice" value="${displayFoundTotal}" onchange="appData.updateItem('${item.id}', 'foundTotalPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0" step="any" placeholder="ทุนรวม">
                            </td>
                            <td class="text-center font-bold ${profitClass}">
                                ${hasSellPrice && item.foundPrice && profitPct !== 0 ? profitPct.toFixed(2) + '%' : '-'}
                            </td>
                            <td>
                                <input type="text" class="excel-input text-xs" data-id="${item.id}" data-field="storeInfo" placeholder="ชื่อ/เบอร์ร้าน" value="${this.escapeAttr(item.storeInfo || '')}" onchange="appData.updateItem('${item.id}', 'storeInfo', this.value)" onkeydown="appData.handleExcelKeydown(event)">
                            </td>
                            <td class="text-center">
                                <div class="flex items-center justify-center gap-1 p-1">
                                    <input type="text" class="excel-input text-xs !min-h-[28px] !p-1 border border-slate-200 rounded" data-id="${item.id}" data-field="link" placeholder="URL" value="${this.escapeAttr(item.link || '')}" onchange="appData.updateItem('${item.id}', 'link', this.value)" onkeydown="appData.handleExcelKeydown(event)">
                                    ${item.link ? `<a href="${this.escapeAttr(item.link)}" target="_blank" class="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0" title="เปิดลิงก์"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a>` : ''}
                                </div>
                            </td>
                            <td class="text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <button class="w-7 h-7 rounded bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors flex items-center justify-center drag-handle cursor-grab active:cursor-grabbing" title="ลากเพื่อจัดเรียง">
                                        <i class="fa-solid fa-grip-vertical text-xs"></i>
                                    </button>
                                    ${colorMenuBtn}
                                    <button onclick="appData.duplicateItemRow('${item.id}')" class="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center" title="คัดลอกรายการ">
                                        <i class="fa-regular fa-copy text-xs"></i>
                                    </button>
                                    <button onclick="appData.deleteItem('${item.id}')" class="w-7 h-7 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center justify-center" title="ลบรายการ">
                                        <i class="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                    }
                    tbody.appendChild(tr);
                });

                if (this.isReadOnly) {
                    tbody.querySelectorAll('input').forEach(inp => {
                        inp.disabled = true;
                        inp.classList.add('cursor-not-allowed');
                    });
                    tbody.querySelectorAll('.drag-handle, [id^="color-menu-"], button[onclick*="deleteItem"], button[onclick*="duplicateItemRow"]').forEach(el => {
                        el.style.display = 'none';
                    });
                }

                if(proj.items.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="14" class="text-center p-8 text-slate-500 font-medium">ยังไม่มีรายการสิ่งของ กด "เพิ่มรายการสินค้า" หรือ "เพิ่มหัวข้อ" เพื่อเริ่มต้น</td></tr>`;
                }

                // Update Footers
                const totalAmtEl = document.getElementById('total-amount-sum');
                totalAmtEl.innerText = this.formatCurrency(sumTotal);
                totalAmtEl.title = this.formatCurrency(sumTotal);
                
                const totalTargetEl = document.getElementById('total-target-sum');
                totalTargetEl.innerText = this.formatCurrency(sumTarget);
                totalTargetEl.title = this.formatCurrency(sumTarget);
                
                const totalFoundEl = document.getElementById('total-found-sum');
                totalFoundEl.innerText = this.formatCurrency(sumFound);
                totalFoundEl.title = this.formatCurrency(sumFound);
                
                // Format profit percentage to exactly 2 decimal places
                let profitDisplay = '-';
                if (sumFound > 0) {
                    const totalProfitPct = ((sumTotal - sumFound) / sumFound) * 100;
                    profitDisplay = totalProfitPct.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
                }
                const profitSumEl = document.getElementById('total-profit-sum');
                profitSumEl.innerText = profitDisplay;
                profitSumEl.title = profitDisplay;

                // --- Calculate Tax Breakdown for Institutions (ภาษีซื้อ 7%, ภาษีขาย 7%, หัก ณ ที่จ่าย 1%) ---
                const inputVat = Math.round(sumFound * 0.07 * 100) / 100;
                const outputVat = Math.round(sumTotal * 0.07 * 100) / 100;
                const wht1Pct = Math.round(sumTotal * 0.01 * 100) / 100;
                const netAfterAllTaxes = Math.round((sumTotal - inputVat - outputVat - wht1Pct) * 100) / 100;
                const netProfitAfterAll = Math.round((sumTotal - sumFound - inputVat - outputVat - wht1Pct) * 100) / 100;

                const taxInputVatEl = document.getElementById('tax-input-vat');
                if (taxInputVatEl) {
                    taxInputVatEl.innerText = '-' + this.formatCurrency(inputVat);
                    taxInputVatEl.title = `ภาษีซื้อ 7% (คิดจากราคาทุนรวม ${this.formatCurrency(sumFound)})`;
                }

                const taxOutputVatEl = document.getElementById('tax-output-vat');
                if (taxOutputVatEl) {
                    taxOutputVatEl.innerText = '-' + this.formatCurrency(outputVat);
                    taxOutputVatEl.title = `ภาษีขาย 7% (คิดจากราคาขายรวม ${this.formatCurrency(sumTotal)})`;
                }

                const taxWhtEl = document.getElementById('tax-wht-1pct');
                if (taxWhtEl) {
                    taxWhtEl.innerText = '-' + this.formatCurrency(wht1Pct);
                    taxWhtEl.title = `หัก ณ ที่จ่าย 1% (คิดจากราคาขายรวม ${this.formatCurrency(sumTotal)})`;
                }

                const taxNetReceiveEl = document.getElementById('tax-net-receive');
                if (taxNetReceiveEl) {
                    taxNetReceiveEl.innerText = this.formatCurrency(netAfterAllTaxes);
                    taxNetReceiveEl.title = `ยอดราคาขายหลังหัก ภาษีซื้อ 7% (${this.formatCurrency(inputVat)}) - ภาษีขาย 7% (${this.formatCurrency(outputVat)}) - หัก ณ ที่จ่าย 1% (${this.formatCurrency(wht1Pct)}) = ${this.formatCurrency(netAfterAllTaxes)}`;
                }

                const taxNetProfitEl = document.getElementById('tax-net-profit');
                if (taxNetProfitEl) {
                    taxNetProfitEl.innerText = this.formatCurrency(netProfitAfterAll);
                    taxNetProfitEl.title = `กำไรสุทธิคงเหลือเข้ากระเป๋าจริง (ราคาขาย ${this.formatCurrency(sumTotal)} - ทุน ${this.formatCurrency(sumFound)} - ภาษีซื้อ ${this.formatCurrency(inputVat)} - ภาษีขาย ${this.formatCurrency(outputVat)} - หัก ณ ที่จ่าย 1% ${this.formatCurrency(wht1Pct)}) = ${this.formatCurrency(netProfitAfterAll)}`;
                }

                // --- RESTORE FOCUS STATE ---
                if (activeId && activeField) {
                    // setTimeout to ensure DOM is fully painted
                    setTimeout(() => {
                        const el = document.querySelector(`.excel-input[data-id="${activeId}"][data-field="${activeField}"]`);
                        if (el) {
                            el.focus();
                            try {
                                if (selStart !== null && selEnd !== null) {
                                    el.setSelectionRange(selStart, selEnd);
                                }
                            } catch(e) {}
                        }
                    }, 0);
                }
            },

            // Item Logic
            handleExcelKeydown(e) {
                if (!e.target.classList.contains('excel-input')) return;
                
                const currentInput = e.target;
                const currentRow = currentInput.closest('tr');
                const tbody = document.getElementById('excel-tbody');
                const allRows = Array.from(tbody.querySelectorAll('tr'));
                const rowIndex = allRows.indexOf(currentRow);
                
                const allInputsInRow = Array.from(currentRow.querySelectorAll('.excel-input'));
                const colIndex = allInputsInRow.indexOf(currentInput);
                
                let targetInput = null;

                if (e.key === 'ArrowDown' || (!e.shiftKey && e.key === 'Enter')) {
                    e.preventDefault();
                    if (rowIndex < allRows.length - 1) {
                        targetInput = allRows[rowIndex + 1].querySelectorAll('.excel-input')[colIndex];
                    } else if (e.key === 'Enter') {
                        // Create new row
                        currentInput.blur(); // Trigger save
                        setTimeout(() => {
                            this.addEmptyItemRow();
                            // Focus on same column in new row
                            setTimeout(() => {
                                const newRows = Array.from(document.getElementById('excel-tbody').querySelectorAll('tr'));
                                const newTargetInput = newRows[newRows.length - 1].querySelectorAll('.excel-input')[colIndex];
                                if (newTargetInput) {
                                    newTargetInput.focus();
                                }
                            }, 50);
                        }, 10);
                        return;
                    }
                } else if (e.key === 'ArrowUp' || (e.shiftKey && e.key === 'Enter')) {
                    e.preventDefault();
                    if (rowIndex > 0) {
                        targetInput = allRows[rowIndex - 1].querySelectorAll('.excel-input')[colIndex];
                    }
                } else if (e.key === 'ArrowRight') {
                    // Move right if cursor is at end
                    try {
                        if (currentInput.selectionStart === currentInput.value.length || currentInput.type === 'number') {
                            e.preventDefault();
                            if (colIndex < allInputsInRow.length - 1) {
                                targetInput = allInputsInRow[colIndex + 1];
                            }
                        }
                    } catch(err) {
                        // Type number might throw on selectionStart in some browsers, fallback
                        e.preventDefault();
                        if (colIndex < allInputsInRow.length - 1) targetInput = allInputsInRow[colIndex + 1];
                    }
                } else if (e.key === 'ArrowLeft') {
                    // Move left if cursor is at start
                    try {
                        if (currentInput.selectionStart === 0 || currentInput.type === 'number') {
                            e.preventDefault();
                            if (colIndex > 0) {
                                targetInput = allInputsInRow[colIndex - 1];
                            }
                        }
                    } catch(err) {
                        e.preventDefault();
                        if (colIndex > 0) targetInput = allInputsInRow[colIndex - 1];
                    }
                }

                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.select) {
                        try { targetInput.select(); } catch(e){}
                    }
                }
            },

            addEmptyItemRow() {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;

                let maxMainNo = 0;
                if (Array.isArray(proj.items)) {
                    proj.items.forEach(it => {
                        if (it.mainNo) {
                            const parsed = parseInt(it.mainNo, 10);
                            if (!isNaN(parsed) && parsed > maxMainNo) maxMainNo = parsed;
                        }
                    });
                    if (maxMainNo === 0) {
                        maxMainNo = proj.items.filter(it => !it.isHeader && !it.customNo).length;
                    }
                }
                const nextNo = (maxMainNo + 1).toString();
                
                proj.items.push({
                    id: 'item_' + Date.now(),
                    isHeader: false,
                    mainNo: nextNo,
                    customNo: '',
                    name: '',
                    qty: 1,
                    unit: '',
                    unitPrice: '',
                    targetPrice: '',
                    foundPrice: '',
                    foundTotalPrice: '',
                    storeInfo: '',
                    link: ''
                });
                
                this.syncCurrentProject();
                this.renderExcelTable();
            },

            addHeaderRow() {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                proj.items.push({
                    id: 'item_' + Date.now(),
                    isHeader: true,
                    mainNo: '',
                    customNo: '',
                    name: '',
                    qty: '',
                    unit: '',
                    unitPrice: '',
                    targetPrice: '',
                    foundPrice: '',
                    foundTotalPrice: '',
                    storeInfo: '',
                    link: ''
                });
                
                this.syncCurrentProject();
                this.renderExcelTable();
            },

            autoReorderItemNumbers() {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj || !Array.isArray(proj.items)) return;

                let currentSeq = 1;
                proj.items.forEach(it => {
                    const custom = (it.customNo || '').trim();
                    if (it.isHeader) {
                        it.mainNo = '';
                    } else if (custom !== '') {
                        it.mainNo = '';
                    } else {
                        it.mainNo = (currentSeq++).toString();
                    }
                });

                this.syncCurrentProject();
                this.renderExcelTable();
                this.showToast('รันเลขลำดับ 1, 2, 3... ให้อัตโนมัติเรียบร้อย', 'success');
            },

            updateItem(itemId, field, value) {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                const item = proj.items.find(i => i.id === itemId);
                if (!item) return;

                if (['qty', 'unitPrice', 'targetPrice', 'foundPrice', 'foundTotalPrice'].includes(field)) {
                    const rawVal = (value !== null && value !== undefined) ? String(value).trim() : '';
                    if (rawVal === '') {
                        item[field] = '';
                        if (field === 'qty') {
                            if (item.foundPrice && Number(item.foundPrice) > 0) item.foundTotalPrice = '';
                        } else if (field === 'foundPrice') {
                            item.foundTotalPrice = '';
                        } else if (field === 'foundTotalPrice') {
                            item.foundPrice = '';
                        } else if (field === 'unitPrice') {
                            item.targetPrice = '';
                        }
                    } else {
                        const numVal = Number(rawVal.replace(/[฿,\s]/g, '')) || 0;
                        if (field === 'qty') {
                            item.qty = numVal;
                            if (item.foundPrice > 0) {
                                item.foundTotalPrice = Math.round(item.foundPrice * item.qty * 100) / 100;
                            } else if (item.foundTotalPrice > 0 && item.qty > 0) {
                                item.foundPrice = Math.round((item.foundTotalPrice / item.qty) * 100) / 100;
                            }
                            if (Number(item.unitPrice) > 0 && (!item.targetPrice || Number(item.targetPrice) <= 0)) {
                                item.targetPrice = Math.round(Number(item.unitPrice) / 1.35);
                            }
                        } else if (field === 'foundPrice') {
                            item.foundPrice = numVal;
                            item.foundTotalPrice = Math.round(numVal * (item.qty || 0) * 100) / 100;
                            
                            // Auto-calculate unitPrice if autoMarkup35 is enabled and foundPrice is changed
                            if (this.autoMarkup35 && item.foundPrice > 0) {
                                const calculatedPrice = item.foundPrice * 1.35;
                                item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                                item.targetPrice = Math.round(item.unitPrice / 1.35);
                            }
                        } else if (field === 'foundTotalPrice') {
                            item.foundTotalPrice = numVal;
                            const qty = item.qty && item.qty > 0 ? item.qty : 1;
                            item.foundPrice = Math.round((numVal / qty) * 100) / 100;
                            
                            // Auto-calculate unitPrice if autoMarkup35 is enabled and foundPrice is changed
                            if (this.autoMarkup35 && item.foundPrice > 0) {
                                const calculatedPrice = item.foundPrice * 1.35;
                                item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                                item.targetPrice = Math.round(item.unitPrice / 1.35);
                            }
                        } else if (field === 'unitPrice') {
                            item.unitPrice = numVal;
                            if (item.unitPrice > 0) {
                                item.targetPrice = Math.round(item.unitPrice / 1.35);
                            } else {
                                item.targetPrice = '';
                            }
                        } else if (field === 'targetPrice') {
                            item.targetPrice = numVal > 0 ? numVal : '';
                        }
                    }
                } else {
                    item[field] = value;
                }

                this.syncCurrentProject();
                this.renderExcelTable(); // Re-render to update calculations
            },

            deleteItem(itemId) {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                this.openConfirmModal('ยืนยันการลบ', 'ยืนยันการลบสินค้ารายการนี้ออกจากตารางหรือไม่?', () => {
                    const proj = this.projects.find(p => p.id === this.currentProjectId);
                    if (!proj) return;
                    
                    proj.items = proj.items.filter(i => i.id !== itemId);
                    this.syncCurrentProject();
                    this.renderExcelTable();
                    this.showToast('ลบรายการแล้ว', 'success');
                });
            },

            duplicateItemRow(itemId) {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                const itemToCopy = proj.items.find(i => i.id === itemId);
                if (!itemToCopy) return;

                const index = proj.items.indexOf(itemToCopy);
                const newItem = { ...itemToCopy, id: 'item_' + Date.now() };
                
                proj.items.splice(index + 1, 0, newItem);
                
                this.syncCurrentProject();
                this.renderExcelTable();
                this.showToast('คัดลอกรายการแล้ว', 'success');
            },

            confirmClearTable() {
                if (this.isReadOnly) {
                    this.showToast('โหมดดูได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 'error');
                    return;
                }
                this.openConfirmModal('ยืนยันล้างตาราง', 'ข้อมูลรายการสินค้าทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้ คุณต้องการดำเนินการต่อหรือไม่?', () => {
                    this.clearAllItems();
                });
            },

            clearAllItems() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                proj.items = [];
                this.syncCurrentProject();
                this.renderExcelTable();
                this.showToast('ล้างข้อมูลตารางแล้ว', 'success');
            },

            getItemRowColor(item) {
                if (item.manualColor !== undefined && item.manualColor !== null) {
                    return item.manualColor === 'none' ? '' : item.manualColor;
                }
                if (item.rowColor && item.isManualColor) {
                    return item.rowColor;
                }

                // Auto-detect based on fields completion
                if (item.isHeader) {
                    return (item.name && item.name.trim() !== '') ? 'green' : '';
                }

                const name = (item.name || '').trim();
                const qtyVal = (item.qty !== '' && item.qty !== undefined && item.qty !== null) ? Number(item.qty) : null;
                const unit = (item.unit || '').trim();
                const unitPriceVal = (item.unitPrice !== '' && item.unitPrice !== undefined && item.unitPrice !== null) ? Number(item.unitPrice) : null;
                const targetPriceVal = (item.targetPrice !== '' && item.targetPrice !== undefined && item.targetPrice !== null) ? Number(item.targetPrice) : null;
                const foundPriceVal = (item.foundPrice !== '' && item.foundPrice !== undefined && item.foundPrice !== null) ? Number(item.foundPrice) : null;
                const link = (item.link || '').trim();
                const storeInfo = (item.storeInfo || '').trim();

                // Check if row has any data at all
                const hasAnyData = Boolean(name || (qtyVal !== null && qtyVal > 0) || unit || (unitPriceVal !== null && unitPriceVal > 0) || (targetPriceVal !== null && targetPriceVal > 0) || (foundPriceVal !== null && foundPriceVal > 0) || link || storeInfo);
                if (!hasAnyData) {
                    return ''; // Completely empty / untouched row
                }

                const hasLinkOrStore = Boolean(link !== '' || storeInfo !== '');

                // 🟢 GREEN Criteria: Complete item (name, qty > 0, unit, and price > 0)
                if (name !== '' && qtyVal !== null && qtyVal > 0 && unit !== '' && unitPriceVal !== null && unitPriceVal > 0) {
                    return 'green';
                }

                // ⚪ Clean / Title / Note Row: Has a name/title but no unit and no prices (e.g. "แฟลช 2 อัน คือ" / header / note)
                if (name !== '' && unit === '' && (unitPriceVal === null || unitPriceVal === 0) && (foundPriceVal === null || foundPriceVal === 0) && (targetPriceVal === null || targetPriceVal === 0) && !hasLinkOrStore) {
                    return ''; // Clean neutral white row, not red or yellow
                }

                // 🔴 RED Criteria: Item specified with unit (intended to buy unit item) BUT no price AND no store link
                if (name !== '' && unit !== '' && (unitPriceVal === null || unitPriceVal === 0) && !hasLinkOrStore) {
                    return 'red';
                }

                // 🟡 YELLOW Criteria: Work-in-progress (e.g. Has store link/info but missing price, or partial fields)
                return 'yellow';
            },

            escapeAttr(str) {
                if (str === null || str === undefined) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            },

            setRowColor(event, itemId, color) {
                if (event) event.stopPropagation();
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                const item = proj.items.find(i => i.id === itemId);
                if (!item) return;

                if (color === 'auto') {
                    delete item.manualColor;
                    delete item.rowColor;
                    item.isManualColor = false;
                } else {
                    item.manualColor = color;
                    item.rowColor = color;
                    item.isManualColor = true;
                }
                this.syncCurrentProject();
                this.renderExcelTable();
            },

            toggleColorMenu(event, itemId) {
                if (event) event.stopPropagation();
                const popup = document.getElementById(`color-popup-${itemId}`);
                const isHidden = popup ? popup.classList.contains('hidden') : true;
                
                // Hide all color popups
                document.querySelectorAll('[id^="color-popup-"]').forEach(el => el.classList.add('hidden'));
                
                if (isHidden && popup) {
                    popup.classList.remove('hidden');
                }
            },

            importExcel(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                this.showExcelLoader();
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    setTimeout(() => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, {type: 'array'});
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1}); // Read as array of arrays
                            
                            if (json.length < 2) {
                                this.hideExcelLoader();
                                setTimeout(() => this.showToast('ไม่พบข้อมูลในไฟล์ Excel', 'error'), 300);
                                return;
                            }

                            const proj = this.projects.find(p => p.id === this.currentProjectId);
                            if (!proj) {
                                this.hideExcelLoader();
                                return;
                            }

                            let itemsAdded = 0;
                            let headerFound = false;
                            let colMap = { name: 1, qty: 2, unit: 3, unitPrice: 4 }; // Default map based on user spec: 0=ลำดับ, 1=รายการ, 2=จำนวน, 3=หน่วย, 4=ราคา/หน่วย, 5=รวมเงิน

                            for (let i = 0; i < json.length; i++) {
                                const row = json[i];
                                if (!row || row.length === 0) continue; // Skip empty rows
                                
                                // Find header row dynamically
                                if (!headerFound) {
                                    const rowStr = String(row.join(' ')).toLowerCase();
                                    if (rowStr.includes('รายการวัสดุ') || rowStr.includes('รายการ') || rowStr.includes('ครุภัณฑ์')) {
                                        headerFound = true;
                                        for(let c = 0; c < row.length; c++) {
                                            const colName = String(row[c] || '').trim();
                                            if (colName.includes('รายการ')) colMap.name = c;
                                            else if (colName.includes('จำนวน')) colMap.qty = c;
                                            else if (colName.includes('หน่วย') && !colName.includes('ราคา')) colMap.unit = c;
                                            else if (colName.includes('ราคา')) colMap.unitPrice = c;
                                        }
                                        continue;
                                    } else if (i > 10) { 
                                        headerFound = true; // Fallback
                                        i = 0; 
                                        continue;
                                    }
                                    continue;
                                }

                                const name = String(row[colMap.name] || '').trim();
                                // Skip if empty or looks like a footer row
                                if (!name || name.includes('รวมเงิน') || name.includes('รวมสุทธิ')) continue;

                                const qtyStr = String(row[colMap.qty] || '').replace(/,/g, '');
                                const qty = Number(qtyStr) || 1;
                                
                                const unit = String(row[colMap.unit] || '').trim() || 'ชิ้น';
                                
                                const priceStr = String(row[colMap.unitPrice] || '').replace(/,/g, '');
                                const unitPrice = Number(priceStr) || 0;
                                
                                // Auto calculate target price (as defined in updateItem logic)
                                const targetPrice = unitPrice > 0 ? Math.round(unitPrice / 1.35) : 0;
                                const foundPrice = 0;
                                const link = '';

                                proj.items.push({
                                    id: 'item_' + Date.now() + '_' + itemsAdded,
                                    name: name,
                                    qty: qty,
                                    unit: unit,
                                    unitPrice: unitPrice,
                                    targetPrice: targetPrice,
                                    foundPrice: foundPrice,
                                    storeInfo: '',
                                    link: link
                                });
                                itemsAdded++;
                            }

                            this.syncCurrentProject();
                            this.renderExcelTable();
                            this.hideExcelLoader();
                            setTimeout(() => this.showToast(`นำเข้าข้อมูล ${itemsAdded} รายการ สำเร็จ`, 'success'), 300);
                        } catch (error) {
                            console.error('Error parsing Excel:', error);
                            this.hideExcelLoader();
                            setTimeout(() => this.showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel', 'error'), 300);
                        }
                        
                        // Reset file input
                        event.target.value = '';
                    }, 800); // 800ms delay for visual feedback
                };
                reader.readAsArrayBuffer(file);
            },

            handleGlobalPaste(event) {
                // Only active if we are viewing a project (table is visible)
                if (!this.currentProjectId || document.getElementById('view-project-details').classList.contains('hidden')) {
                    return;
                }

                const clipboardData = event.clipboardData || window.clipboardData;
                if (!clipboardData) return;
                
                const pastedText = clipboardData.getData('text');
                if (!pastedText) return;

                const activeEl = document.activeElement;
                const isTableInput = activeEl && activeEl.classList.contains('excel-input');
                if (!isTableInput) return;

                const startField = activeEl.dataset.field;
                const startItemId = activeEl.dataset.id;

                // Check if it looks like tabular data (contains tabs or newlines)
                const isTabularData = pastedText.indexOf('\t') !== -1 || pastedText.indexOf('\n') !== -1;
                
                // If single-cell paste into a numeric field: clean commas, currency symbols (฿), and spaces
                if (!isTabularData) {
                    if (['qty', 'unitPrice', 'targetPrice', 'foundPrice', 'foundTotalPrice'].includes(startField)) {
                        event.preventDefault();
                        const cleanVal = pastedText.replace(/[฿,\s]/g, '').trim();
                        const numVal = cleanVal === '' ? '' : (Number(cleanVal) || 0);
                        activeEl.value = numVal;
                        this.updateItem(startItemId, startField, numVal);
                    }
                    return;
                }
                
                // Tabular paste
                event.preventDefault(); // Stop default pasting into the single input

                let rows = pastedText.split(/\r?\n/);
                // Excel adds a trailing newline, so remove only the last empty row if present
                if (rows.length > 0 && rows[rows.length - 1] === '') {
                    rows.pop();
                }
                if (rows.length === 0) return;

                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;

                // Table column order matching UI layout (including virtual totalSell column)
                const fields = ['mainNo', 'customNo', 'name', 'qty', 'unit', 'unitPrice', 'totalSell', 'targetPrice', 'foundPrice', 'foundTotalPrice', 'storeInfo', 'link'];
                const startColIdx = fields.indexOf(startField);
                const startRowIdx = proj.items.findIndex(i => i.id === startItemId);
                
                if (startColIdx === -1 || startRowIdx === -1) return;

                this.showExcelLoader();

                setTimeout(() => {
                    try {
                        for (let r = 0; r < rows.length; r++) {
                            const cols = rows[r].split('\t');
                            let currentRowIdx = startRowIdx + r;
                            
                            // Create new row if we paste beyond existing rows
                            if (currentRowIdx >= proj.items.length) {
                                proj.items.push({
                                    id: 'item_' + Date.now() + '_' + currentRowIdx,
                                    mainNo: (currentRowIdx + 1).toString(),
                                    customNo: '',
                                    name: '', qty: 1, unit: 'ชิ้น', unitPrice: '', targetPrice: '', foundPrice: '', foundTotalPrice: '', storeInfo: '', link: ''
                                });
                            }
                            
                            const item = proj.items[currentRowIdx];
                            if (item.isHeader) continue;
                            
                            for (let c = 0; c < cols.length; c++) {
                                let currentColIdx = startColIdx + c;
                                if (currentColIdx >= fields.length) break; // Ignore extra columns beyond our table
                                
                                const fieldName = fields[currentColIdx];
                                let val = cols[c].trim();
                                
                                // Skip totalSell column if pasted data has a total column (prevents overwriting targetPrice)
                                if (fieldName === 'totalSell') {
                                    continue;
                                }

                                // Clean up numbers if the field expects numbers
                                if (['qty', 'unitPrice', 'targetPrice', 'foundPrice', 'foundTotalPrice'].includes(fieldName)) {
                                    const cleanNum = Number(val.replace(/[฿,\s]/g, '')) || 0;
                                    
                                    if (fieldName === 'unitPrice') {
                                        item.unitPrice = cleanNum > 0 ? cleanNum : (val === '0' ? 0 : '');
                                        if (cleanNum > 0) {
                                            item.targetPrice = Math.round(cleanNum / 1.35);
                                        }
                                    } else if (fieldName === 'targetPrice') {
                                        // Only overwrite targetPrice if value is explicitly provided > 0
                                        if (cleanNum > 0) {
                                            item.targetPrice = cleanNum;
                                        } else if (Number(item.unitPrice) > 0 && (!item.targetPrice || Number(item.targetPrice) <= 0)) {
                                            item.targetPrice = Math.round(Number(item.unitPrice) / 1.35);
                                        }
                                    } else if (fieldName === 'foundPrice' && cleanNum > 0) {
                                        item.foundPrice = cleanNum;
                                        item.foundTotalPrice = Math.round(cleanNum * (item.qty || 0) * 100) / 100;
                                        const calculatedPrice = cleanNum * 1.35;
                                        item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                                        item.targetPrice = Math.round(item.unitPrice / 1.35);
                                    } else if (fieldName === 'foundTotalPrice' && cleanNum > 0) {
                                        item.foundTotalPrice = cleanNum;
                                        const qty = item.qty && item.qty > 0 ? item.qty : 1;
                                        item.foundPrice = Math.round((cleanNum / qty) * 100) / 100;
                                        const calculatedPrice = item.foundPrice * 1.35;
                                        item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                                        item.targetPrice = Math.round(item.unitPrice / 1.35);
                                    } else {
                                        item[fieldName] = cleanNum > 0 ? cleanNum : (val === '0' ? 0 : '');
                                    }
                                } else {
                                    item[fieldName] = val;
                                }
                            }

                            // Ensure targetPrice is always calculated if unitPrice exists
                            if (Number(item.unitPrice) > 0 && (!item.targetPrice || Number(item.targetPrice) <= 0)) {
                                item.targetPrice = Math.round(Number(item.unitPrice) / 1.35);
                            }
                        }

                        this.syncCurrentProject();
                        this.renderExcelTable();
                        this.hideExcelLoader();
                        setTimeout(() => this.showToast('วางข้อมูลลงในตารางสำเร็จ', 'success'), 300);

                        } catch(e) {
                            console.error(e);
                            this.hideExcelLoader();
                            setTimeout(() => this.showToast('เกิดข้อผิดพลาดในการวางข้อมูล', 'error'), 300);
                        }
                    }, 400); // Slight delay for UI rendering
                
                // If not pasting tabular data into a table cell, let default browser behavior handle it
            },

            // --- EXPORT TO EXCEL ---
            exportColumns: [
                { id: 'col-no', label: 'ลำดับ', field: 'no', checked: true },
                { id: 'col-name', label: 'รายการ', field: 'name', checked: true },
                { id: 'col-qty', label: 'จำนวน', field: 'qty', checked: true },
                { id: 'col-unit', label: 'หน่วย', field: 'unit', checked: true },
                { id: 'col-unitPrice', label: 'ราคา/หน่วย (ขาย)', field: 'unitPrice', checked: true },
                { id: 'col-targetPrice', label: 'ราคาที่ควรซื้อ', field: 'targetPrice', checked: true },
                { id: 'col-foundPrice', label: 'ราคาที่หาได้ (ทุน)', field: 'foundPrice', checked: true },
                { id: 'col-totalSell', label: 'รวมเงิน (ราคาขาย)', field: 'totalSell', checked: true },
                { id: 'col-totalCost', label: 'รวมเงิน (ราคาทุน)', field: 'totalCost', checked: true },
                { id: 'col-profit', label: 'กำไร', field: 'profit', checked: true },
                { id: 'col-storeInfo', label: 'ข้อมูลร้าน', field: 'storeInfo', checked: true },
                { id: 'col-link', label: 'ลิงก์ร้านค้า', field: 'link', checked: true }
            ],

            openExportModal() {
                const modal = document.getElementById('export-excel-modal');
                const content = document.getElementById('export-excel-modal-content');
                const list = document.getElementById('export-columns-list');
                
                // Render checkboxes
                list.innerHTML = this.exportColumns.map(col => `
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                        <div class="relative flex items-center">
                            <input type="checkbox" id="${col.id}" class="peer sr-only" ${col.checked ? 'checked' : ''} onchange="appData.toggleExportColumn('${col.id}', this.checked)">
                            <div class="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all flex items-center justify-center">
                                <i class="fa-solid fa-check text-white text-xs opacity-0 peer-checked:opacity-100"></i>
                            </div>
                        </div>
                        <span class="text-sm font-semibold text-slate-700">${col.label}</span>
                    </label>
                `).join('');

                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            closeExportModal() {
                const modal = document.getElementById('export-excel-modal');
                const content = document.getElementById('export-excel-modal-content');
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 300);
            },

            toggleExportColumn(id, isChecked) {
                const col = this.exportColumns.find(c => c.id === id);
                if (col) col.checked = isChecked;
            },

            executeExport() {
                if (!this.currentProjectId) return;
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;

                if (typeof XLSX === 'undefined') {
                    this.showToast('เกิดข้อผิดพลาด: ไม่พบไลบรารี SheetJS', 'error');
                    return;
                }

                // Filter active columns
                const activeCols = this.exportColumns.filter(c => c.checked);
                if (activeCols.length === 0) {
                    this.showToast('กรุณาเลือกอย่างน้อย 1 คอลัมน์', 'error');
                    return;
                }

                // Prepare data array for Excel
                const data = [];
                
                // 1. Header Row
                const headerRow = activeCols.map(c => c.label);
                data.push(headerRow);

                let sumSell = 0;
                let sumCost = 0;
                let sumProfit = 0;

                // 2. Data Rows
                proj.items.forEach((item, index) => {
                    const rowData = [];
                    
                    const qty = item.qty || 0;
                    const unitPrice = item.unitPrice || 0;
                    const foundPrice = item.foundPrice || 0;
                    const targetPrice = item.targetPrice || 0;
                    
                    const totalSell = qty * unitPrice;
                    const totalCost = qty * foundPrice;
                    const profit = qty * (unitPrice - foundPrice);
                    
                    sumSell += totalSell;
                    sumCost += totalCost;
                    sumProfit += profit;

                    activeCols.forEach(col => {
                        switch (col.field) {
                            case 'no': rowData.push(index + 1); break;
                            case 'name': rowData.push(item.name || ''); break;
                            case 'qty': rowData.push(qty); break;
                            case 'unit': rowData.push(item.unit || ''); break;
                            case 'unitPrice': rowData.push(unitPrice); break;
                            case 'targetPrice': rowData.push(targetPrice); break;
                            case 'foundPrice': rowData.push(foundPrice); break;
                            case 'totalSell': rowData.push(totalSell); break;
                            case 'totalCost': rowData.push(totalCost); break;
                            case 'profit': rowData.push(profit); break;
                            case 'storeInfo': rowData.push(item.storeInfo || ''); break;
                            case 'link': rowData.push(item.link || ''); break;
                        }
                    });
                    data.push(rowData);
                });

                // 3. Footer Row (Totals)
                if (proj.items.length > 0) {
                    const footerRow = [];
                    activeCols.forEach(col => {
                        if (col.field === 'name') {
                            footerRow.push('รวมสุทธิ');
                        } else if (col.field === 'totalSell') {
                            footerRow.push(sumSell);
                        } else if (col.field === 'totalCost') {
                            footerRow.push(sumCost);
                        } else if (col.field === 'profit') {
                            // If they selected profit, we output the absolute profit sum or %?
                            // In Excel it's usually absolute sum, but let's just do absolute sum here for exact calculation.
                            footerRow.push(sumProfit);
                        } else {
                            footerRow.push('');
                        }
                    });
                    data.push(footerRow);
                }

                // Create Worksheet
                const ws = XLSX.utils.aoa_to_sheet(data);

                // Auto-size columns to make it readable
                const colWidths = activeCols.map(col => {
                    if (col.field === 'no') return { wch: 5 };
                    if (col.field === 'name') return { wch: 40 };
                    if (col.field === 'storeInfo') return { wch: 20 };
                    if (col.field === 'link') return { wch: 30 };
                    return { wch: 15 }; // Default for numbers
                });
                ws['!cols'] = colWidths;

                // Create Workbook and save
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "รายการจัดซื้อ");
                
                const safeName = proj.name ? proj.name.replace(/[/\\?%*:|"<>]/g, '-') : 'Project';
                const dateStr = new Date().toISOString().slice(0,10);
                
                XLSX.writeFile(wb, `${safeName}_${dateStr}.xlsx`);
                
                this.closeExportModal();
                this.showToast('ดาวน์โหลดไฟล์ Excel สำเร็จ', 'success');
            }
        };

        // Initialize application when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            appData.init();
            
            const tbody = document.getElementById('excel-tbody');
            if (tbody && typeof Sortable !== 'undefined') {
                new Sortable(tbody, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-slate-50',
                    onEnd: function (evt) {
                        if (!appData.currentProjectId) return;
                        const proj = appData.projects.find(p => p.id === appData.currentProjectId);
                        if (!proj) return;
                        
                        // Reorder the array
                        const movedItem = proj.items.splice(evt.oldIndex, 1)[0];
                        proj.items.splice(evt.newIndex, 0, movedItem);
                        
                        appData.syncCurrentProject();
                        appData.renderExcelTable();
                    }
                });
            }
            
            document.addEventListener('click', (e) => {
                const container = document.getElementById('shop-dropdown-container');
                if (container && !container.contains(e.target) && window.appData) {
                    appData.hideShopDropdown();
                }
                if (!e.target.closest('[id^="color-menu-"]')) {
                    document.querySelectorAll('[id^="color-popup-"]').forEach(el => el.classList.add('hidden'));
                }
            });
        });

    