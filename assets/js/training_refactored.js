import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs, onSnapshot, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // Real Persistent Database (Mockup data removed as requested)
        // Fetches from localStorage so user input persists across page reloads
        let trainingRequests = JSON.parse(localStorage.getItem('mentra_training_requests')) || [];

        // ===== UTILITY FUNCTIONS =====
        /** Escape HTML to prevent XSS when inserting user data into innerHTML */
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        /** Debounce: delay fn execution until after 'delay' ms of inactivity */
        function debounce(fn, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }
        // Debounced Firestore write for participants — prevents write storm on keystroke
        const debouncedSaveParticipants = debounce(function(reqId, participants) {
            if (typeof window.saveParticipantDoc === 'function') {
                window.saveParticipantDoc(reqId, participants);
            }
        }, 800);

        let currentActiveRowId = null;
        let activeViewPane = 'LIST'; // 'LIST' or 'CALENDAR'
        
        // Calendar month tracking (Initialize to May 2026 based on active system time)
        let calendarDate = new Date(); // Initialize to current month from system clock

        const THAI_MONTHS = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];

        // On Page Load
        export async function initTrainingView() {
    const db = window.db;
    const currentUser = window.currentUser;
    
            checkDatabaseState();
            renderTable();
            calculateSummary();
            renderCalendarGrid();

            // Set up Create Request Modal Event
            document.getElementById("btnCreateRequest").addEventListener("click", () => {
                openModal("requestModal");
            


            // Search Event listener
            document.getElementById("tableSearch").addEventListener("input", () => {
                renderTable();
            });

            // Filter Event listeners
            document.getElementById("filterStatus").addEventListener("change", () => {
                renderTable();
            });
            document.getElementById("filterSort").addEventListener("change", () => {
                renderTable();
            });

            // Drag and Drop Area setup
            setupDragAndDrop();

            // Restore Sidebar collapse state from localStorage
            const isCollapsed = localStorage.getItem('mentra_sidebar_collapsed') === '1';
            if (isCollapsed && window.innerWidth > 900) {
                document.getElementById('sidebar').classList.add('collapsed');
                document.querySelector('.main-wrapper').classList.add('sidebar-collapsed');
            }
        });

        // Save data helper
        function saveDatabase() {
            localStorage.setItem('mentra_training_requests', JSON.stringify(trainingRequests));
        }

        // Checks if database is empty to show empty state card
        function checkDatabaseState() {
            const dynamicArea = document.getElementById("dynamicMainContentArea");
            const emptyCard = document.getElementById("emptyRecordsCard");
            const switcher = document.querySelector(".view-switcher-tabs");

            if (trainingRequests.length === 0) {
                dynamicArea.style.display = "none";
                switcher.style.display = "none";
                emptyCard.style.display = "flex";
            } else {
                dynamicArea.style.display = "block";
                switcher.style.display = "flex";
                emptyCard.style.display = "none";
            }
        }

        // Sidebar Collapse functions
        const SIDEBAR_COLLAPSED_KEY = 'mentra_sidebar_collapsed';

        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar');
            const wrapper = document.querySelector('.main-wrapper');
            const isCollapsed = sidebar.classList.toggle('collapsed');
            wrapper.classList.toggle('sidebar-collapsed', isCollapsed);
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? '1' : '0');
        }

        // Toggle Mobile Sidebar
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('show');
        }

        // handleLogout is handled by the Firebase Auth module script below

        // Switch layout views (List vs Calendar)
        function switchViewPane(targetPane) {
            activeViewPane = targetPane;
            const btnList = document.getElementById("tabListView");
            const btnCalendar = document.getElementById("tabCalendarView");
            const paneList = document.getElementById("paneListView");
            const paneCalendar = document.getElementById("paneCalendarView");

            if (targetPane === 'LIST') {
                btnList.classList.add("active");
                btnCalendar.classList.remove("active");
                paneList.classList.add("active");
                paneCalendar.classList.remove("active");
                renderTable();
            } else {
                btnList.classList.remove("active");
                btnCalendar.classList.add("active");
                paneList.classList.remove("active");
                paneCalendar.classList.add("active");
                renderCalendarGrid();
            }
        }

        // Calculate and Update summary cards
        function calculateSummary() {
            let pending = trainingRequests.filter(r => r.status === "pending").length;
            let approved = trainingRequests.filter(r => r.status === "approved").length;
            
            // Total budget calculation
            let totalBudget = 0;
            trainingRequests.forEach(r => {
                if (r.status === "approved") {
                    totalBudget += r.cost;
                }
            });

            document.getElementById("approvedCount").textContent = `${approved} หลักสูตร`;
            document.getElementById("budgetSpent").textContent = `${totalBudget.toLocaleString()} ฿`;

            // Adjust budget progress bar (max 100k budget limit)
            let limit = 100000;
            let percent = Math.min((totalBudget / limit) * 100, 100);
            document.getElementById("budgetProgressBar").style.width = `${percent}%`;

            let attendees = new Set(trainingRequests.map(r => r.requester)).size;
            document.getElementById("totalAttendees").textContent = `${attendees} คน`;
        }

        // Render Table dynamically based on filters & search
        function renderTable() {
            const tableBody = document.getElementById("trainingTableBody");
            const searchVal = document.getElementById("tableSearch").value.toLowerCase().trim();
            const statusFilter = document.getElementById("filterStatus").value;
            const sortFilter = document.getElementById("filterSort").value;

            // Filter data
            let filtered = trainingRequests.filter(req => {
                let matchesSearch = req.id.toLowerCase().includes(searchVal) ||
                                    req.courseName.toLowerCase().includes(searchVal) ||
                                    req.organizer.toLowerCase().includes(searchVal) ||
                                    req.requester.toLowerCase().includes(searchVal);
                
                let matchesStatus = (statusFilter === "ALL") || (req.status === statusFilter);

                return matchesSearch && matchesStatus;
            });

            // Sort data
            if (sortFilter === "COST_DESC") {
                filtered.sort((a, b) => b.cost - a.cost);
            } else if (sortFilter === "COST_ASC") {
                filtered.sort((a, b) => a.cost - b.cost);
            } else {
                // Bug-07 fix: use createdAt timestamp when available; fallback to numeric-aware ID sort
                filtered.sort((a, b) => {
                    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
                    return b.id.localeCompare(a.id, undefined, { numeric: true });
                });
            }

            // Render DOM
            tableBody.innerHTML = "";
            
            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <i class="fa-regular fa-folder-open" style="font-size: 32px; margin-bottom: 12px; display: block; color: var(--text-muted);"></i>
                            ไม่พบข้อมูลคำร้องขออบรม
                        </td>
                    </tr>
                `;
                document.getElementById("paginationRange").textContent = "0-0 จาก 0";
                return;
            }

            filtered.forEach(req => {
                let statusLabel = "";
                let statusClass = "";
                let tooltipHeader = "";

                if (req.status === "pending") {
                    statusLabel = "รออบรมตามแผน";
                    statusClass = "pending";
                    tooltipHeader = "สถานะ: รอถึงกำหนดการจัดอบรม";
                } else if (req.status === "approved") {
                    statusLabel = "เข้าอบรมเสร็จสิ้น";
                    statusClass = "approved";
                    tooltipHeader = "ดำเนินการเสร็จสิ้น";
                } else if (req.status === "rejected") {
                    statusLabel = "ยกเลิกรายการ";
                    statusClass = "rejected";
                    tooltipHeader = "ยกเลิกหลักสูตรนี้แล้ว";
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><span class="request-id">${escapeHtml(req.id)}</span></td>
                    <td class="course-title-cell">
                        <div class="course-name">${escapeHtml(req.courseName)}</div>
                        <div class="course-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(req.date)}</span>
                        </div>
                    </td>
                    <td><span class="organizer-name">${escapeHtml(req.organizer)}</span></td>
                    <td>
                        <div class="requester-cell">
                            <div class="requester-avatar">${escapeHtml(req.requesterInitial)}</div>
                            <span>${escapeHtml(req.requester)}</span>
                        </div>
                    </td>
                    <td><span class="cost-amount">${(req.cost || 0).toLocaleString()} ฿</span></td>
                    <td>
                        <div class="status-pill-container">
                            <span class="status-pill ${statusClass}">
                                <i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${statusLabel}
                            </span>
                            <!-- Custom HTML Tooltip -->
                            <div class="custom-tooltip">
                                <div class="tooltip-header">
                                    <i class="fa-solid fa-circle-question"></i> ${tooltipHeader}
                                </div>
                                <div>${escapeHtml(req.tooltipText)}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="actions-group">
                            <button class="btn-action approve-btn" onclick="openDetailsModal('${escapeHtml(req.id)}')">
                                <i class="fa-solid fa-signature"></i> รายละเอียด
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            document.getElementById("paginationRange").textContent = `1-${filtered.length} จากทั้งหมด ${filtered.length}`;
        }

        // ==========================================
        // DYNAMIC INTERACTIVE CALENDAR GENERATOR
        // ==========================================
        function adjustCalendarMonth(direction) {
            calendarDate.setMonth(calendarDate.getMonth() + direction);
            renderCalendarGrid();
        }

        function renderCalendarGrid() {
            const grid = document.getElementById("calendarGrid");
            const monthTitle = document.getElementById("calendarMonthTitle");
            
            const currentYear = calendarDate.getFullYear();
            const currentMonthIndex = calendarDate.getMonth();
            
            // Set header title
            monthTitle.textContent = `${THAI_MONTHS[currentMonthIndex]} ${currentYear + 543}`; // Thai Buddhist Era year
            
            // Keep weekday headers
            grid.innerHTML = `
                <div class="calendar-weekday">อา.</div>
                <div class="calendar-weekday">จ.</div>
                <div class="calendar-weekday">อ.</div>
                <div class="calendar-weekday">พ.</div>
                <div class="calendar-weekday">พฤ.</div>
                <div class="calendar-weekday">ศ.</div>
                <div class="calendar-weekday">ส.</div>
            `;

            const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
            const startDayOfWeekIndex = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
            const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
            const daysInPrevMonth = new Date(currentYear, currentMonthIndex, 0).getDate();

            // 1. Prev month trailing padding days
            for (let i = startDayOfWeekIndex - 1; i >= 0; i--) {
                const prevDayNum = daysInPrevMonth - i;
                const prevCell = document.createElement("div");
                prevCell.className = "calendar-day other-month";
                prevCell.innerHTML = `<span class="calendar-day-num">${prevDayNum}</span>`;
                grid.appendChild(prevCell);
            }

            // 2. Render actual current month days
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                const currentCellDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const cell = document.createElement("div");
                cell.className = "calendar-day";
                
                // today check
                const today = new Date();
                if (today.getFullYear() === currentYear && today.getMonth() === currentMonthIndex && today.getDate() === dayNum) {
                    cell.classList.add("today");
                }

                cell.innerHTML = `<span class="calendar-day-num">${dayNum}</span>`;

                // Render matching training courses on this date range
                const matchingCourses = trainingRequests.filter(req => {
                    if (req.startDate && req.endDate) {
                        return req.startDate <= currentCellDateStr && currentCellDateStr <= req.endDate;
                    }
                    return req.date === currentCellDateStr;
                });
                matchingCourses.forEach(req => {
                    let badgeLabel = "";
                    if (req.status === 'pending') badgeLabel = "pending";
                    else if (req.status === 'approved') badgeLabel = "approved";
                    else if (req.status === 'rejected') badgeLabel = "rejected";

                    const badge = document.createElement("div");
                    badge.className = `calendar-event-badge ${badgeLabel}`;
                    badge.title = `${req.courseName} (${req.requester})`;
                    badge.textContent = `${req.requester}: ${req.courseName}`;
                    
                    // Clicking the calendar event badge opens detail modal
                    badge.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openDetailsModal(req.id);
                    });
                    cell.appendChild(badge);
                });

                grid.appendChild(cell);
            }

            // 3. Next month trailing padding days (fill out the 42 total slots grid)
            const totalSlotsUsed = startDayOfWeekIndex + daysInMonth;
            const remainingPaddingSlots = 42 - totalSlotsUsed;
            for (let nextDayNum = 1; nextDayNum <= remainingPaddingSlots; nextDayNum++) {
                const nextCell = document.createElement("div");
                nextCell.className = "calendar-day other-month";
                nextCell.innerHTML = `<span class="calendar-day-num">${nextDayNum}</span>`;
                grid.appendChild(nextCell);
            }
        }

        // Open Modal utilities
        function openModal(modalId) {
            const overlay = document.getElementById(modalId);
            overlay.style.display = "flex";
            setTimeout(() => {
                overlay.classList.add("show");
            }, 10);
        }

        function closeModal(modalId) {
            const overlay = document.getElementById(modalId);
            overlay.classList.remove("show");
            setTimeout(() => {
                overlay.style.display = "none";
            }, 300);
        }

        // Handle Creating Request form submission
        function handleCreateRequest(e) {
            e.preventDefault();

            const courseTitle = document.getElementById("courseTitle").value;
            const organizer = document.getElementById("organizer").value;
            const requester = document.getElementById("requester").value;
            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;
            const expense = parseFloat(document.getElementById("expense").value) || 0; // Bug-04: guard against NaN
            const objective = document.getElementById("objective").value;

            // Generate initial initials
            let initVal = requester.trim().substring(0, 2);

            // Bug-01 fix: generate unique collision-proof ID using timestamp + random
            const _idYear = new Date().getFullYear();
            const _idTs = Date.now().toString(36).toUpperCase().slice(-5);
            const _idRand = Math.random().toString(36).slice(2, 6).toUpperCase();
            let newId = `REQ-${_idYear}-${_idTs}${_idRand}`;

            let newRequest = {
                id: newId,
                courseName: courseTitle,
                organizer: organizer,
                requester: requester,
                requesterInitial: initVal,
                cost: expense,
                status: "pending",
                startDate: startDate,
                endDate: endDate,
                date: `${startDate} ถึง ${endDate}`,
                tooltipText: "รอเข้าอบรมตามกำหนดการจัดอบรม",
                objective: objective,
                createdAt: new Date().toISOString() // for reliable sort order
            };

            trainingRequests.unshift(newRequest);
            saveDatabase();
            
            closeModal("requestModal");
            
            // Clean Form
            document.getElementById("createRequestForm").reset();

            // Refresh table & UI states
            checkDatabaseState();
            renderTable();
            calculateSummary();
            renderCalendarGrid();

            showToast(`เพิ่มหลักสูตรอบรมสำเร็จ รหัสรายการ ${newId}`, "success");
        }

        // Detail Modal displayer
        function openDetailsModal(id) {
            currentActiveRowId = id;
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            const bodyContainer = document.getElementById("detailModalBody");
            const footerContainer = document.getElementById("detailModalFooter");

            let statusLabel = "";
            if (req.status === "pending") statusLabel = "รออบรมตามแผนงาน";
            else if (req.status === "approved") statusLabel = "เข้าอบรมเสร็จสิ้น";
            else if (req.status === "rejected") statusLabel = "ยกเลิกรายการแล้ว";

            bodyContainer.innerHTML = `
                <div class="detail-row-viewer">
                    <div class="detail-lbl">รหัสรายการ:</div>
                    <div class="detail-val" style="color: var(--primary); font-family: 'Inter';">${escapeHtml(req.id)}</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">ชื่อหลักสูตรอบรม:</div>
                    <div class="detail-val">${escapeHtml(req.courseName)}</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">สถานที่จัดอบรม:</div>
                    <div class="detail-val">${escapeHtml(req.organizer)}</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">วิทยากรผู้อบรม:</div>
                    <div class="detail-val">${escapeHtml(req.requester)}</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">ระยะเวลาอบรม:</div>
                    <div class="detail-val">${req.startDate ? `${escapeHtml(req.startDate)} ถึง ${escapeHtml(req.endDate)}` : escapeHtml(req.date)}</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">ค่าใช้จ่ายรวม:</div>
                    <div class="detail-val" style="font-family: 'Inter'; color: var(--secondary-dark);">${(req.cost || 0).toLocaleString()} บาท</div>
                </div>
                <div class="detail-row-viewer">
                    <div class="detail-lbl">สถานะการอบรม:</div>
                    <div class="detail-val">${statusLabel}</div>
                </div>
                <div style="margin-top: 15px; background: var(--bg); padding: 16px; border-radius: var(--radius-md);">
                    <div style="font-weight: 700; margin-bottom: 6px; color: var(--text);">วัตถุประสงค์ในการจัดอบรม:</div>
                    <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(req.objective || 'ไม่ได้ระบุวัตถุประสงค์')}</p>
                </div>
            `;

            // Action footer depending on state
            if (req.status === "pending") {
                footerContainer.innerHTML = `
                    <button class="btn-cancel" style="background: #ef4444; color: white;" onclick="triggerDeleteTraining('${req.id}')">
                        <i class="fa-solid fa-trash-can"></i> ลบรายการ
                    </button>
                    <button class="btn-cancel" onclick="updateStatus('${req.id}', 'rejected')">ยกเลิกรายการ</button>
                    <button class="btn-cancel" style="background: var(--info); color: white;" onclick="openQrModal('${req.id}')">
                        <i class="fa-solid fa-qrcode"></i> ลิงก์ / QR Code
                    </button>
                    <button class="btn-cancel" style="background: #4f46e5; color: white;" onclick="openCertificateCreator('${req.id}')">
                        <i class="fa-solid fa-graduation-cap"></i> ออกเกียรติบัตร
                    </button>
                    <button class="btn-save" style="background: linear-gradient(135deg, var(--success) 0%, #047857 100%); box-shadow: none;" onclick="triggerConfirmTraining('${req.id}')">
                        <i class="fa-solid fa-check"></i> ยืนยันเข้าอบรมแล้ว
                    </button>
                `;
            } else {
                footerContainer.innerHTML = `
                    <button class="btn-cancel" style="background: #ef4444; color: white;" onclick="triggerDeleteTraining('${req.id}')">
                        <i class="fa-solid fa-trash-can"></i> ลบรายการ
                    </button>
                    <button class="btn-cancel" style="background: var(--info); color: white;" onclick="openQrModal('${req.id}')">
                        <i class="fa-solid fa-qrcode"></i> ลิงก์ / QR Code
                    </button>
                    <button class="btn-cancel" style="background: #4f46e5; color: white;" onclick="openCertificateCreator('${req.id}')">
                        <i class="fa-solid fa-graduation-cap"></i> ออกเกียรติบัตร
                    </button>
                    <button class="btn-save" onclick="closeModal('detailModal')">ปิดหน้าต่าง</button>
                `;
            }

            openModal("detailModal");
        }

        // Beautiful custom confirmation modal triggers
        let pendingConfirmId = null;

        function triggerConfirmTraining(id) {
            pendingConfirmId = id;
            openModal('confirmModal');
        }

        function executeStatusUpdate() {
            if (!pendingConfirmId) return;
            updateStatus(pendingConfirmId, 'approved');
            closeModal('confirmModal');
            pendingConfirmId = null;
        }

        // Action Status modifier
        function updateStatus(id, newStatus) {
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            req.status = newStatus;
            if (newStatus === 'approved') {
                req.status = 'approved'; 
                req.tooltipText = "เข้าอบรมเสร็จสิ้นเรียบร้อยแล้ว";
                showToast("บันทึกการเข้าอบรมเสร็จสิ้นสำเร็จ", "success");
            } else if (newStatus === 'rejected') {
                req.tooltipText = "ยกเลิกหลักสูตรการจัดอบรมนี้แล้ว";
                showToast("ยกเลิกรายการจัดอบรมเรียบร้อย", "info");
            }

            saveDatabase();
            closeModal("detailModal");
            
            renderTable();
            calculateSummary();
            renderCalendarGrid();
        }

        // Setup Certificate Upload functions
        function openUploadModal(id) {
            currentActiveRowId = id;
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            document.getElementById("uploadModalDetails").innerHTML = `
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">รหัสคำร้อง: <strong>${req.id}</strong></p>
                <h4 style="font-size: 16px; font-weight: 700; color: var(--text);">${req.courseName}</h4>
            `;

            clearSelectedFile();
            openModal("uploadModal");
        }

        function setupDragAndDrop() {
            const zone = document.getElementById("dragDropZone");
            const fileInput = document.getElementById("fileInput");

            zone.addEventListener("click", () => fileInput.click());

            fileInput.addEventListener("change", (e) => {
                if (e.target.files.length > 0) {
                    displaySelectedFile(e.target.files[0]);
                }
            });

            zone.addEventListener("dragover", (e) => {
                e.preventDefault();
                zone.style.background = "#dbeafe";
            });

            zone.addEventListener("dragleave", () => {
                zone.style.background = "var(--primary-light)";
            });

            zone.addEventListener("drop", (e) => {
                e.preventDefault();
                zone.style.background = "var(--primary-light)";
                if (e.dataTransfer.files.length > 0) {
                    displaySelectedFile(e.dataTransfer.files[0]);
                }
            });
        }

        function displaySelectedFile(file) {
            const fileInfo = document.getElementById("selectedFileInfo");
            document.getElementById("selectedFileName").textContent = file.name;
            
            // format size
            let sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            document.getElementById("selectedFileSize").textContent = `${sizeMB} MB`;

            fileInfo.style.display = "flex";
            document.getElementById("btnSubmitUpload").disabled = false;
        }

        function clearSelectedFile() {
            document.getElementById("fileInput").value = "";
            document.getElementById("selectedFileInfo").style.display = "none";
            document.getElementById("btnSubmitUpload").disabled = true;
        }

        function processUpload() {
            if (!currentActiveRowId) return;

            const req = trainingRequests.find(r => r.id === currentActiveRowId);
            if (req) {
                req.status = "approved"; // successfully completed!
                req.tooltipText = "เสร็จสมบูรณ์ - ได้รับเอกสารหลักฐานใบรับรองแล้ว";
            }

            saveDatabase();
            closeModal("uploadModal");
            
            renderTable();
            calculateSummary();
            renderCalendarGrid();

            showToast("แนบใบรับรองและเสร็จสิ้นขั้นตอนโครงการฝึกอบรมเรียบร้อยแล้ว", "success");
        }

        // Toast system creator
        function showToast(message, type = "success") {
            const container = document.getElementById("toastContainer");
            
            const toast = document.createElement("div");
            toast.className = `toast ${type}`;
            
            let icon = '<i class="fa-solid fa-circle-check"></i>';
            if (type === "info") {
                icon = '<i class="fa-solid fa-circle-info"></i>';
            }

            toast.innerHTML = `
                ${icon}
                <span>${message}</span>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add("show");
            }, 50);

            // remove after 3.5s
            setTimeout(() => {
                toast.classList.remove("show");
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3500);
        }

        // ===== INTERACTIVE CERTIFICATE CREATOR SYSTEM =====
        let certActiveRecordId = null;
        let currentParticipants = [""];
        let activeParticipantIndex = 0;
        let entryMode = 'single';

        function setEntryMode(mode) {
            entryMode = mode;
            const singleTab = document.getElementById("tabModeSingle");
            const bulkTab = document.getElementById("tabModeBulk");
            const singleWrapper = document.getElementById("singleEntryWrapper");
            const bulkWrapper = document.getElementById("bulkEntryWrapper");

            if (mode === 'single') {
                singleTab.classList.add("active");
                bulkTab.classList.remove("active");
                singleWrapper.style.display = "flex";
                bulkWrapper.style.display = "none";
                
                // Sync back from bulk textarea to array
                const bulkVal = document.getElementById("bulkParticipantInput").value;
                parseBulkValue(bulkVal);
                renderParticipantRows();
                updateCertPreview();
            } else {
                singleTab.classList.remove("active");
                bulkTab.classList.add("active");
                singleWrapper.style.display = "none";
                bulkWrapper.style.display = "flex";
                
                // Sync array to bulk textarea
                document.getElementById("bulkParticipantInput").value = currentParticipants.join("\n");
            }
        }

        function parseBulkValue(value) {
            let lines = value.split("\n");
            // If they are all empty, keep at least one empty row
            if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) {
                currentParticipants = [""];
            } else {
                currentParticipants = lines;
            }
            window.currentParticipants = currentParticipants;
            
            // Limit to 60
            if (currentParticipants.length > 60) {
                currentParticipants = currentParticipants.slice(0, 60);
                window.currentParticipants = currentParticipants;
                if (entryMode === 'bulk') {
                    document.getElementById("bulkParticipantInput").value = currentParticipants.join("\n");
                }
                showToast("จำกัดรายชื่อผู้ร่วมอบรมสูงสุด 60 คนเท่านั้น", "info");
            }
            
            if (activeParticipantIndex >= currentParticipants.length) {
                activeParticipantIndex = Math.max(0, currentParticipants.length - 1);
            }
            window.activeParticipantIndex = activeParticipantIndex;
            
            document.getElementById("participantCount").textContent = currentParticipants.length;
            saveParticipantsToRecord();
        }

        function handleBulkInput(value) {
            parseBulkValue(value);
            updateCertPreview();
        }

        function openCertificateCreator(id) {
            certActiveRecordId = id;
            window.certActiveRecordId = id;
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            // Close the details modal first
            closeModal('detailModal');

            // Prefill inputs and filter out empty strings/spaces to keep list clean
            currentParticipants = req.participants && req.participants.length > 0 
                ? req.participants.map(p => p.trim()).filter(p => p.length > 0) 
                : [];
            if (currentParticipants.length === 0) {
                currentParticipants = [""];
            }
            window.currentParticipants = currentParticipants;
            activeParticipantIndex = 0;
            window.activeParticipantIndex = 0;
            
            // Sync current participants to bulk input so it doesn't wipe them when setEntryMode is called
            document.getElementById("bulkParticipantInput").value = currentParticipants.join("\n");
            
            // Force reset view to single mode on open
            setEntryMode('single');
            
            document.getElementById("certInputTrainer").value = req.requester; // "วิทยากรผู้อบรม"
            document.getElementById("certInputDirector").value = "นายวัฒนชัย เตียวแก"; // default managing director
            
            // Format dates
            let formattedDate = "";
            if (req.startDate && req.endDate) {
                formattedDate = formatThaiDateStr(req.endDate);
            } else {
                formattedDate = formatThaiDateStr(req.date);
            }
            document.getElementById("certInputDate").value = formattedDate;

            // Load values to preview frame
            document.getElementById("certPrevCourse").textContent = req.courseName;
            
            // Render participant rows
            renderParticipantRows();

            // Refresh preview
            updateCertPreview();

            // Open Certificate Creator Modal
            setTimeout(() => {
                openModal('certificateModal');
            }, 350);
        }

        function formatThaiDateStr(dateStr) {
            if (!dateStr) return "[ระบุวันที่]";
            try {
                // Check if range date e.g. "2026-05-20 ถึง 2026-05-22"
                if (dateStr.includes("ถึง")) {
                    dateStr = dateStr.split("ถึง")[1].trim(); // take end date
                }
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr; // fallback if already formatted
                
                const day = d.getDate();
                const month = THAI_MONTHS[d.getMonth()];
                const year = d.getFullYear() + 543;
                return `${day} ${month} พ.ศ. ${year}`;
            } catch (e) {
                return dateStr;
            }
        }

        function renderParticipantRows() {
            const listContainer = document.getElementById("participantInputList");
            const countLabel = document.getElementById("participantCount");
            const addBtn = document.getElementById("btnAddParticipant");
            
            countLabel.textContent = currentParticipants.length;
            
            // Enable/disable add button based on max limit 60
            if (currentParticipants.length >= 60) {
                addBtn.disabled = true;
                addBtn.style.opacity = "0.5";
                addBtn.style.cursor = "not-allowed";
            } else {
                addBtn.disabled = false;
                addBtn.style.opacity = "1";
                addBtn.style.cursor = "pointer";
            }

            listContainer.innerHTML = "";
            currentParticipants.forEach((name, idx) => {
                const row = document.createElement("div");
                row.className = `participant-input-row ${activeParticipantIndex === idx ? 'active' : ''}`;
                row.onclick = () => setActiveParticipant(idx);
                
                row.innerHTML = `
                    <span class="participant-num">${idx + 1}</span>
                    <input type="text" class="participant-input" value="${name}" oninput="updateParticipantName(${idx}, this.value)" placeholder="ชื่อ-นามสกุล..." onclick="event.stopPropagation(); setActiveParticipant(${idx});" />
                    ${currentParticipants.length > 1 ? `
                        <button type="button" class="btn-remove-participant" onclick="removeParticipantRow(event, ${idx})">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : ''}
                `;
                listContainer.appendChild(row);
            });
        }

        function addParticipantRow() {
            if (currentParticipants.length >= 60) {
                showToast("จำกัดจำนวนผู้เข้าร่วมอบรมสูงสุด 60 คน", "info");
                return;
            }
            currentParticipants.push("");
            activeParticipantIndex = currentParticipants.length - 1;
            window.currentParticipants = currentParticipants;
            window.activeParticipantIndex = activeParticipantIndex;
            renderParticipantRows();
            updateCertPreview();
            
            // Focus on the newly added input
            setTimeout(() => {
                const inputs = document.querySelectorAll(".participant-input");
                if (inputs.length > 0) {
                    const lastInput = inputs[inputs.length - 1];
                    lastInput.focus();
                    lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }

        function removeParticipantRow(event, idx) {
            if (event) event.stopPropagation();
            if (currentParticipants.length <= 1) return;
            
            currentParticipants.splice(idx, 1);
            if (activeParticipantIndex >= currentParticipants.length) {
                activeParticipantIndex = currentParticipants.length - 1;
            }
            window.currentParticipants = currentParticipants;
            window.activeParticipantIndex = activeParticipantIndex;
            renderParticipantRows();
            updateCertPreview();
            
            // Save to the record
            saveParticipantsToRecord();
        }

        function setActiveParticipant(idx) {
            activeParticipantIndex = idx;
            window.activeParticipantIndex = idx;
            const rows = document.querySelectorAll(".participant-input-row");
            rows.forEach((r, i) => {
                if (i === idx) r.classList.add("active");
                else r.classList.remove("active");
            });
            updateCertPreview();
        }

        function updateParticipantName(idx, val) {
            currentParticipants[idx] = val;
            window.currentParticipants = currentParticipants;
            
            // Live update preview only if this is the active participant
            if (activeParticipantIndex === idx) {
                document.getElementById("certPrevName").textContent = val.trim() || "[กรอกชื่อผู้ร่วมอบรม]";
            }
            
            // Save to the record
            saveParticipantsToRecord();
        }

        function saveParticipantsToRecord() {
            if (!certActiveRecordId) return;
            const req = trainingRequests.find(r => r.id === certActiveRecordId);
            if (req) {
                req.participants = [...currentParticipants];
                window.currentParticipants = currentParticipants;
                // Bug-06 fix: targeted debounced write instead of full saveDatabase() write storm
                debouncedSaveParticipants(req.id, req.participants);
            }
        }

        function updateCertPreview() {
            const name = currentParticipants[activeParticipantIndex]?.trim() || "[กรอกชื่อผู้ร่วมอบรม]";
            const trainer = document.getElementById("certInputTrainer").value.trim() || "[ระบุชื่อวิทยากร]";
            const director = document.getElementById("certInputDirector").value.trim() || "[ระบุชื่อกรรมการผู้จัดการ]";
            const date = document.getElementById("certInputDate").value.trim() || "[ระบุวันที่]";

            document.getElementById("certPrevName").textContent = name;
            document.getElementById("certPrevTrainer").textContent = trainer;
            document.getElementById("certPrevDirector").textContent = director;
            document.getElementById("certPrevDate").textContent = date;
        }

        function downloadSingleCertificate() {
            const wrapper = document.querySelector(".cert-scale-wrapper");
            const element = document.getElementById("certificatePrintFrame");
            const nameInput = currentParticipants[activeParticipantIndex]?.trim();
            
            if (!nameInput) {
                showToast("กรุณากรอกชื่อผู้ร่วมอบรมที่เลือกก่อนดาวน์โหลดเกียรติบัตร", "info");
                return;
            }

            showToast(`กำลังสร้างเกียรติบัตรสำหรับ ${nameInput}...`, "info");

            const originalTransform = wrapper.style.transform;
            wrapper.style.transform = "none";

            const filename = `Certificate_${nameInput.replace(/\s+/g, '_')}.pdf`;

            const opt = {
                margin:       0,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2.2, useCORS: true, letterRendering: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                wrapper.style.transform = originalTransform;
                showToast("ดาวน์โหลดเกียรติบัตร PDF สำเร็จ!", "success");
            }).catch(err => {
                console.error("PDF Generation error:", err);
                wrapper.style.transform = originalTransform;
                showToast("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง", "info");
            });
        }

        async function downloadAllCertificates() {
            const validNames = currentParticipants.map(name => name.trim()).filter(name => name.length > 0);
            if (validNames.length === 0) {
                showToast("ไม่มีชื่อผู้ร่วมอบรมที่สมบูรณ์สำหรับออกเกียรติบัตร", "info");
                return;
            }

            showToast(`กำลังเริ่มดาวน์โหลดเกียรติบัตรของทุกคนทั้งหมด ${validNames.length} ไฟล์แบบลำดับ...`, "info");
            
            const wrapper = document.querySelector(".cert-scale-wrapper");
            const element = document.getElementById("certificatePrintFrame");
            const originalTransform = wrapper.style.transform;
            
            // Save current active state to restore later
            const oldActiveIdx = activeParticipantIndex;

            // Turn off transform scale once for the process (will restore after all finished)
            wrapper.style.transform = "none";

            for (let i = 0; i < validNames.length; i++) {
                const name = validNames[i];
                
                // Update live preview values programmatically for rendering
                document.getElementById("certPrevName").textContent = name;
                
                const filename = `Certificate_${name.replace(/\s+/g, '_')}.pdf`;
                const opt = {
                    margin:       0,
                    filename:     filename,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2.2, useCORS: true, letterRendering: true, logging: false },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };

                showToast(`กำลังดาวน์โหลด [${i + 1}/${validNames.length}]: ${name}`, "info");

                try {
                    await html2pdf().set(opt).from(element).save();
                    // Add a tiny delay between downloads to prevent chrome blocking batch downloads
                    await new Promise(resolve => setTimeout(resolve, 800));
                } catch (err) {
                    console.error(`Failed to export certificate for ${name}:`, err);
                }
            }

            // Restore original state
            wrapper.style.transform = originalTransform;
            setActiveParticipant(oldActiveIdx);
            showToast("ดาวน์โหลดเกียรติบัตรของทุกคนเรียบร้อยแล้ว!", "success");
        }

        let pendingDeleteId = null;

        function triggerDeleteTraining(id) {
            pendingDeleteId = id;
            openModal('deleteConfirmModal');
        }

        function executeDeleteRecord() {
            if (!pendingDeleteId) return;
            
            trainingRequests = trainingRequests.filter(r => r.id !== pendingDeleteId);
            saveDatabase();
            
            closeModal('deleteConfirmModal');
            closeModal('detailModal');
            
            checkDatabaseState();
            renderTable();
            calculateSummary();
            renderCalendarGrid();
            
            showToast("ลบรายการอบรมออกจากระบบเรียบร้อยแล้ว", "info");
            pendingDeleteId = null;
        }

        // ===== QR CODE & REGISTRATION LINK SYSTEM =====
        let generatedLinkGlobal = "";

        function openQrModal(id) {
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            // Generate URL based on production URL or local domain
            const origin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname
                ? window.location.origin
                : "https://mentra-manager.vercel.app";

            const registrationUrl = `${origin}/register_training.html?id=${req.id}`;
            generatedLinkGlobal = registrationUrl;

            document.getElementById("registrationLinkInput").value = registrationUrl;

            // Google Chart/QRServer URL
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationUrl)}`;
            document.getElementById("qrCodeImage").src = qrApiUrl;

            closeModal("detailModal");
            setTimeout(() => {
                openModal("qrModal");
            }, 350);
        }

        function copyRegistrationLink() {
            const input = document.getElementById("registrationLinkInput");
            input.select();
            input.setSelectionRange(0, 99999); // For mobile

            try {
                navigator.clipboard.writeText(input.value);
                showToast("คัดลอกลิงก์ลงทะเบียนสำเร็จแล้ว!", "success");
            } catch (err) {
                // Fallback
                document.execCommand("copy");
                showToast("คัดลอกลิงก์ลงทะเบียนสำเร็จแล้ว!", "success");
            }
        }

        async function downloadQrCode() {
            const img = document.getElementById("qrCodeImage");
            if (!img.src) return;

            showToast("กำลังดาวน์โหลดภาพ QR Code...", "info");
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = `QR_${currentActiveRowId || "Registration"}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast("ดาวน์โหลด QR Code สำเร็จ!", "success");
            } catch (err) {
                console.error("Download QR Code failed:", err);
                // Fallback: Open in new tab
                window.open(img.src, "_blank");
                showToast("เปิดรูปภาพ QR Code ในหน้าต่างใหม่แล้ว", "warning");
            }
        }

    


                        
        // โหลด config
        

        
    // Auth state is managed by dashboard.html, just run the inner logic if user exists
    if (window.currentUser) {
        let user = window.currentUser;
        
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
                
    }
}

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
    

// Global bindings for inline HTML onclick
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.saveDatabase = saveDatabase;
window.checkDatabaseState = checkDatabaseState;
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.switchViewPane = switchViewPane;
window.calculateSummary = calculateSummary;
window.renderTable = renderTable;
window.adjustCalendarMonth = adjustCalendarMonth;
window.renderCalendarGrid = renderCalendarGrid;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleCreateRequest = handleCreateRequest;
window.openDetailsModal = openDetailsModal;
window.triggerConfirmTraining = triggerConfirmTraining;
window.executeStatusUpdate = executeStatusUpdate;
window.updateStatus = updateStatus;
window.openUploadModal = openUploadModal;
window.setupDragAndDrop = setupDragAndDrop;
window.displaySelectedFile = displaySelectedFile;
window.clearSelectedFile = clearSelectedFile;
window.processUpload = processUpload;
window.showToast = showToast;
window.setEntryMode = setEntryMode;
window.parseBulkValue = parseBulkValue;
window.handleBulkInput = handleBulkInput;
window.openCertificateCreator = openCertificateCreator;
window.formatThaiDateStr = formatThaiDateStr;
window.renderParticipantRows = renderParticipantRows;
window.addParticipantRow = addParticipantRow;
window.removeParticipantRow = removeParticipantRow;
window.setActiveParticipant = setActiveParticipant;
window.updateParticipantName = updateParticipantName;
window.saveParticipantsToRecord = saveParticipantsToRecord;
window.updateCertPreview = updateCertPreview;
window.downloadSingleCertificate = downloadSingleCertificate;
window.downloadAllCertificates = downloadAllCertificates;
window.triggerDeleteTraining = triggerDeleteTraining;
window.executeDeleteRecord = executeDeleteRecord;
window.openQrModal = openQrModal;
window.copyRegistrationLink = copyRegistrationLink;
window.downloadQrCode = downloadQrCode;
