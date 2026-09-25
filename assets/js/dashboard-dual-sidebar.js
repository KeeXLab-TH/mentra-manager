/**
 * ==============================================================================
 * MENTRA MANAGER — DUAL-RAIL SIDEBAR & MULTI-SHOP WORKSPACE CONTROLLER
 * Shared across all application pages for 100% consistent UX/UI
 * ==============================================================================
 */

(function () {
    'use strict';

    if (window.__mentra_dual_sidebar_loaded) {
        return;
    }
    window.__mentra_dual_sidebar_loaded = true;

    const WS_STORAGE_KEY = 'mentra_managed_workspaces';
    const WS_ACTIVE_KEY = 'mentra_active_workspace';
    const WS_DEFAULT_NAME = 'Mentra Solution';

    let currentShopLogoBase64 = '';
    let editingShopId = null;

    // Helper functions
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ===== 1. WORKSPACE MANAGEMENT =====
    function getManagedWorkspaces() {
        try {
            const stored = localStorage.getItem(WS_STORAGE_KEY);
            if (stored) {
                const list = JSON.parse(stored);
                if (Array.isArray(list) && list.length > 0) {
                    let needsUpdate = false;
                    list.forEach(w => {
                        if ((w.isDefault || w.name === 'Mentra Solution') && (!w.logo || w.logo.trim() === '')) {
                            w.logo = '../../assets/img/logo.png';
                            needsUpdate = true;
                        }
                    });
                    if (needsUpdate) {
                        localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(list));
                    }
                    return list;
                }
            }
        } catch (e) {
            console.error('Failed to parse managed workspaces:', e);
        }
        const defaultList = [
            {
                id: 'ws_default',
                name: WS_DEFAULT_NAME,
                shortCode: 'MS',
                category: 'บริษัทหลัก',
                logo: '../../assets/img/logo.png',
                phone: '02-000-0000',
                email: 'accounts@mentrasolution.com',
                taxId: '0105500000000',
                address: 'กรุงเทพมหานคร',
                isDefault: true,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(defaultList));
        return defaultList;
    }
    window.getManagedWorkspaces = getManagedWorkspaces;

    function getActiveWorkspaceName() {
        return localStorage.getItem(WS_ACTIVE_KEY) || WS_DEFAULT_NAME;
    }
    window.getActiveWorkspaceName = getActiveWorkspaceName;

    function setActiveWorkspaceName(name) {
        localStorage.setItem(WS_ACTIVE_KEY, name);
        const workspaces = getManagedWorkspaces();
        const ws = workspaces.find(w => w.name === name) || { name: name, shortCode: 'MS' };
        updateSidebarShopDisplay(ws);
    }
    window.setActiveWorkspaceName = setActiveWorkspaceName;

    function updateSidebarShopDisplay(ws) {
        if (!ws) {
            const workspaces = getManagedWorkspaces();
            const activeName = getActiveWorkspaceName();
            ws = workspaces.find(w => w.name === activeName) || workspaces[0];
        }
        const orgNameEl = document.getElementById('sidebarOrgName');
        const orgLogoEl = document.getElementById('sidebarOrgLogo');
        const orgInitialsEl = document.getElementById('sidebarOrgInitials');
        const orgEmailEl = document.getElementById('sidebarUserEmail');

        if (orgNameEl && ws) orgNameEl.textContent = ws.name;
        if (orgEmailEl && ws && ws.email) orgEmailEl.textContent = ws.email;

        const logoUrl = (ws && ws.logo) ? ws.logo : (ws && (ws.name === 'Mentra Solution' || ws.isDefault) ? '../../assets/img/logo.png' : '');

        if (logoUrl && orgLogoEl) {
            orgLogoEl.src = logoUrl;
            orgLogoEl.style.display = 'block';
            if (orgInitialsEl) orgInitialsEl.style.display = 'none';
        } else if (orgInitialsEl) {
            if (orgLogoEl) orgLogoEl.style.display = 'none';
            orgInitialsEl.textContent = ((ws && ws.shortCode) || (ws && ws.name ? ws.name.charAt(0) : 'M')).toUpperCase();
            orgInitialsEl.style.display = 'block';
        }
    }
    window.updateSidebarShopDisplay = updateSidebarShopDisplay;

    function renderWorkspacePopoverList() {
        const listEl = document.getElementById('orgSwitcherPopoverList');
        if (!listEl) return;
        const workspaces = getManagedWorkspaces();
        const activeName = getActiveWorkspaceName();

        listEl.innerHTML = workspaces.map(ws => {
            const isSelected = ws.name === activeName;
            const safeName = escapeHtml(ws.name);
            const attrName = escapeAttr(ws.name);
            const logoUrl = ws.logo || (ws.name === 'Mentra Solution' || ws.isDefault ? '../../assets/img/logo.png' : '');

            const thumbContent = logoUrl
                ? `<img src="${logoUrl}" alt="${safeName}">`
                : `<span>${escapeHtml(ws.shortCode || ws.name.charAt(0) || 'M')}</span>`;

            return `
                <div class="popover-item ${isSelected ? 'selected' : ''}" onclick="selectWorkspace('${attrName}')">
                    <div class="popover-item-left">
                        <div class="popover-shop-thumb">
                            ${thumbContent}
                        </div>
                        <div class="popover-shop-meta">
                            <div class="popover-item-title">${safeName}</div>
                            <div class="popover-shop-sub">${escapeHtml(ws.category || (ws.isDefault ? 'บริษัทหลัก' : 'ร้านค้า'))}</div>
                        </div>
                    </div>
                    <div class="popover-item-right" onclick="event.stopPropagation();">
                        ${ws.isDefault ? `<span class="popover-default-badge">หลัก</span>` : ''}
                        <button type="button" class="popover-edit-btn" title="แก้ไขข้อมูลร้าน" onclick="openShopModal('${ws.id}')">
                            <i class='bx bx-pencil'></i>
                        </button>
                        ${!ws.isDefault ? `
                            <button type="button" class="popover-del-btn" title="ลบร้านค้า" onclick="handleDeleteWorkspace('${ws.id}', event)">
                                <i class='bx bx-trash'></i>
                            </button>
                        ` : ''}
                        <div class="popover-status-indicator">
                            ${isSelected ? `<i class='bx bxs-check-circle' style="color:#0d4b85; font-size:17px;"></i>` : `<i class='bx bx-radio-circle' style="color:#cbd5e1; font-size:17px;"></i>`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    window.renderWorkspacePopoverList = renderWorkspacePopoverList;

    function toggleOrgPopover(e) {
        if (e) e.stopPropagation();
        const popover = document.getElementById('orgSwitcherPopover');
        if (popover) {
            const willShow = !popover.classList.contains('show');
            if (willShow) {
                renderWorkspacePopoverList();
            }
            popover.classList.toggle('show');
        }
    }
    window.toggleOrgPopover = toggleOrgPopover;

    async function selectWorkspace(name) {
        setActiveWorkspaceName(name);
        renderWorkspacePopoverList();

        const popover = document.getElementById('orgSwitcherPopover');
        if (popover) popover.classList.remove('show');

        // Check if on Dashboard project detail view
        const detailView = document.getElementById('view-detail');
        if (detailView && detailView.classList.contains('active')) {
            if (typeof window.currentProjectData !== 'undefined' && window.currentProjectData) {
                if (window.projectBelongsToActiveWorkspace && !window.projectBelongsToActiveWorkspace(window.currentProjectData, name)) {
                    if (typeof window.navigateTo === 'function') {
                        window.navigateTo('dashboard');
                    }
                }
            }
        }

        // Trigger page-specific refresh if available
        if (typeof window.loadDashboard === 'function') {
            await window.loadDashboard();
        }
        if (typeof window.loadProjects === 'function') {
            await window.loadProjects();
        } else if (typeof window.filterProjects === 'function') {
            window.filterProjects();
        }

        if (typeof window.updateProjectsTree === 'function') {
            const wsProjects = window.getWorkspaceProjects ? window.getWorkspaceProjects(window.allProjects || [], name) : [];
            window.updateProjectsTree(wsProjects);
        }

        if (typeof window.loadItemsPage === 'function') {
            const itemsView = document.getElementById('view-items');
            if (itemsView && itemsView.classList.contains('active')) {
                window.loadItemsPage();
            }
        }

        // Dispatch custom event for any other page listening for shop switch
        window.dispatchEvent(new CustomEvent('mentra-workspace-changed', { detail: { workspace: name } }));

        if (typeof window.showToast === 'function') {
            window.showToast(`สลับไปยังร้านค้า: ${name}`, 'info');
        } else if (typeof window.ToastManager !== 'undefined') {
            window.ToastManager.show(`สลับไปยังร้านค้า: ${name}`, 'info');
        }
    }
    window.selectWorkspace = selectWorkspace;

    // ===== 2. SHOP MODAL CONTROLS =====
    window.openShopModal = function (shopId = null) {
        const popover = document.getElementById('orgSwitcherPopover');
        if (popover) popover.classList.remove('show');

        editingShopId = shopId;
        currentShopLogoBase64 = '';

        const modal = document.getElementById('shopManageModal');
        const titleEl = document.getElementById('shopModalTitle');
        const nameInput = document.getElementById('shopNameInput');
        const codeInput = document.getElementById('shopShortCodeInput');
        const catInput = document.getElementById('shopCategoryInput');
        const phoneInput = document.getElementById('shopPhoneInput');
        const emailInput = document.getElementById('shopEmailInput');
        const taxInput = document.getElementById('shopTaxIdInput');
        const addrInput = document.getElementById('shopAddressInput');
        const hiddenId = document.getElementById('editingShopId');

        window.removeShopLogoPreview();

        if (shopId) {
            const workspaces = getManagedWorkspaces();
            const ws = workspaces.find(w => w.id === shopId);
            if (ws) {
                if (titleEl) titleEl.textContent = 'แก้ไขข้อมูลร้านค้า';
                if (hiddenId) hiddenId.value = ws.id;
                if (nameInput) nameInput.value = ws.name || '';
                if (codeInput) codeInput.value = ws.shortCode || '';
                if (catInput) catInput.value = ws.category || 'สตูดิโอ & มีเดีย';
                if (phoneInput) phoneInput.value = ws.phone || '';
                if (emailInput) emailInput.value = ws.email || '';
                if (taxInput) taxInput.value = ws.taxId || '';
                if (addrInput) addrInput.value = ws.address || '';
                if (ws.logo) {
                    currentShopLogoBase64 = ws.logo;
                    const preview = document.getElementById('shopLogoPreview');
                    const placeholder = document.getElementById('shopLogoPlaceholder');
                    const removeBtn = document.getElementById('shopRemoveLogoBtn');
                    if (preview && placeholder && removeBtn) {
                        preview.src = ws.logo;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                        removeBtn.style.display = 'flex';
                    }
                }
            }
        } else {
            if (titleEl) titleEl.textContent = 'เพิ่มร้านค้าใหม่';
            if (hiddenId) hiddenId.value = '';
            if (nameInput) nameInput.value = '';
            if (codeInput) codeInput.value = '';
            if (catInput) catInput.value = 'สตูดิโอ & มีเดีย';
            if (phoneInput) phoneInput.value = '';
            if (emailInput) emailInput.value = '';
            if (taxInput) taxInput.value = '';
            if (addrInput) addrInput.value = '';
        }

        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
    };

    window.closeShopModal = function () {
        const modal = document.getElementById('shopManageModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 250);
        }
    };

    window.handleAddNewWorkspace = function () {
        window.openShopModal();
    };

    window.handleShopLogoSelect = function (input) {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไฟล์ภาพขนาดใหญ่เกินไป',
                    text: 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2MB',
                    confirmButtonColor: '#072542'
                });
            } else {
                alert('กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2MB');
            }
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64 = e.target.result;
            currentShopLogoBase64 = base64;
            const preview = document.getElementById('shopLogoPreview');
            const placeholder = document.getElementById('shopLogoPlaceholder');
            const removeBtn = document.getElementById('shopRemoveLogoBtn');
            if (preview && placeholder && removeBtn) {
                preview.src = base64;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    };

    window.removeShopLogoPreview = function () {
        currentShopLogoBase64 = '';
        const fileInput = document.getElementById('shopLogoFileInput');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('shopLogoPreview');
        const placeholder = document.getElementById('shopLogoPlaceholder');
        const removeBtn = document.getElementById('shopRemoveLogoBtn');
        if (preview && placeholder && removeBtn) {
            preview.src = '';
            preview.style.display = 'none';
            placeholder.style.display = 'block';
            removeBtn.style.display = 'none';
        }
    };

    window.saveShopModalData = function () {
        const nameInput = document.getElementById('shopNameInput');
        const name = (nameInput.value || '').trim();
        if (!name) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อร้านค้า',
                    text: 'ชื่อร้านค้าหรือบริษัทเป็นข้อมูลที่จำเป็น',
                    confirmButtonColor: '#072542'
                });
            } else {
                alert('กรุณากรอกชื่อร้านค้า');
            }
            nameInput.focus();
            return;
        }

        const hiddenId = document.getElementById('editingShopId').value;
        const workspaces = getManagedWorkspaces();

        const isDuplicate = workspaces.some(w => (!hiddenId || w.id !== hiddenId) && w.name.toLowerCase() === name.toLowerCase());
        if (isDuplicate) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'ชื่อร้านค้าซ้ำ',
                    text: 'มีชื่อร้านค้านี้อยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น',
                    confirmButtonColor: '#072542'
                });
            } else {
                alert('มีชื่อร้านค้านี้อยู่ในระบบแล้ว');
            }
            nameInput.focus();
            return;
        }

        const shortCode = (document.getElementById('shopShortCodeInput').value || '').trim().toUpperCase() || name.substring(0, 2).toUpperCase();
        const category = document.getElementById('shopCategoryInput').value;
        const phone = (document.getElementById('shopPhoneInput').value || '').trim();
        const email = (document.getElementById('shopEmailInput').value || '').trim();
        const taxId = (document.getElementById('shopTaxIdInput').value || '').trim();
        const address = (document.getElementById('shopAddressInput').value || '').trim();

        if (hiddenId) {
            const idx = workspaces.findIndex(w => w.id === hiddenId);
            if (idx !== -1) {
                const oldName = workspaces[idx].name;
                workspaces[idx] = {
                    ...workspaces[idx],
                    name,
                    shortCode,
                    category,
                    phone,
                    email,
                    taxId,
                    address,
                    logo: currentShopLogoBase64 || workspaces[idx].logo || '',
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(workspaces));

                if (getActiveWorkspaceName() === oldName) {
                    setActiveWorkspaceName(name);
                }
            }
        } else {
            const newWs = {
                id: 'ws_' + Date.now(),
                name,
                shortCode,
                category,
                phone,
                email,
                taxId,
                address,
                logo: currentShopLogoBase64 || '',
                isDefault: false,
                createdAt: new Date().toISOString()
            };
            workspaces.push(newWs);
            localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(workspaces));
            selectWorkspace(name);
        }

        window.closeShopModal();
        renderWorkspacePopoverList();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: hiddenId ? 'บันทึกข้อมูลเรียบร้อย!' : 'เพิ่มร้านค้าสำเร็จ!',
                html: `พื้นที่จัดการร้าน <b>"${escapeHtml(name)}"</b> พร้อมใช้งานแล้ว (ข้อมูลถูกจัดเก็บแยกเรียบร้อย)`,
                confirmButtonColor: '#072542',
                timer: 2200,
                showConfirmButton: false
            });
        }
    };

    function setupShopLogoDropzone() {
        const dropzone = document.getElementById('shopLogoDropzone');
        if (!dropzone) return;
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = '#0d4b85';
                dropzone.style.background = '#eff6ff';
            }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = '#cbd5e1';
                dropzone.style.background = '#f8fafc';
            }, false);
        });
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                const input = document.getElementById('shopLogoFileInput');
                if (input) {
                    input.files = files;
                    handleShopLogoSelect(input);
                }
            }
        }, false);
    }

    async function handleDeleteWorkspace(id, e) {
        if (e) e.stopPropagation();
        const workspaces = getManagedWorkspaces();
        const target = workspaces.find(w => w.id === id);
        if (!target) return;
        if (target.isDefault) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่สามารถลบได้',
                    text: 'ไม่สามารถลบร้านค้า / บริษัทหลักของระบบได้',
                    confirmButtonColor: '#072542'
                });
            }
            return;
        }

        let confirmed = false;
        if (typeof Swal !== 'undefined') {
            const res = await Swal.fire({
                title: 'ยืนยันการลบร้านค้านี้?',
                html: `คุณต้องการลบร้านค้า <b>"${escapeHtml(target.name)}"</b> ออกจากการจัดการใช่หรือไม่?<br><span style="font-size:12.5px; color:#ef4444;">(โครงการเดิมที่เคยบันทึกไว้ในชื่อร้านนี้จะไม่ถูกลบออกจากฐานข้อมูล)</span>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'ยืนยันการลบ',
                cancelButtonText: 'ยกเลิก'
            });
            confirmed = res.isConfirmed;
        } else {
            confirmed = confirm(`ยืนยันการลบร้านค้า "${target.name}"?`);
        }

        if (confirmed) {
            const updated = workspaces.filter(w => w.id !== id);
            localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(updated));

            if (getActiveWorkspaceName() === target.name) {
                selectWorkspace(WS_DEFAULT_NAME);
            } else {
                renderWorkspacePopoverList();
            }

            if (typeof window.showToast === 'function') {
                window.showToast(`ลบร้านค้า "${target.name}" เรียบร้อยแล้ว`, 'info');
            }
        }
    }
    window.handleDeleteWorkspace = handleDeleteWorkspace;

    // ===== 3. SIDEBAR NAVIGATION & COLLAPSE =====
    let lastToggleTimestamp = 0;

    function applySidebarState(isCollapsed) {
        const sidebar = document.getElementById('sidebar');
        const mainWrapper = document.querySelector('.main-wrapper') || document.querySelector('.flex-1');
        const secondary = document.getElementById('railSecondaryPanel') || (sidebar ? sidebar.querySelector('.rail-secondary') : null);
        const collapseBtn = document.getElementById('railCollapseBtn') || document.querySelector('.rail-collapse-toggle');
        const collapseIcon = collapseBtn ? collapseBtn.querySelector('i') : null;

        if (!sidebar) return;

        if (isCollapsed) {
            sidebar.classList.add('panel-collapsed');
            sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
            sidebar.style.setProperty('width', '68px', 'important');
            sidebar.style.setProperty('min-width', '68px', 'important');
            sidebar.style.setProperty('max-width', '68px', 'important');
            sidebar.style.setProperty('overflow', 'hidden', 'important');

            if (secondary) {
                secondary.style.setProperty('display', 'none', 'important');
                secondary.style.setProperty('width', '0px', 'important');
                secondary.style.setProperty('visibility', 'hidden', 'important');
            }
            if (mainWrapper) {
                mainWrapper.classList.add('sidebar-collapsed');
                mainWrapper.style.setProperty('margin-left', '68px', 'important');
                mainWrapper.style.setProperty('width', 'calc(100% - 68px)', 'important');
            }
            if (collapseIcon) {
                collapseIcon.style.setProperty('transform', 'rotate(180deg)', 'important');
            }
            if (collapseBtn) {
                collapseBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.28)', 'important');
                collapseBtn.setAttribute('title', 'ขยายแถบเมนู');
            }

            localStorage.setItem('sidebarCollapsed', 'true');
            localStorage.setItem('mentra_dual_sidebar_collapsed', '1');
            localStorage.setItem('sidebar_collapsed', 'true');
        } else {
            sidebar.classList.remove('panel-collapsed');
            sidebar.classList.remove('collapsed');
            document.body.classList.remove('sidebar-collapsed');
            sidebar.style.removeProperty('width');
            sidebar.style.removeProperty('min-width');
            sidebar.style.removeProperty('max-width');
            sidebar.style.removeProperty('overflow');

            if (secondary) {
                secondary.style.removeProperty('display');
                secondary.style.removeProperty('width');
                secondary.style.removeProperty('visibility');
            }
            if (mainWrapper) {
                mainWrapper.classList.remove('sidebar-collapsed');
                mainWrapper.style.removeProperty('margin-left');
                mainWrapper.style.removeProperty('width');
            }
            if (collapseIcon) {
                collapseIcon.style.removeProperty('transform');
            }
            if (collapseBtn) {
                collapseBtn.style.removeProperty('background');
                collapseBtn.setAttribute('title', 'ย่อแถบเมนู');
            }

            localStorage.setItem('sidebarCollapsed', 'false');
            localStorage.setItem('mentra_dual_sidebar_collapsed', '0');
            localStorage.setItem('sidebar_collapsed', 'false');
        }
    }
    window.applySidebarState = applySidebarState;

    function toggleSidebarCollapse() {
        const now = Date.now();
        if (now - lastToggleTimestamp < 250) {
            return;
        }
        lastToggleTimestamp = now;

        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const isCurrentlyCollapsed = sidebar.classList.contains('panel-collapsed') ||
                                    sidebar.classList.contains('collapsed') ||
                                    document.body.classList.contains('sidebar-collapsed') ||
                                    sidebar.style.width === '68px';

        applySidebarState(!isCurrentlyCollapsed);
    }
    window.toggleSidebarCollapse = toggleSidebarCollapse;

    function ensureSidebarExpanded() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.contains('panel-collapsed') ||
                            sidebar.classList.contains('collapsed') ||
                            document.body.classList.contains('sidebar-collapsed') ||
                            sidebar.style.width === '68px';
        if (isCollapsed) {
            applySidebarState(false);
        }
    }
    window.ensureSidebarExpanded = ensureSidebarExpanded;

    function handleRailTab(tab, btn) {
        document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        ensureSidebarExpanded();

        if (tab === 'dashboard') {
            if (typeof window.navigateTo === 'function') {
                window.navigateTo('dashboard');
            } else {
                window.location.href = '../admin/dashboard.html?view=dashboard';
            }
        } else if (tab === 'projects') {
            if (typeof window.navigateTo === 'function') {
                window.navigateTo('projects');
            } else {
                window.location.href = '../admin/dashboard.html?view=projects';
            }
        } else if (tab === 'purchasing') {
            const target = document.getElementById('nav-purchasing-school');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.transition = 'background 0.3s';
                target.style.background = '#e0f2fe';
                setTimeout(() => { target.style.background = ''; }, 1200);
            } else {
                window.location.href = '../purchasing/materials_purchasing.html';
            }
        } else if (tab === 'accounting') {
            const target = document.getElementById('nav-quotation');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.transition = 'background 0.3s';
                target.style.background = '#e0f2fe';
                setTimeout(() => { target.style.background = ''; }, 1200);
            } else {
                window.location.href = '../accounting/sales_dashboard.html';
            }
        } else if (tab === 'schedule') {
            const target = document.getElementById('nav-tasks');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.transition = 'background 0.3s';
                target.style.background = '#e0f2fe';
                setTimeout(() => { target.style.background = ''; }, 1200);
            } else {
                window.location.href = '../schedule/calendar.html';
            }
        }
    }
    window.handleRailTab = handleRailTab;

    function focusQuickSearch() {
        ensureSidebarExpanded();
        const input = document.getElementById('sidebarQuickSearch');
        if (input) {
            input.focus();
            input.select();
        }
    }
    window.focusQuickSearch = focusQuickSearch;

    function filterSidebarNav(query) {
        const q = (query || '').trim().toLowerCase();
        const items = document.querySelectorAll('#secondaryNavBody .sec-nav-item, #secondaryNavBody .tree-item');
        const dividers = document.querySelectorAll('#secondaryNavBody .sec-nav-divider');

        items.forEach(el => {
            const text = el.textContent.toLowerCase();
            if (!q || text.includes(q)) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });

        dividers.forEach(div => {
            div.style.display = q ? 'none' : '';
        });
    }
    window.filterSidebarNav = filterSidebarNav;

    function toggleTreeGroup(groupId) {
        const group = document.getElementById(groupId);
        if (group) {
            group.classList.toggle('collapsed');
        }
    }
    window.toggleTreeGroup = toggleTreeGroup;

    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
    };

    window.closeSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    };

    // Logout fallback
    if (!window.handleLogout) {
        window.handleLogout = async function () {
            try {
                if (typeof window.auth !== 'undefined' && typeof window.signOut === 'function') {
                    await window.signOut(window.auth);
                }
            } catch (e) {}
            window.location.href = '../../index.html';
        };
    }

    // Dynamic Tree Projects Population
    if (!window.updateProjectsTree) {
        window.updateProjectsTree = function (projects) {
            const container = document.getElementById('treeProjectsList');
            if (!container) return;
            const curWs = typeof window.getActiveWorkspaceName === 'function' ? window.getActiveWorkspaceName() : 'Mentra Solution';
            const list = projects !== undefined ? projects : (window.getWorkspaceProjects ? window.getWorkspaceProjects(window.allProjects || null, curWs) : []);
            if (!list || !list.length) {
                container.innerHTML = `
                    <div class="tree-item" style="color:var(--text-muted); font-style:italic; padding-left:24px;">ไม่มีโครงการในร้านนี้</div>
                    <div class="tree-item-more" onclick="window.location.href='../admin/dashboard.html?view=projects'">+ ไปที่หน้าโครงการ...</div>
                `;
                return;
            }
            const top5 = list.slice(0, 5);
            let html = top5.map((p, idx) => {
                const name = p.projectName || p.name || `โครงการ #${idx + 1}`;
                const safeName = name.length > 22 ? name.substring(0, 20) + '...' : name;
                return `<div class="tree-item" onclick="window.location.href='../admin/dashboard.html?projectId=${p.id}'" title="${name}">${safeName}</div>`;
            }).join('');
            html += `<div class="tree-item-more" onclick="window.location.href='../admin/dashboard.html?view=projects'">+ ดูโครงการทั้งหมด (${list.length})...</div>`;
            container.innerHTML = html;
        };
    }

    // ===== 4. AUTO-HIGHLIGHT ACTIVE NAVIGATION ITEM =====
    function syncActiveNavigation() {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();

        // Clear all active states first
        document.querySelectorAll('.sec-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.rail-icon-btn').forEach(el => el.classList.remove('active'));

        const setNavActive = (secNavId, railBtnId) => {
            const sec = document.getElementById(secNavId);
            const rail = document.getElementById(railBtnId);
            if (sec) sec.classList.add('active');
            if (rail) rail.classList.add('active');
        };

        if (path.includes('dashboard.html')) {
            if (search.includes('view=projects')) {
                setNavActive('nav-projects', 'railBtnProjects');
            } else if (search.includes('view=items')) {
                setNavActive('nav-items', 'railBtnPurchasing');
            } else {
                setNavActive('nav-dashboard', 'railBtnDashboard');
            }
        } else if (path.includes('crm.html')) {
            setNavActive('nav-crm', 'railBtnDashboard');
        } else if (path.includes('business_card.html')) {
            setNavActive('nav-business-card', 'railBtnDashboard');
        } else if (path.includes('materials_purchasing.html') && !path.includes('company')) {
            setNavActive('nav-purchasing-school', 'railBtnPurchasing');
        } else if (path.includes('materials_purchasing_company.html')) {
            setNavActive('nav-purchasing-company', 'railBtnPurchasing');
        } else if (path.includes('products.html')) {
            setNavActive('nav-products', 'railBtnPurchasing');
        } else if (path.includes('equipments.html')) {
            setNavActive('nav-equipments', 'railBtnPurchasing');
        } else if (path.includes('quotation.html')) {
            setNavActive('nav-quotation', 'railBtnAccounting');
        } else if (path.includes('sales_dashboard.html')) {
            setNavActive('nav-sales-dashboard', 'railBtnAccounting');
        } else if (path.includes('sales_invoice.html')) {
            setNavActive('nav-sales-invoice', 'railBtnAccounting');
        } else if (path.includes('sales_receipt.html')) {
            setNavActive('nav-sales-receipt', 'railBtnAccounting');
        } else if (path.includes('ocr_table.html')) {
            setNavActive('nav-ocr', 'railBtnAccounting');
        } else if (path.includes('tasks.html')) {
            setNavActive('nav-tasks', 'railBtnSchedule');
        } else if (path.includes('calendar.html')) {
            setNavActive('nav-calendar', 'railBtnSchedule');
        } else if (path.includes('external_training.html')) {
            setNavActive('nav-training', 'railBtnSchedule');
        } else if (path.includes('internship_journal.html')) {
            setNavActive('nav-internship', 'railBtnSchedule');
        }
    }

    // ===== 5. INITIALIZATION =====
    function initSidebar() {
        // Sync saved collapse state from all legacy keys
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true' ||
                            localStorage.getItem('mentra_dual_sidebar_collapsed') === '1' ||
                            localStorage.getItem('sidebar_collapsed') === 'true';

        applySidebarState(isCollapsed);

        renderWorkspacePopoverList();
        updateSidebarShopDisplay();
        setupShopLogoDropzone();
        syncActiveNavigation();

        // Close popover when clicking outside
        document.addEventListener('click', function (e) {
            const popover = document.getElementById('orgSwitcherPopover');
            const switcherBtn = document.getElementById('orgSwitcherBtn');
            if (popover && popover.classList.contains('show')) {
                if (!switcherBtn || (!switcherBtn.contains(e.target) && !popover.contains(e.target))) {
                    popover.classList.remove('show');
                }
            }
        });

        // Global hotkey Ctrl+F / Cmd+F to focus quick search
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
                const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                if (tag !== 'input' && tag !== 'textarea') {
                    e.preventDefault();
                    focusQuickSearch();
                }
            }
        });
    }

    // Global capture-phase event listener guarantees collapse toggle button always works
    // and prevents legacy page scripts from interfering
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('#railCollapseBtn, .rail-collapse-toggle');
        if (btn) {
            e.preventDefault();
            e.stopImmediatePropagation();
            toggleSidebarCollapse();
        }
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }

    // Listen to localStorage changes across tabs
    window.addEventListener('storage', function (e) {
        if (e.key === WS_ACTIVE_KEY || e.key === WS_STORAGE_KEY) {
            updateSidebarShopDisplay();
            renderWorkspacePopoverList();
        }
    });

})();
