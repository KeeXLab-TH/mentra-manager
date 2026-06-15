
        // Data Store
        window.appData = {
            projects: [],
            institutionLogos: {},
            currentProjectId: null,
            currentInstitution: null,
            uploadingLogoFor: null,
            selectedLogoBase64: null,

            // Helpers for formatting
            formatCurrency(num) {
                return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
            },
            getSafeImageUrl(url) {
                if (!url) return '';
                if (url.includes('drive.google.com/uc?id=')) {
                    const fileId = new URLSearchParams(url.split('?')[1]).get('id');
                    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
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
            
            showGlobalLoader(title = 'กำลังประมวลผล...', subtitle = 'กรุณารอสักครู่', iconClass = 'fa-spinner') {
                const overlay = document.getElementById('global-loading-overlay');
                const content = document.getElementById('global-loading-content');
                document.getElementById('global-loading-title').innerText = title;
                document.getElementById('global-loading-subtitle').innerText = subtitle;
                document.getElementById('global-loading-icon').className = `fa-solid ${iconClass} absolute inset-0 flex items-center justify-center text-brand-500 text-xl animate-pulse`;
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    content.classList.remove('scale-95');
                }, 10);
            },

            hideGlobalLoader() {
                const overlay = document.getElementById('global-loading-overlay');
                const content = document.getElementById('global-loading-content');
                overlay.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
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
                // Initial render in case Firebase takes a moment
                this.showInstitutionsView();
                
                // Bind paste event for copying from Excel
                document.addEventListener('paste', this.handleGlobalPaste.bind(this));
                
                // Init table resizers
                setTimeout(() => this.initResizers(), 100);
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
                
                if (this.institutionLogos[name] === undefined) {
                    this.institutionLogos[name] = '';
                    this.renderInstitutions();
                    if (window.saveInstitutionLogoToFirestore) {
                        window.saveInstitutionLogoToFirestore(name, '');
                    }
                }
                
                this.closeAddInstitutionModal();
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
                if (instName) {
                    this.currentInstitution = instName;
                }
                
                this.currentProjectId = null;
                document.getElementById('view-institutions').classList.add('hidden');
                document.getElementById('view-projects').classList.remove('hidden');
                document.getElementById('view-project-details').classList.add('hidden');
                
                // Update subtitle to show selected institution
                document.getElementById('projects-view-subtitle').innerText = this.currentInstitution || 'ไม่ระบุสถานศึกษา';
                
                this.renderProjects();
            },

            showProjectDetails(projectId) {
                this.currentProjectId = projectId;
                document.getElementById('view-institutions').classList.add('hidden');
                document.getElementById('view-projects').classList.add('hidden');
                document.getElementById('view-project-details').classList.remove('hidden');

                const proj = this.projects.find(p => p.id === projectId);
                if (!proj) return;

                this.updateProjectDetailsUI(proj);
                this.renderExcelTable();
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
                const tableCard = document.getElementById('detail-view-table');
                const galleryCard = document.getElementById('detail-view-gallery');
                
                if (tab === 'table') {
                    tableBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-lg";
                    galleryBtn.className = "px-5 py-3 border-b-2 font-medium transition-colors border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg";
                    tableCard.classList.remove('hidden');
                    galleryCard.classList.add('hidden');
                } else if (tab === 'gallery') {
                    galleryBtn.className = "px-5 py-3 border-b-2 font-bold transition-colors border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-lg";
                    tableBtn.className = "px-5 py-3 border-b-2 font-medium transition-colors border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg";
                    galleryCard.classList.remove('hidden');
                    tableCard.classList.add('hidden');
                    this.renderGallery();
                }
            },
            
            // Gallery Rendering
            renderGallery() {
                const grid = document.getElementById('gallery-grid');
                if (!grid) return;
                
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj || !proj.items || proj.items.length === 0) {
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
                proj.items.forEach((item, index) => {
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

                    let imagesHtml = '';
                    item.images.forEach((img, imgIndex) => {
                        imagesHtml += `
                            <div class="h-32 min-w-[8rem] max-w-sm shrink-0 relative bg-slate-100 flex items-center justify-center rounded-xl overflow-hidden group cursor-pointer border border-slate-200 shadow-sm hover:border-brand-300 transition-colors" onclick="appData.openLightbox('${item.id}', ${imgIndex})">
                                <img src="${appData.getSafeImageUrl(img)}" alt="Image" class="h-full w-auto max-w-full object-contain" onerror="this.src='https://placehold.co/150x150/f8fafc/cbd5e1?text=No+Image'; this.onerror=null;">
                                <div class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div class="bg-white/90 backdrop-blur-sm text-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                                        <i class="fa-solid fa-expand text-xs"></i>
                                    </div>
                                </div>
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
            
            // Image Modal Management
            currentImageItemId: null,
            async openImageModal(itemId) {
                console.log('openImageModal called for item:', itemId);
                
                let proj = null;
                let item = null;
                
                for (const p of this.projects) {
                    if (!p.items) continue;
                    const itemsList = Array.isArray(p.items) ? p.items : Object.values(p.items);
                    const foundItem = itemsList.find(i => String(i.id) === String(itemId));
                    if (foundItem) {
                        proj = p;
                        item = foundItem;
                        break;
                    }
                }
                if (!proj || !item) {
                    console.error('openImageModal: Item not found in any project!', itemId);
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
                    // Debug message to confirm function is called
                    console.log('quickAddImageFromClipboard called with itemId:', itemId);
                    
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
                                                    if (!p.items) continue;
                                                    const itemsList = Array.isArray(p.items) ? p.items : Object.values(p.items);
                                                    const foundItem = itemsList.find(i => String(i.id) === String(itemId));
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

                                                Swal.fire({
                                                    title: 'กำลังอัปโหลดรูปภาพ...',
                                                    html: 'กำลังเตรียมโฟลเดอร์',
                                                    allowOutsideClick: false,
                                                    didOpen: () => { Swal.showLoading(); }
                                                });
                                                
                                                // 1. Get/Create Folders
                                                const instName = proj.institution && proj.institution.trim() !== '' ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                                                const instFolderId = await window.driveIntegration.getOrCreateFolder(instName, window.DRIVE_ROOT_FOLDER_ID);
                                                const sysFolderId = await window.driveIntegration.getOrCreateFolder('ระบบจัดซื้อวัสดุอุปกรณ์', instFolderId);
                                                
                                                // 2. Upload using Resumable Upload
                                                const filename = `item_${itemId}_${Date.now()}.jpg`;
                                                const driveUrl = await window.driveIntegration.uploadImageResumable(blob, filename, sysFolderId);
                                                
                                                // 3. Save to Firebase
                                                item.images.push(driveUrl);
                                                this.updateItem(itemId, 'images', item.images);
                                                this.renderGallery();
                                                Swal.close();
                                                this.showToast('เพิ่มรูปภาพสำเร็จ!', 'success');
                                            } catch (error) {
                                                console.error('Drive Upload Error:', error);
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
                    if (!p.items) continue;
                    const itemsList = Array.isArray(p.items) ? p.items : Object.values(p.items);
                    const foundItem = itemsList.find(i => String(i.id) === String(this.currentImageItemId));
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
                    Swal.fire({
                        title: 'กำลังอัปโหลดรูปภาพ...',
                        html: 'กำลังอัปโหลดไปยัง Google Drive',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    
                    try {
                        const fetchResponse = await fetch(url);
                        const blob = await fetchResponse.blob();
                        
                        const instName = proj.institution && proj.institution.trim() !== '' ? proj.institution.trim() : 'ไม่ระบุสถานศึกษา';
                        const instFolderId = await window.driveIntegration.getOrCreateFolder(instName, window.DRIVE_ROOT_FOLDER_ID);
                        const sysFolderId = await window.driveIntegration.getOrCreateFolder('ระบบจัดซื้อวัสดุอุปกรณ์', instFolderId);
                        
                        const filename = `item_${this.currentImageItemId}_${Date.now()}.jpg`;
                        const driveUrl = await window.driveIntegration.uploadImageResumable(blob, filename, sysFolderId);
                        
                        item.images.push(driveUrl);
                        this.updateItem(this.currentImageItemId, 'images', item.images);
                        this.closeImageModal();
                        this.renderGallery();
                        Swal.close();
                        this.showToast('เพิ่มรูปภาพสำเร็จ!', 'success');
                    } catch (error) {
                        console.error('Drive Upload Error:', error);
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
                const item = proj.items.find(i => i.id === itemId);
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
                const item = proj.items.find(i => i.id === this.currentLightboxItemId);
                if (!item || !item.images) return;
                
                const imgUrl = item.images[this.currentLightboxImageIndex];
                const imgElement = document.getElementById('lightbox-image');
                imgElement.src = this.getSafeImageUrl(imgUrl);
                
                document.getElementById('lightbox-counter').innerText = `${this.currentLightboxImageIndex + 1} / ${item.images.length}`;
            },
            
            prevLightboxImage() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                const item = proj.items.find(i => i.id === this.currentLightboxItemId);
                if (!item || !item.images) return;
                
                this.currentLightboxImageIndex--;
                if (this.currentLightboxImageIndex < 0) {
                    this.currentLightboxImageIndex = item.images.length - 1;
                }
                this.updateLightboxImage();
            },
            
            nextLightboxImage() {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                const item = proj.items.find(i => i.id === this.currentLightboxItemId);
                if (!item || !item.images) return;
                
                this.currentLightboxImageIndex++;
                if (this.currentLightboxImageIndex >= item.images.length) {
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
                document.getElementById('modal-proj-inst').value = this.currentInstitution || '';
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
                document.getElementById('modal-proj-inst').value = proj.institution || '';
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
            
            saveProject() {
                const name = document.getElementById('modal-proj-name').value.trim();
                const code = document.getElementById('modal-proj-code').value.trim();
                const date = document.getElementById('modal-proj-date').value;
                const dept = document.getElementById('modal-proj-dept').value.trim();
                const inst = document.getElementById('modal-proj-inst').value.trim();
                const teacher = document.getElementById('modal-proj-teacher').value.trim();
                const status = document.getElementById('modal-proj-status').value;
                const remarks = document.getElementById('modal-proj-remarks').value.trim();
                
                if (!name || !code || !date) {
                    alert('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
                    return;
                }
                
                if (this.isEditMode) {
                    const proj = this.projects.find(p => p.id === this.currentProjectId);
                    if (proj) {
                        proj.name = name;
                        proj.code = code;
                        proj.date = date;
                        proj.department = dept;
                        proj.institution = inst;
                        proj.teacher = teacher;
                        proj.status = status;
                        proj.remarks = remarks;
                        
                        // Sync to firebase
                        if (window.saveProjectToFirestore) {
                            window.saveProjectToFirestore(proj);
                        } else {
                            this.updateProjectDetailsUI(proj);
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
                        teacher: teacher,
                        status: status,
                        remarks: remarks,
                        items: []
                    };
                    if (window.saveProjectToFirestore) {
                        window.saveProjectToFirestore(newProj);
                    } else {
                        this.projects.unshift(newProj);
                        this.renderProjects();
                    }
                }
                
                this.closeAddProjectModal();
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
                    grid.innerHTML = `
                        <div class="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <i class="fa-solid fa-school fa-2x mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">ยังไม่มีข้อมูลสถานศึกษา</p>
                            <p class="text-sm mt-1">โปรดเพิ่มโครงการเพื่อเริ่มต้นใช้งาน</p>
                        </div>
                    `;
                    return;
                }
                
                Array.from(instMap.entries()).forEach(([instName, stats]) => {
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
                    
                    el.className = "bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(26,111,191,0.08)] hover:border-brand-200 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4";
                    
                    el.innerHTML = `
                        <div class="flex items-center gap-5 flex-1">
                            <div class="relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${iconBg}">
                                ${logoHtml}
                                ${editLogoBtn}
                            </div>
                            <div>
                                <h3 class="text-xl font-bold transition-colors line-clamp-1 ${titleClass}">${instName}</h3>
                                <div class="flex items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium">
                                    <div class="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide">
                                        ${stats.count} โครงการ
                                    </div>
                                    <span class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-boxes-stacked text-slate-400"></i> รวม ${stats.itemsCount} รายการพัสดุ
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="shrink-0 flex items-center justify-end mt-2 sm:mt-0">
                            <span class="text-sm font-bold text-brand-600 bg-brand-50 px-4 py-2.5 rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-colors flex items-center gap-2">
                                ดูโครงการ <i class="fa-solid fa-arrow-right"></i>
                            </span>
                        </div>
                    `;
                    grid.appendChild(el);
                });
            },

            // Rendering Projects Grid
            renderProjects() {
                const grid = document.getElementById('projects-grid');
                if (!grid) return;
                grid.innerHTML = '';

                // Filter by current institution
                let filteredProjects = this.projects;
                if (this.currentInstitution) {
                    filteredProjects = this.projects.filter(p => {
                        const inst = p.institution ? p.institution.trim() : 'ไม่ระบุสถานศึกษา';
                        return inst === this.currentInstitution;
                    });
                }
                
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
                        <div class="flex items-center gap-4 pl-2">
                            <div>
                                <h3 class="font-bold text-lg text-slate-800 leading-tight group-hover:text-brand-600 transition-colors mb-1.5">${proj.name}</h3>
                                <div class="flex flex-wrap items-center gap-3">
                                    <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${proj.code}</span>
                                    <span class="text-sm text-slate-500 flex items-center gap-1.5">
                                        <i class="fa-solid fa-boxes-stacked text-slate-400"></i> จำนวน ${proj.items.length} รายการ
                                    </span>
                                    <span class="text-sm text-slate-500 flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-solid fa-building text-slate-400"></i> ${deptText}
                                    </span>
                                    <span class="text-sm text-slate-500 flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-regular fa-calendar text-slate-400"></i> ${displayDate}
                                    </span>
                                    <span class="text-sm text-slate-500 flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                        <i class="fa-solid fa-user-tie text-slate-400"></i> ${teacherText}
                                    </span>
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
                            <span class="text-sm font-semibold text-brand-600 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                                ดูรายละเอียด <i class="fa-solid fa-arrow-right-long"></i>
                            </span>
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

                proj.items.forEach((item, index) => {
                    // Calculations
                    const totalAmt = (item.qty || 0) * (item.unitPrice || 0);
                    
                    // Profit (%) calculation based on requirement: diff between unitPrice and foundPrice
                    // Profit = unitPrice - foundPrice
                    // Profit % = (Profit / unitPrice) * 100
                    let profitPct = 0;
                    if (item.unitPrice && item.foundPrice) {
                        profitPct = ((item.unitPrice - item.foundPrice) / item.foundPrice) * 100;
                    }
                    
                    let profitClass = profitPct > 0 ? 'text-emerald-600' : (profitPct < 0 ? 'text-red-500' : 'text-slate-500');

                    sumTotal += totalAmt;
                    sumTarget += (item.qty || 0) * (item.targetPrice || 0);
                    sumFound += (item.qty || 0) * (item.foundPrice || 0);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="text-center text-slate-500 font-medium">${index + 1}</td>
                        <td>
                            <input type="text" class="excel-input font-medium text-slate-800" data-id="${item.id}" data-field="name" value="${item.name}" onchange="appData.updateItem('${item.id}', 'name', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="ชื่อรายการ">
                        </td>
                        <td>
                            <input type="number" class="excel-input text-right" data-id="${item.id}" data-field="qty" value="${item.qty}" onchange="appData.updateItem('${item.id}', 'qty', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0">
                        </td>
                        <td>
                            <input type="text" class="excel-input text-center" data-id="${item.id}" data-field="unit" value="${item.unit}" onchange="appData.updateItem('${item.id}', 'unit', this.value)" onkeydown="appData.handleExcelKeydown(event)" placeholder="หน่วย">
                        </td>
                        <td>
                            <input type="number" class="excel-input text-right" data-id="${item.id}" data-field="unitPrice" value="${item.unitPrice}" onchange="appData.updateItem('${item.id}', 'unitPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0">
                        </td>
                        <td class="col-total p-0">
                            <div class="px-1 py-2 text-amber-900 text-[13px] sm:text-sm truncate" title="${this.formatCurrency(totalAmt)}">${this.formatCurrency(totalAmt)}</div>
                        </td>
                        <td>
                            <input type="number" class="excel-input text-right text-blue-700" data-id="${item.id}" data-field="targetPrice" value="${item.targetPrice}" onchange="appData.updateItem('${item.id}', 'targetPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0">
                        </td>
                        <td>
                            <input type="number" class="excel-input text-right text-emerald-700 font-semibold" data-id="${item.id}" data-field="foundPrice" value="${item.foundPrice}" onchange="appData.updateItem('${item.id}', 'foundPrice', this.value)" onkeydown="appData.handleExcelKeydown(event)" min="0">
                        </td>
                        <td class="text-center font-bold ${profitClass}">
                            ${profitPct !== 0 ? profitPct.toFixed(2) + '%' : '-'}
                        </td>
                        <td>
                            <input type="text" class="excel-input text-xs" data-id="${item.id}" data-field="storeInfo" placeholder="ชื่อ/เบอร์ร้าน" value="${item.storeInfo || ''}" onchange="appData.updateItem('${item.id}', 'storeInfo', this.value)" onkeydown="appData.handleExcelKeydown(event)">
                        </td>
                        <td class="text-center">
                            <div class="flex items-center justify-center gap-1 p-1">
                                <input type="text" class="excel-input text-xs !min-h-[28px] !p-1 border border-slate-200 rounded" data-id="${item.id}" data-field="link" placeholder="URL" value="${item.link || ''}" onchange="appData.updateItem('${item.id}', 'link', this.value)" onkeydown="appData.handleExcelKeydown(event)">
                                ${item.link ? `<a href="${item.link}" target="_blank" class="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0" title="เปิดลิงก์"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a>` : ''}
                            </div>
                        </td>
                        <td class="text-center">
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="appData.duplicateItemRow('${item.id}')" class="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center" title="คัดลอกรายการ">
                                    <i class="fa-regular fa-copy text-xs"></i>
                                </button>
                                <button onclick="appData.deleteItem('${item.id}')" class="w-7 h-7 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center justify-center" title="ลบรายการ">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                if(proj.items.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="11" class="text-center p-8 text-slate-500 font-medium">ยังไม่มีรายการสิ่งของ กด "เพิ่มรายการสินค้า" เพื่อเริ่มต้น</td></tr>`;
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
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                proj.items.push({
                    id: 'item_' + Date.now(),
                    name: '',
                    qty: 1,
                    unit: '',
                    unitPrice: 0,
                    targetPrice: 0,
                    foundPrice: 0,
                    storeInfo: '',
                    link: ''
                });
                
                this.syncCurrentProject();
                this.renderExcelTable();
            },

            updateItem(itemId, field, value) {
                const proj = this.projects.find(p => p.id === this.currentProjectId);
                if (!proj) return;
                
                const item = proj.items.find(i => i.id === itemId);
                if (!item) return;

                if (['qty', 'unitPrice', 'targetPrice', 'foundPrice'].includes(field)) {
                    item[field] = Number(value) || 0;
                    
                    // Auto-calculate unitPrice if foundPrice is changed
                    if (field === 'foundPrice' && item.foundPrice > 0) {
                        const calculatedPrice = item.foundPrice * 1.35;
                        // Round up to nearest 5 (e.g. 4 -> 5, 6 -> 10)
                        item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                        item.targetPrice = Math.round(item.unitPrice / 1.35);
                    }

                    // Auto-calculate targetPrice if unitPrice is changed
                    if (field === 'unitPrice' && item.unitPrice > 0) {
                        item.targetPrice = Math.round(item.unitPrice / 1.35);
                    }
                } else {
                    item[field] = value;
                }

                this.syncCurrentProject();
                this.renderExcelTable(); // Re-render to update calculations
            },

            deleteItem(itemId) {
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

                // Check if it looks like tabular data (contains tabs or newlines)
                const isTabularData = pastedText.indexOf('\t') !== -1 || pastedText.indexOf('\n') !== -1;
                
                const activeEl = document.activeElement;
                const isTableInput = activeEl && activeEl.classList.contains('excel-input');
                
                // Only intercept if we have tabular data AND the user is focused on a table input cell
                if (isTableInput && isTabularData) {
                    event.preventDefault(); // Stop default pasting into the single input

                    const rows = pastedText.split(/\r?\n/).filter(r => r.trim() !== '');
                    if (rows.length === 0) return;

                    const proj = this.projects.find(p => p.id === this.currentProjectId);
                    if (!proj) return;

                    // Table column order that matches the UI
                    const fields = ['name', 'qty', 'unit', 'unitPrice', 'targetPrice', 'foundPrice', 'storeInfo', 'link'];
                    const startField = activeEl.dataset.field;
                    const startItemId = activeEl.dataset.id;
                    
                    let startColIdx = fields.indexOf(startField);
                    let startRowIdx = proj.items.findIndex(i => i.id === startItemId);
                    
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
                                        name: '', qty: 1, unit: 'ชิ้น', unitPrice: 0, targetPrice: 0, foundPrice: 0, storeInfo: '', link: ''
                                    });
                                }
                                
                                const item = proj.items[currentRowIdx];
                                
                                for (let c = 0; c < cols.length; c++) {
                                    let currentColIdx = startColIdx + c;
                                    if (currentColIdx >= fields.length) break; // Ignore extra columns beyond our table
                                    
                                    const fieldName = fields[currentColIdx];
                                    let val = cols[c].trim();
                                    
                                    // Clean up numbers if the field expects numbers
                                    if (['qty', 'unitPrice', 'targetPrice', 'foundPrice'].includes(fieldName)) {
                                        val = Number(val.replace(/,/g, '')) || 0;
                                        item[fieldName] = val;
                                        
                                        // Auto-calculate logic (matching updateItem)
                                        if (fieldName === 'foundPrice' && val > 0) {
                                            const calculatedPrice = val * 1.35;
                                            item.unitPrice = Math.ceil(calculatedPrice / 5) * 5;
                                            item.targetPrice = Math.round(item.unitPrice / 1.35);
                                        }
                                        if (fieldName === 'unitPrice' && val > 0) {
                                            item.targetPrice = Math.round(val / 1.35);
                                        }
                                    } else {
                                        item[fieldName] = val;
                                    }
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
                }
                
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
        });

    