import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs, onSnapshot, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

                                    persistentLocalCache, persistentMultipleTabManager
        } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

        // --- Firebase & Firestore Setup ---
        
        const db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });

        

        // --- Initialization ---
        export async function initQuotationView() {
    const db = window.db;
    const currentUser = window.currentUser;
    
            document.getElementById('docDate').valueAsDate = new Date();
            generateRefNo();
            addTableRow(); // Add 1 empty row by default
            loadSavedRecipientsDropdown(); // Load saved recipient profiles

            // Restore sidebar collapse state
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            if (isCollapsed) {
                document.getElementById('sidebar').classList.add('collapsed');
                document.querySelector('.main-wrapper').style.marginLeft = 'var(--sidebar-w-collapsed)';
            }
        


        // --- Firebase Auth Guard & Cloud Sync Listener ---
        
    // Auth state is managed by dashboard.html, just run the inner logic if user exists
    if (window.currentUser) {
        let user = window.currentUser;
        
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
                            window.location.href = 'index.html?msg=pending';
                            return;
                        } else if (userStatus === 'rejected') {
                            alert('บัญชีของคุณได้รับการปฏิเสธสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ');
                            await signOut(auth);
                            window.location.href = 'index.html?msg=rejected';
                            return;
                        }

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

                        // Robust Local & Cloud Sync: Merge data instead of overwriting to prevent data loss
                        const localRecipients = getSavedRecipients();
                        if (userData && Array.isArray(userData.savedRecipients)) {
                            const cloudRecipients = userData.savedRecipients;
                            
                            // Merge local and cloud based on unique company names (case-insensitive)
                            const merged = [...localRecipients];
                            cloudRecipients.forEach(cr => {
                                const exists = merged.some(lr => lr.toCompany.toLowerCase() === cr.toCompany.toLowerCase());
                                if (!exists) {
                                    merged.push(cr);
                                }
                            
    }
}
                            
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
                        
                        // Show body now that the user is fully verified
                        setTimeout(() => {
                            document.body.style.opacity = '1';
                            document.body.style.pointerEvents = 'auto';
                        }, 100);
                    } else {
                        // User document deleted!
                        alert('ไม่พบบัญชีผู้ใช้นี้ในระบบ หรือบัญชีของคุณถูกลบแล้ว');
                        await signOut(auth);
                        window.location.href = 'index.html?msg=deleted';
                    }
                } catch (err) {
                    console.error("Error loading user profile:", err);
                }
            } else {
                window.location.href = 'index.html'; // Auth Guard
            }
        });

        // --- Logout & Sidebar Toggle Helpers ---
        async function handleLogout() {
            if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                try {
                    await signOut(auth);
                    window.location.href = 'index.html';
                } catch (e) {
                    console.error('Logout failed:', e);
                }
            }
        }

        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');

            const wrapper = document.querySelector('.main-wrapper');
            if (isCollapsed) {
                wrapper.style.marginLeft = 'var(--sidebar-w-collapsed)';
            } else {
                wrapper.style.marginLeft = 'var(--sidebar-w)';
            }
        }

        // Expose to window scope
        window.handleLogout = handleLogout;
        window.toggleSidebarCollapse = toggleSidebarCollapse;

        // --- Core Functions ---
        function generateRefNo() {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const randomRun = Math.floor(Math.random() * 99) + 1;
            const runStr = String(randomRun).padStart(2, '0');
            document.getElementById('refNo').value = `MTQ${year}${month}${runStr}`;
        }

        function formatNumber(num) {
            return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // --- Table Management ---
        function addTableRow() {
            const tbody = document.getElementById('itemsBody');
            const rowCount = tbody.children.length;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle; font-weight: 700; color: #1A6FBF; background-color: #f8fafc; font-size: 0.95rem;">${rowCount + 1}</td>
                <td><input type="text" class="table-input item-desc" placeholder="ชื่อสินค้า/บริการ"></td>
                <td><input type="number" class="table-input item-qty" value="1" min="1" onchange="calculateRow(this)"></td>
                <td>
                    <select class="table-input item-unit" style="padding: 0.6rem 0.4rem; font-family: 'Sarabun', sans-serif;">
                        <option value="ชุด" selected>ชุด</option>
                        <option value="ตัว">ตัว</option>
                        <option value="ชิ้น">ชิ้น</option>
                        <option value="เครื่อง">เครื่อง</option>
                        <option value="กล่อง">กล่อง</option>
                        <option value="แพ็ค">แพ็ค</option>
                        <option value="เส้น">เส้น</option>
                        <option value="งาน">งาน</option>
                    </select>
                </td>
                <td><input type="number" class="table-input item-price" value="0" min="0" step="0.01" onchange="calculateRow(this)"></td>
                <td style="vertical-align: middle; text-align: right;" class="item-total-text">0.00</td>
                <td class="col-action" style="vertical-align: middle;">
                    <button class="btn btn-danger" onclick="removeTableRow(this)"><i class='bx bx-trash'></i></button>
                </td>
            `;
            tbody.appendChild(tr);
            updateRowNumbers();
            calculateAll();
        }

        function removeTableRow(btn) {
            const tbody = document.getElementById('itemsBody');
            if (tbody.children.length > 1) {
                btn.closest('tr').remove();
                updateRowNumbers();
                calculateAll();
            } else {
                alert("ต้องมีรายการอย่างน้อย 1 รายการ");
            }
        }

        function updateRowNumbers() {
            const rows = document.getElementById('itemsBody').children;
            for (let i = 0; i < rows.length; i++) {
                rows[i].cells[0].innerText = i + 1;
            }
        }

        function calculateRow(input) {
            const tr = input.closest('tr');
            const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
            const price = parseFloat(tr.querySelector('.item-price').value) || 0;
            const total = qty * price;
            tr.querySelector('.item-total-text').innerText = formatNumber(total);
            tr.dataset.total = total;
            calculateAll();
        }

        function calculateAll() {
            const rows = document.getElementById('itemsBody').children;
            let grandTotal = 0;

            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
                const price = parseFloat(tr.querySelector('.item-price').value) || 0;
                grandTotal += (qty * price);
            }

            const vat = grandTotal * (7 / 107);
            const subTotal = grandTotal - vat;

            document.getElementById('subTotalDisplay').innerText = formatNumber(subTotal);
            document.getElementById('vatDisplay').innerText = formatNumber(vat);
            document.getElementById('grandTotalDisplay').innerText = formatNumber(grandTotal);

            document.getElementById('thaiBahtText').innerText = `(${ArabicNumberToText(grandTotal.toFixed(2))})`;
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

        // --- PDF Export using html2pdf.js ---
        function exportToPDF() {
            calculateAll(); // Recalculate everything

            // Copy input values to Print Template
            document.getElementById('pToCompany').innerText = document.getElementById('toCompany').value || '-';
            document.getElementById('pToAddress').innerHTML = (document.getElementById('toAddress').value || '-').replace(/\n/g, '<br>');
            document.getElementById('pToAttn').innerText = document.getElementById('toAttn').value || '-';
            document.getElementById('pToTel').innerText = document.getElementById('toTel').value || '-';
            document.getElementById('pToEmail').innerText = document.getElementById('toEmail').value || '-';

            document.getElementById('pRefNo').innerText = document.getElementById('refNo').value;

            // Format Date for print template
            const docDateVal = document.getElementById('docDate').value;
            let dateObj = new Date(docDateVal);
            document.getElementById('pDocDate').innerText = isNaN(dateObj.getTime()) ? '-' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

            document.getElementById('pValidity').innerText = document.getElementById('termValidity').value || '-';
            document.getElementById('pDelivery').innerText = document.getElementById('termDelivery').value || '-';
            document.getElementById('pPayment').innerText = document.getElementById('termPayment').value || '-';

            document.getElementById('pRemark').innerHTML = (document.getElementById('remark').value || '-').replace(/\n/g, '<br>');

            document.getElementById('pSubTotal').innerText = document.getElementById('subTotalDisplay').innerText;
            document.getElementById('pVat').innerText = document.getElementById('vatDisplay').innerText;
            document.getElementById('pGrandTotal').innerText = document.getElementById('grandTotalDisplay').innerText;
            document.getElementById('pBahtText').innerText = document.getElementById('thaiBahtText').innerText;

            // Generate Print Table rows
            const pItemsBody = document.getElementById('pItemsBody');
            pItemsBody.innerHTML = ''; // Clear previous

            const rows = document.getElementById('itemsBody').children;
            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                const desc = tr.querySelector('.item-desc').value || '-';
                const qty = tr.querySelector('.item-qty').value || '0';
                const unit = tr.querySelector('.item-unit').value || '-';
                const price = parseFloat(tr.querySelector('.item-price').value || 0);
                const totalText = tr.querySelector('.item-total-text').innerText;

                const newTr = document.createElement('tr');
                newTr.style.borderBottom = '0.5px solid #e2e8f0';
                newTr.style.letterSpacing = 'normal';
                if (i % 2 === 1) {
                    newTr.style.backgroundColor = '#f8fafc'; // Zebra striping
                }
                newTr.innerHTML = `
                    <td style="padding: 7px 6px; text-align: center; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; font-weight: 700; color: #1A6FBF; background-color: #f8fafc; letter-spacing: normal !important; white-space: nowrap;">${i + 1}</td>
                    <td style="padding: 7px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">${desc}</td>
                    <td style="padding: 7px 6px; text-align: center; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important; white-space: nowrap;">${qty}</td>
                    <td style="padding: 7px 6px; text-align: center; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important; white-space: nowrap;">${unit}</td>
                    <td style="padding: 7px 6px; text-align: right; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important; white-space: nowrap;">${formatNumber(price)}</td>
                    <td style="padding: 7px 6px; text-align: right; border: 0.5px solid #e2e8f0; font-weight: 500; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important; white-space: nowrap;">${totalText}</td>
                `;
                pItemsBody.appendChild(newTr);
            }

            // Fill with empty aesthetic lines if less than 5 items
            const minRows = 5;
            if (rows.length < minRows) {
                for (let i = rows.length; i < minRows; i++) {
                    const emptyTr = document.createElement('tr');
                    emptyTr.style.borderBottom = '0.5px solid #e2e8f0';
                    emptyTr.style.letterSpacing = 'normal';
                    if (i % 2 === 1) {
                        emptyTr.style.backgroundColor = '#f8fafc'; // Zebra striping for empty rows
                    }
                    emptyTr.innerHTML = `
                        <td style="padding: 5px 6px; text-align: center; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: 5px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: 5px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: 5px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: 5px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                        <td style="padding: 5px 6px; border: 0.5px solid #e2e8f0; font-family: 'Sarabun', 'Tahoma', sans-serif !important; font-size: 10.5px !important; letter-spacing: normal !important;">&nbsp;</td>
                    `;
                    pItemsBody.appendChild(emptyTr);
                }
            }

            // Temporarily show the print area for html2pdf to grab styling correctly, then hide
            const printElement = document.getElementById('printArea');
            printElement.style.display = 'block';

            // Wait for all Google Web Fonts to be 100% loaded and ready in the browser
            document.fonts.ready.then(() => {
                // Delay 150ms to ensure the browser has completed the text paint cycle
                setTimeout(() => {
                    const refNo = document.getElementById('refNo').value || 'Quotation';
                    const clientName = (document.getElementById('toCompany').value || '').trim();
                    const filenameStr = clientName ? `${refNo} ${clientName}.pdf` : `${refNo}.pdf`;

                    const html2canvasOpts = { scale: 2, useCORS: true, logging: false };
                    
                    let originalScrollY = window.scrollY;
                    let originalScrollX = window.scrollX;

                    // Force exact width for mobile to ensure perfectly centered layout (matches A4 aspect)
                    if (window.innerWidth < 1024) {
                        html2canvasOpts.windowWidth = 800;
                        
                        // Break out of mobile container constraints to prevent clipping
                        printElement.style.position = 'absolute';
                        printElement.style.left = '0';
                        printElement.style.top = '0';
                        printElement.style.width = '800px'; // Tight crop to inner content width (771px) + small margin
                        printElement.style.maxWidth = 'none';
                        printElement.style.zIndex = '9999';

                        // Crucial for mobile: scroll to top-left so html2canvas captures the absolute element correctly
                        window.scrollTo(0, 0);
                    }

                    // Configure html2pdf options
                    const opt = {
                        margin: [6, 10, 10, 10],
                        filename: filenameStr,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: html2canvasOpts,
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    // Generate and save
                    html2pdf().set(opt).from(printElement).save().then(() => {
                        printElement.style.cssText = 'display: none; background: #ffffff;';
                        if (window.innerWidth < 1024) window.scrollTo(originalScrollX, originalScrollY);
                    }).catch(err => {
                        console.error("PDF generation failed:", err);
                        printElement.style.cssText = 'display: none; background: #ffffff;';
                        if (window.innerWidth < 1024) window.scrollTo(originalScrollX, originalScrollY);
                        alert("เกิดข้อผิดพลาดในการสร้าง PDF");
                    });
                }, 150);
            });
        }

        // --- Recipient Profile Management ---
        function getSavedRecipients() {
            const stored = localStorage.getItem('saved_recipients');
            return stored ? JSON.parse(stored) : [];
        }

        function loadSavedRecipientsDropdown() {
            const select = document.getElementById('savedRecipientsSelect');
            const deleteBtn = document.getElementById('deleteRecipientBtn');
            select.innerHTML = '<option value="">-- เลือกผู้รับที่บันทึกไว้ --</option>';

            const recipients = getSavedRecipients();
            recipients.forEach((r, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.innerText = r.toCompany;
                select.appendChild(opt);
            });

            deleteBtn.style.display = 'none'; // Hide delete button initially
        }

        async function saveCurrentRecipient() {
            const toCompany = document.getElementById('toCompany').value.trim();
            const toAddress = document.getElementById('toAddress').value.trim();
            const toAttn = document.getElementById('toAttn').value.trim();
            const toTel = document.getElementById('toTel').value.trim();
            const toEmail = document.getElementById('toEmail').value.trim();

            if (!toCompany) {
                alert("กรุณากรอกชื่อบริษัท / ผู้รับ เพื่อใช้บันทึกข้อมูล");
                return;
            }

            const recipients = getSavedRecipients();
            const newRecipient = { toCompany, toAddress, toAttn, toTel, toEmail };

            // Check if already exists, update it, otherwise add new
            const existingIndex = recipients.findIndex(r => r.toCompany.toLowerCase() === toCompany.toLowerCase());
            if (existingIndex > -1) {
                recipients[existingIndex] = newRecipient;
            } else {
                recipients.push(newRecipient);
            }

            localStorage.setItem('saved_recipients', JSON.stringify(recipients));
            loadSavedRecipientsDropdown();

            // Sync to Firestore cloud if logged in
            if (currentUser) {
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        savedRecipients: recipients
                    }, { merge: true });
                    alert(`บันทึกและซิงค์ข้อมูลผู้รับ "${toCompany}" ไปยังคลาวด์สำเร็จ!`);
                } catch (err) {
                    console.error("Firestore sync failed:", err);
                    alert(`บันทึกข้อมูลผู้รับ "${toCompany}" สำเร็จในเครื่อง (แต่เชื่อมต่อระบบคลาวด์ล้มเหลว)`);
                }
            } else {
                alert(`บันทึกข้อมูลผู้รับ "${toCompany}" สำเร็จในเครื่องนี้ (กรุณาเข้าสู่ระบบเพื่อใช้งานข้ามเครื่อง)`);
            }

            // Auto select newly saved recipient
            const updatedRecipients = getSavedRecipients();
            const newIndex = updatedRecipients.findIndex(r => r.toCompany === toCompany);
            if (newIndex > -1) {
                const select = document.getElementById('savedRecipientsSelect');
                select.value = newIndex;
                loadSavedRecipient();
            }
        }

        function loadSavedRecipient() {
            const select = document.getElementById('savedRecipientsSelect');
            const deleteBtn = document.getElementById('deleteRecipientBtn');
            const selectedVal = select.value;

            if (selectedVal === "") {
                deleteBtn.style.display = 'none';
                return;
            }

            const recipients = getSavedRecipients();
            const r = recipients[selectedVal];

            if (r) {
                document.getElementById('toCompany').value = r.toCompany;
                document.getElementById('toAddress').value = r.toAddress;
                document.getElementById('toAttn').value = r.toAttn;
                document.getElementById('toTel').value = r.toTel;
                document.getElementById('toEmail').value = r.toEmail;
                deleteBtn.style.display = 'inline-block'; // Show delete button
            }
        }

        async function deleteSelectedRecipient() {
            const select = document.getElementById('savedRecipientsSelect');
            const selectedVal = select.value;

            if (selectedVal === "") return;

            const recipients = getSavedRecipients();
            const r = recipients[selectedVal];

            if (r && confirm(`คุณต้องการลบข้อมูลผู้รับ "${r.toCompany}" ใช่หรือไม่?`)) {
                recipients.splice(selectedVal, 1);
                localStorage.setItem('saved_recipients', JSON.stringify(recipients));

                // Clear fields
                document.getElementById('toCompany').value = '';
                document.getElementById('toAddress').value = '';
                document.getElementById('toAttn').value = '';
                document.getElementById('toTel').value = '';
                document.getElementById('toEmail').value = '';

                loadSavedRecipientsDropdown();

                // Sync delete to Firestore if logged in
                if (currentUser) {
                    try {
                        await setDoc(doc(db, 'users', currentUser.uid), {
                            savedRecipients: recipients
                        }, { merge: true });
                    } catch (err) {
                        console.error("Firestore delete sync failed:", err);
                    }
                }
            }
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

        // --- Expose functions to global window scope for inline HTML events ---
        window.addTableRow = addTableRow;
        window.removeTableRow = removeTableRow;
        window.calculateRow = calculateRow;
        window.exportToPDF = exportToPDF;
        window.saveCurrentRecipient = saveCurrentRecipient;
        window.loadSavedRecipient = loadSavedRecipient;
        window.deleteSelectedRecipient = deleteSelectedRecipient;
        window.toggleSidebar = toggleSidebar;
        window.closeSidebar = closeSidebar;
    

// Global bindings for inline HTML onclick
window.handleLogout = handleLogout;
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.generateRefNo = generateRefNo;
window.formatNumber = formatNumber;
window.addTableRow = addTableRow;
window.removeTableRow = removeTableRow;
window.updateRowNumbers = updateRowNumbers;
window.calculateRow = calculateRow;
window.calculateAll = calculateAll;
window.ArabicNumberToText = ArabicNumberToText;
window.ConvertText = ConvertText;
window.exportToPDF = exportToPDF;
window.getSavedRecipients = getSavedRecipients;
window.loadSavedRecipientsDropdown = loadSavedRecipientsDropdown;
window.saveCurrentRecipient = saveCurrentRecipient;
window.loadSavedRecipient = loadSavedRecipient;
window.deleteSelectedRecipient = deleteSelectedRecipient;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
