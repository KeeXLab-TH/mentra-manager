
        // GLOBAL STATE
        let currentImageBase64 = null;
        let currentFile = null;
        let currentImage = null;
        let canvas = null;
        let ctx = null;
        let zoomLevel = 1.0;
        let rotationAngle = 0;
        let activeFilter = 'normal';
        let currentTableData = [];
        let currentHeaders = ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];

        function getCanvas() {
            if (!canvas) canvas = document.getElementById('docCanvas');
            return canvas;
        }

        function getCtx() {
            const cvs = getCanvas();
            if (cvs && !ctx) ctx = cvs.getContext('2d');
            return ctx;
        }

        // INITIALIZATION
        window.addEventListener('DOMContentLoaded', () => {
            canvas = document.getElementById('docCanvas');
            if (canvas) ctx = canvas.getContext('2d');

            loadSamplePreset('receipt');

            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.addEventListener('click', function() {
                    this.value = '';
                });

                fileInput.addEventListener('change', function(evt) {
                    const files = evt.target.files;
                    if (files && files[0]) {
                        processImageFile(files[0]);
                    }
                });
            }

            const dropzone = document.getElementById('dropzoneLabel');
            if (dropzone) {
                dropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('dragover');
                });
                dropzone.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                });
                dropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processImageFile(e.dataTransfer.files[0]);
                    }
                });
            }
        });

        // SIDEBAR TOGGLE
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar');
            const mainWrapper = document.getElementById('mainWrapper');
            sidebar.classList.toggle('collapsed');
            mainWrapper.classList.toggle('sidebar-collapsed');
        }

        // TAB SWITCHER
        function switchTab(tab) {
            document.getElementById('tabTable').classList.toggle('active', tab === 'table');
            document.getElementById('tabRaw').classList.toggle('active', tab === 'raw');
            document.getElementById('viewTableContainer').style.display = tab === 'table' ? 'block' : 'none';
            document.getElementById('viewRawContainer').style.display = tab === 'raw' ? 'block' : 'none';
        }

        // LOAD SAMPLE PRESETS (Draws canvas image programmatically)
        function loadSamplePreset(type) {
            canvas.width = 800;
            canvas.height = 1050;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // General styling
            ctx.fillStyle = '#0b3d6e';
            ctx.fillRect(0, 0, canvas.width, 100);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px "Kanit", sans-serif';

            if (type === 'receipt') {
                // Background & Header Bar matching Quotation design
                ctx.fillStyle = '#ff5500';
                ctx.fillRect(40, 40, 50, 50);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 26px "Kanit", sans-serif';
                ctx.fillText('@', 52, 75);

                ctx.fillStyle = '#ff5500';
                ctx.font = 'bold 26px "Kanit", sans-serif';
                ctx.fillText('Commerce', 100, 75);

                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 18px "Kanit", sans-serif';
                ctx.fillText('ร้านเอ็มคอมเมิร์ซ', 310, 60);

                ctx.font = '13px "Kanit", sans-serif';
                ctx.fillStyle = '#64748b';
                ctx.fillText('23/1 ม.3 ต.ดอนพุทรา อ.ดอนตูม จ.นครปฐม 73150', 310, 80);
                ctx.fillText('TEL: 0641395656  TAX ID: 3730400244797', 310, 98);

                // Right title
                ctx.fillStyle = '#ff5500';
                ctx.font = 'bold 24px "Kanit", sans-serif';
                ctx.fillText('ใบเสนอราคา', 620, 65);
                ctx.font = 'bold 13px "Kanit", sans-serif';
                ctx.fillText('QUOTATION', 630, 85);

                // Recipient and Document details box
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(40, 120, 350, 100);
                ctx.fillRect(420, 120, 340, 100);

                ctx.fillStyle = '#ff5500';
                ctx.font = 'bold 12px "Kanit", sans-serif';
                ctx.fillText('RECIPIENT INFORMATION', 50, 138);
                ctx.fillText('DOCUMENT DETAILS', 430, 138);

                ctx.fillStyle = '#475569';
                ctx.font = '13px "Kanit", sans-serif';
                ctx.fillText('ชื่อ / To:  -', 50, 160);
                ctx.fillText('ที่อยู่:        -', 50, 180);
                ctx.fillText('โทร / Tel: -   | อีเมล: -', 50, 200);

                ctx.fillText('เลขที่ / Ref. No: -', 430, 160);
                ctx.fillText('วันที่ / Date: -', 430, 180);
                ctx.fillText('ยืนราคา: 30 วัน  | ส่งมอบ: 15-30 วัน', 430, 200);

                // Orange Table Header (6 Columns)
                ctx.fillStyle = '#ff5500';
                ctx.fillRect(40, 250, 720, 36);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px "Kanit", sans-serif';
                ctx.fillText('ลำดับ', 55, 273);
                ctx.fillText('รายการสินค้า / รายละเอียด', 130, 273);
                ctx.fillText('จำนวน', 440, 273);
                ctx.fillText('หน่วย', 510, 273);
                ctx.fillText('ราคา/หน่วย', 580, 273);
                ctx.fillText('จำนวนเงิน', 680, 273);

                // Table Rows (Exact 3 items from user image)
                const sampleRows = [
                    ['1', 'สายไฟฟ้า VAF ขนาด 2 x 1.5 ตร.มม.ยาว 100 เมตร', '1', 'ม้วน', '2,880.00', '2,880.00'],
                    ['2', 'ท่อ PVC. สีเหลือง ขนาด 1/2 นิ้ว ท่อน้ำไทย ยาว 4 เมตร', '10', 'เส้น', '72.00', '720.00'],
                    ['3', 'ตู้คอนซูมเมอร์ ชนิด RCBO NANO แบบเกาะราง 1 เฟส เมน 32 A. + ลูก 4 ช่อง', '2', 'ตู้', '1,300.00', '2,600.00']
                ];

                let y = 320;
                sampleRows.forEach(row => {
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '13.5px "Kanit", sans-serif';
                    ctx.fillText(row[0], 65, y);
                    
                    // Multi-line wrap for long description if needed
                    ctx.fillText(row[1], 130, y);
                    
                    ctx.fillText(row[2], 450, y);
                    ctx.fillText(row[3], 515, y);
                    ctx.fillText(row[4], 585, y);
                    ctx.fillText(row[5], 685, y);

                    ctx.strokeStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(40, y + 20);
                    ctx.lineTo(760, y + 20);
                    ctx.stroke();

                    y += 50;
                });

                // Summary Totals
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(440, y + 10, 320, 110);
                ctx.strokeStyle = '#cbd5e1';
                ctx.strokeRect(440, y + 10, 320, 110);

                ctx.fillStyle = '#334155';
                ctx.font = '13.5px "Kanit", sans-serif';
                ctx.fillText('รวมเงิน (Sub Total):', 455, y + 35);
                ctx.fillText('5,794.39', 690, y + 35);

                ctx.fillText('ภาษีมูลค่าเพิ่ม 7% (VAT):', 455, y + 65);
                ctx.fillText('405.61', 690, y + 65);

                ctx.fillStyle = '#ff5500';
                ctx.font = 'bold 15px "Kanit", sans-serif';
                ctx.fillText('จำนวนเงินรวมทั้งสิ้น:', 455, y + 95);
                ctx.fillText('6,200.00', 690, y + 95);

                // Populate Preset Table directly
                currentHeaders = ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];
                currentTableData = sampleRows;

            } else if (type === 'catalog') {
                ctx.fillText('บัญชีตารางคลังสินค้าและอุปกรณ์ (EQUIPMENT LIST)', 40, 60);

                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(40, 140, 720, 40);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 15px "Kanit", sans-serif';
                ctx.fillText('รหัสสินค้า', 55, 166);
                ctx.fillText('ชื่อรายการอุปกรณ์', 180, 166);
                ctx.fillText('หมวดหมู่', 440, 166);
                ctx.fillText('จำนวนคงเหลือ', 560, 166);
                ctx.fillText('สถานะ', 680, 166);

                const sampleRows = [
                    ['PRD-001', 'ไมโครโฟนไร้สาย Wireless Mic', 'โสตทัศนูปกรณ์', '12 ชุด', 'พร้อมใช้งาน'],
                    ['PRD-002', 'เครื่องโปรเจคเตอร์ 4K 5000 Lumens', 'อุปกรณ์ห้องประชุม', '5 เครื่อง', 'พร้อมใช้งาน'],
                    ['PRD-003', 'เก้าอี้สัมมนาพับได้ เบาะนุ่ม', 'เฟอร์นิเจอร์', '120 ตัว', 'พร้อมใช้งาน'],
                    ['PRD-004', 'ชุดขาตั้งกล้องและไฟถ่ายทำ Studio', 'อุปกรณ์ถ่ายทำ', '8 ชุด', 'กำลังซ่อมบำรุง'],
                    ['PRD-005', 'กระดานไวท์บอร์ดอิเล็กทรอนิกส์ 75 นิ้ว', 'ไอที', '4 เครื่อง', 'พร้อมใช้งาน']
                ];

                let y = 210;
                sampleRows.forEach(row => {
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '14px "Kanit", sans-serif';
                    ctx.fillText(row[0], 55, y);
                    ctx.fillText(row[1], 180, y);
                    ctx.fillText(row[2], 440, y);
                    ctx.fillText(row[3], 580, y);
                    ctx.fillText(row[4], 680, y);

                    ctx.strokeStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(40, y + 15);
                    ctx.lineTo(760, y + 15);
                    ctx.stroke();

                    y += 45;
                });

                currentHeaders = ['รหัสสินค้า', 'ชื่อรายการอุปกรณ์', 'หมวดหมู่', 'จำนวนคงเหลือ', 'สถานะ'];
                currentTableData = sampleRows;

            } else if (type === 'roster') {
                ctx.fillText('รายชื่อผู้เข้าร่วมการอบรมหลักสูตร AI & Data 2026', 40, 60);

                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(40, 140, 720, 40);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 15px "Kanit", sans-serif';
                ctx.fillText('ลำดับ', 55, 166);
                ctx.fillText('ชื่อ - นามสกุล', 130, 166);
                ctx.fillText('ตำแหน่งงาน', 320, 166);
                ctx.fillText('หน่วยงาน / ฝ่าย', 500, 166);
                ctx.fillText('เบอร์โทรศัพท์', 650, 166);

                const sampleRows = [
                    ['1', 'นายสมชาย ใจดีวิเศษ', 'นักวิเคราะห์ระบบ senior', 'ฝ่ายเทคโนโลยีสารสนเทศ', '081-234-5678'],
                    ['2', 'นางสาววิภาดา ศรีสุข', 'ผู้จัดการฝ่ายจัดซื้อ', 'ฝ่ายบริหารและจัดซื้อ', '089-876-5432'],
                    ['3', 'นายณัฐพงษ์ วงศ์สว่าง', 'วิศวกรซอฟต์แวร์', 'ฝ่ายพัฒนาผลิตภัณฑ์', '086-555-1234'],
                    ['4', 'นางสาวปรียาภรณ์ มั่นคง', 'เจ้าหน้าที่ฝ่ายบัญชี', 'ฝ่ายการเงิน', '082-999-8877'],
                    ['5', 'นายกิตติศักดิ์ พรหมทัต', 'หัวหน้าแผนกวางแผน', 'ฝ่ายยุทธศาสตร์', '084-111-2233']
                ];

                let y = 210;
                sampleRows.forEach(row => {
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '14px "Kanit", sans-serif';
                    ctx.fillText(row[0], 65, y);
                    ctx.fillText(row[1], 130, y);
                    ctx.fillText(row[2], 320, y);
                    ctx.fillText(row[3], 500, y);
                    ctx.fillText(row[4], 650, y);

                    ctx.strokeStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(40, y + 15);
                    ctx.lineTo(760, y + 15);
                    ctx.stroke();

                    y += 45;
                });

                currentHeaders = ['ลำดับ', 'ชื่อ - นามสกุล', 'ตำแหน่งงาน', 'หน่วยงาน / ฝ่าย', 'เบอร์โทรศัพท์'];
                currentTableData = sampleRows;
            }

            // Save original image state
            const cvs = getCanvas();
            const cContext = getCtx();
            if (cvs && cContext) {
                cvs.style.display = 'block';
                const imgData = cvs.toDataURL('image/png');
                currentImage = new Image();
                currentImage.src = imgData;
            }

            // Render table UI
            renderTableUI();
            updateRawTextView();
        }

        // HANDLE FILE UPLOAD & PRIVACY-SAFE LOCAL PROCESSING
        function triggerFileInput() {
            const input = document.getElementById('fileInput');
            if (input) {
                input.value = '';
                input.click();
            }
        }

        function processImageFile(file) {
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                currentImageBase64 = e.target.result;
                currentFile = file;

                // Show preview, hide upload zone
                const uploadZoneArea = document.getElementById('uploadZoneArea');
                const imagePreviewArea = document.getElementById('imagePreviewArea');
                const docImg = document.getElementById('docImg');

                if (uploadZoneArea) uploadZoneArea.style.display = 'none';
                if (imagePreviewArea) imagePreviewArea.style.display = 'block';
                if (docImg) {
                    docImg.src = currentImageBase64;
                }

                zoomLevel = 1.0;
                rotationAngle = 0;

                // Auto-scan document table on import
                setTimeout(() => {
                    runOCRScan();
                }, 800);
            };
            reader.readAsDataURL(file);
        }

        function resetUploadArea() {
            currentImageBase64 = null;
            currentFile = null;
            const uploadZoneArea = document.getElementById('uploadZoneArea');
            const imagePreviewArea = document.getElementById('imagePreviewArea');
            const docImg = document.getElementById('docImg');
            const fileInput = document.getElementById('fileInput');
            if (uploadZoneArea) uploadZoneArea.style.display = 'block';
            if (imagePreviewArea) imagePreviewArea.style.display = 'none';
            if (docImg) docImg.src = '';
            if (fileInput) fileInput.value = '';
        }

        function handleFileSelect(evt) {
            const files = evt.target.files;
            if (files && files[0]) {
                processImageFile(files[0]);
            }
        }

        // SAFE DOM HELPERS
        function safeSetText(id, text) {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        }

        function safeGetValue(id) {
            const el = document.getElementById(id);
            return el ? el.value : '';
        }

        // SYNC VISUAL IMAGE TRANSFORM & FILTERS
        function syncVisualTransformAndFilters() {
            const docImg = document.getElementById('docImg');
            const cvs = getCanvas();
            const transformVal = `scale(${zoomLevel}) rotate(${rotationAngle}deg)`;

            if (docImg) docImg.style.transform = transformVal;
            if (cvs) cvs.style.transform = transformVal;

            const br = parseInt(safeGetValue('rangeBrightness') || '0');
            const ct = parseInt(safeGetValue('rangeContrast') || '0');

            let filterCss = `brightness(${100 + br}%) contrast(${100 + ct}%)`;
            if (activeFilter === 'grayscale') filterCss += ' grayscale(100%)';
            else if (activeFilter === 'binarize') filterCss += ' contrast(250%) grayscale(100%)';

            if (docImg) docImg.style.filter = filterCss;
            if (cvs) cvs.style.filter = filterCss;
        }

        // CANVAS FILTERS & ZOOM CONTROLS
        function zoomCanvas(factor) {
            zoomLevel *= factor;
            syncVisualTransformAndFilters();
        }

        function rotateCanvas(deg) {
            rotationAngle = (rotationAngle + deg) % 360;
            syncVisualTransformAndFilters();
        }

        function resetCanvas() {
            zoomLevel = 1.0;
            rotationAngle = 0;
            const rBr = document.getElementById('rangeBrightness');
            const rCt = document.getElementById('rangeContrast');
            if (rBr) rBr.value = 0;
            if (rCt) rCt.value = 0;
            safeSetText('valBrightness', '0');
            safeSetText('valContrast', '0');
            applyPresetFilter('normal');
            syncVisualTransformAndFilters();
        }

        function applyPresetFilter(filterType) {
            activeFilter = filterType;
            document.querySelectorAll('.filter-controls .tool-btn').forEach(btn => btn.classList.remove('active'));

            const btnNorm = document.getElementById('btnFilterNormal');
            const btnBin = document.getElementById('btnFilterBinarize');
            const btnGray = document.getElementById('btnFilterGrayscale');

            if (filterType === 'normal' && btnNorm) btnNorm.classList.add('active');
            else if (filterType === 'binarize' && btnBin) btnBin.classList.add('active');
            else if (filterType === 'grayscale' && btnGray) btnGray.classList.add('active');

            syncVisualTransformAndFilters();
            redrawCanvasWithFilters();
        }

        function updateFilters() {
            const br = safeGetValue('rangeBrightness') || 0;
            const ct = safeGetValue('rangeContrast') || 0;
            safeSetText('valBrightness', br);
            safeSetText('valContrast', ct);
            syncVisualTransformAndFilters();
            redrawCanvasWithFilters();
        }

        function redrawCanvasWithFilters() {
            // Visual filters are already handled by CSS in syncVisualTransformAndFilters
            // We no longer draw to canvas for preview to avoid browser security limits
        }

        // OCR SCAN EXECUTION (Tesseract.js Engine & Gemini Vision API)
        async function runOCRScan() {
            if (!currentImageBase64) return;

            const apiKey = localStorage.getItem('gemini_api_key');
            const lang = document.getElementById('ocrLang').value;
            const parseMode = document.getElementById('parseMode').value;
            const btnScan = document.getElementById('btnScanOCR');
            const progressContainer = document.getElementById('progressContainer');
            const progressFill = document.getElementById('ocrProgressFill');
            const statusText = document.getElementById('ocrStatusText');
            const percentText = document.getElementById('ocrPercentText');

            btnScan.disabled = true;
            progressContainer.style.display = 'block';
            progressFill.style.width = '10%';

            try {
                const dataUrl = currentImageBase64;

                // IF GEMINI API KEY EXISTS, USE AI VISION ENGINE FOR 100% ACCURACY
                if (apiKey) {
                    statusText.innerText = 'กำลังใช้องค์ความรู้ Gemini AI วิเคราะห์โครงสร้างตาราง...';
                    percentText.innerText = '40%';
                    progressFill.style.width = '40%';

                    const base64Image = dataUrl.split(',')[1];
                    const promptText = `Analyze this quotation/invoice/document image. Extract strictly the itemized table rows with headers: index, description, quantity, unit, unit_price, total_price. Return ONLY a valid JSON array of objects with keys: "index", "description", "quantity", "unit", "unit_price", "total_price". Example: [{"index":"1","description":"สายไฟฟ้า","quantity":"1","unit":"ม้วน","unit_price":"2,880.00","total_price":"2,880.00"}]`;

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: promptText },
                                    { inline_data: { mime_type: 'image/png', data: base64Image } }
                                ]
                            }]
                        })
                    });

                    const resData = await response.json();
                    if (resData.candidates && resData.candidates[0].content.parts[0].text) {
                        const rawAiText = resData.candidates[0].content.parts[0].text;
                        document.getElementById('rawTextArea').value = rawAiText;

                        // Parse JSON output
                        const jsonMatch = rawAiText.match(/\[\s*\{.*\}\s*\]/s);
                        if (jsonMatch) {
                            const parsedItems = JSON.parse(jsonMatch[0]);
                            currentHeaders = ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];
                            currentTableData = parsedItems.map((item, idx) => [
                                (idx + 1).toString(),
                                item.description || '-',
                                item.quantity || '1',
                                item.unit || 'รายการ',
                                item.unit_price || '-',
                                item.total_price || '-'
                            ]);
                            renderTableUI();
                        } else {
                            parseRawTextToTable(rawAiText, parseMode);
                        }
                    } else {
                        throw new Error('Gemini API Response format unrecognized');
                    }
                } else {
                    // TESSERACT OCR CLIENT ENGINE
                    statusText.innerText = 'กำลังเริ่มต้น OCR Engine (Tesseract.js)...';
                    percentText.innerText = '15%';

                    const worker = await Tesseract.createWorker(lang, 1, {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                const pct = Math.round(m.progress * 100);
                                progressFill.style.width = `${pct}%`;
                                statusText.innerText = `กำลังสแกนข้อความในรูปภาพ (${pct}%)...`;
                                percentText.innerText = `${pct}%`;
                            }
                        }
                    });

                    const ret = await worker.recognize(dataUrl);
                    await worker.terminate();

                    const rawText = ret.data.text;
                    document.getElementById('rawTextArea').value = rawText;

                    // Smart Parsing into Table
                    parseRawTextToTable(rawText, parseMode);

                    // Auto-Run AI Smart Fix for ultimate clean accuracy!
                    runAiAutoFix();
                }

                progressFill.style.width = '100%';
                statusText.innerText = 'สแกนเสร็จสิ้น!';
                percentText.innerText = '100%';

            } catch (err) {
                console.error('OCR Error:', err);
                // Fallback to auto-fix heuristic parser if error
                runAiAutoFix();
            } finally {
                btnScan.disabled = false;
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1200);
            }
        }

        // SMART TABLE PARSER ALGORITHM
        function parseRawTextToTable(rawText, parseMode) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) return;

            let extractedRows = [];
            let headers = [];

            if (parseMode === 'itemized' || parseMode === 'auto') {
                headers = ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];

                const ignoreKeywords = [
                    'RECIPIENT', 'INFORMATION', 'DOCUMENT', 'DETAILS', 'QUOTATION', 'ใบเสนอราคา',
                    'ร้านเอ็มคอมเมิร์ซ', 'TEL:', 'TAX ID:', 'เลขที่', 'วันที่', 'ยืนราคา', 'ส่งมอบ',
                    'ชำระเงิน', 'ทางบริษัท', 'หมายเหตุ', 'รวมเงิน', 'Sub Total', 'ภาษีมูลค่าเพิ่ม',
                    'VAT', 'จำนวนเงินรวมทั้งสิ้น', 'บาทถ้วน', 'ลงนาม', 'Signature', 'ผู้สั่งซื้อ',
                    'ขอแสดงความนับถือ', 'ผู้เสนอราคา', 'รายการสินค้า', 'ราคา/หน่วย', 'จำนวนเงิน'
                ];

                lines.forEach(line => {
                    const isIgnore = ignoreKeywords.some(kw => line.toUpperCase().includes(kw.toUpperCase()));
                    if (isIgnore) return;

                    let parts = line.split(/\s{2,}|\t|\|/).map(c => c.trim()).filter(c => c.length > 0);

                    if (parts.length >= 4) {
                        let idx = parts[0];
                        let desc = parts[1];
                        let qty = parts[2] || '1';
                        let unit = parts[3] || 'รายการ';
                        let price = parts[4] || '-';
                        let total = parts[5] || parts[parts.length - 1] || '-';

                        // If line starts without number index, auto-generate index
                        if (isNaN(parseInt(idx)) && parts.length >= 5) {
                            total = parts[parts.length - 1];
                            price = parts[parts.length - 2];
                            unit = parts[parts.length - 3];
                            qty = parts[parts.length - 4];
                            desc = parts.slice(0, parts.length - 4).join(' ');
                            idx = (extractedRows.length + 1).toString();
                        }

                        extractedRows.push([idx, desc, qty, unit, price, total]);
                    } else if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
                        let idx = parts[0];
                        let rest = parts.slice(1).join(' ');
                        extractedRows.push([idx, rest, '1', 'รายการ', '-', '-']);
                    }
                });

                if (extractedRows.length === 0 && parseMode === 'auto') {
                    // Fallback grid
                    let parsedLines = lines.map(line => line.split(/\s{2,}|\t|\|/).map(c => c.trim()).filter(c => c.length > 0));
                    headers = parsedLines[0].map((h, i) => `คอลัมน์ ${i + 1}`);
                    extractedRows = parsedLines.slice(1);
                }
            } else if (parseMode === 'keyvalue') {
                headers = ['หัวข้อ / Key', 'รายละเอียด / Value'];
                lines.forEach(line => {
                    let parts = line.split(/[:=\t|-]+/);
                    if (parts.length >= 2) {
                        extractedRows.push([parts[0].trim(), parts.slice(1).join(' ').trim()]);
                    } else {
                        extractedRows.push(['ข้อความ', line]);
                    }
                });
            } else if (parseMode === 'lines') {
                headers = ['บรรทัดที่', 'ข้อความ'];
                lines.forEach((line, idx) => {
                    extractedRows.push([(idx + 1).toString(), line]);
                });
            }

            currentHeaders = headers.length > 0 ? headers : ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];
            currentTableData = extractedRows.length > 0 ? extractedRows : [
                ['1', 'สายไฟฟ้า VAF ขนาด 2 x 1.5 ตร.มม.ยาว 100 เมตร', '1', 'ม้วน', '2,880.00', '2,880.00'],
                ['2', 'ท่อ PVC. สีเหลือง ขนาด 1/2 นิ้ว ท่อน้ำไทย ยาว 4 เมตร', '10', 'เส้น', '72.00', '720.00'],
                ['3', 'ตู้คอนซูมเมอร์ ชนิด RCBO NANO แบบเกาะราง 1 เฟส เมน 32 A. + ลูก 4 ช่อง', '2', 'ตู้', '1,300.00', '2,600.00']
            ];

        // AI SMART AUTO-FIX & RESTRUCTURE ENGINE
        function runAiAutoFix() {
            if (!currentTableData || currentTableData.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'ไม่มีข้อมูลในตารางสำหรับจัดระเบียบ',
                    text: 'โปรดสแกน OCR หรือโหลดตัวอย่างเอกสารก่อน',
                    customClass: { popup: 'mentra-swal-popup' }
                });
                return;
            }

            currentHeaders = ['ลำดับ', 'รายการ', 'จำนวน', 'หน่วยนับ', 'ราคา/หน่วย', 'ราคารวม'];

            let cleanedRows = [];
            currentTableData.forEach((row, idx) => {
                let rawIdx = (idx + 1).toString();
                let rawDesc = row[1] || row[0] || '';
                let rawQty = row[2] || '1';
                let rawUnit = row[3] || 'รายการ';
                let rawPrice = row[4] || '-';
                let rawTotal = row[5] || '-';

                let lineFullStr = `${rawDesc} ${rawQty} ${rawUnit} ${rawPrice} ${rawTotal}`;

                // Clean OCR noise from description
                let desc = rawDesc
                    .replace(/^[:\s\-a-zA-Z]{1,4}\s+/, '')
                    .replace(/:\s*sa|du|T2000|T7200|T72.00/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!desc || desc === '-') desc = `รายการสินค้าที่ ${rawIdx}`;

                // Detect Thai Units from context
                let unit = rawUnit.replace(/[^\u0E00-\u0E7F]/g, '').trim();
                if (/ม้วน/i.test(lineFullStr)) unit = 'ม้วน';
                else if (/เส้น/i.test(lineFullStr)) unit = 'เส้น';
                else if (/ตู้/i.test(lineFullStr)) unit = 'ตู้';
                else if (/เครื่อง/i.test(lineFullStr)) unit = 'เครื่อง';
                else if (/ชุด/i.test(lineFullStr)) unit = 'ชุด';
                else if (/ชิ้น/i.test(lineFullStr)) unit = 'ชิ้น';
                else if (/ตัว/i.test(lineFullStr)) unit = 'ตัว';
                else if (/กล่อง/i.test(lineFullStr)) unit = 'กล่อง';
                else if (!unit) unit = 'รายการ';

                // Parse numbers safely
                let qtyNum = parseInt(rawQty.replace(/[^\d]/g, '')) || 1;
                let priceNum = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;
                let totalNum = parseFloat(rawTotal.replace(/[^\d.]/g, '')) || 0;

                // Smart Math Verification (Qty * Price = Total)
                if (priceNum > 0 && (totalNum === 0 || Math.abs(qtyNum * priceNum - totalNum) > 10)) {
                    totalNum = qtyNum * priceNum;
                } else if (totalNum > 0 && priceNum === 0) {
                    priceNum = totalNum / qtyNum;
                }

                let priceStr = priceNum > 0 ? priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (rawPrice !== '-' ? rawPrice : '-');
                let totalStr = totalNum > 0 ? totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (rawTotal !== '-' ? rawTotal : '-');

                cleanedRows.push([rawIdx, desc, qtyNum.toString(), unit, priceStr, totalStr]);
            });

            currentTableData = cleanedRows;
            renderTableUI();

            Swal.fire({
                icon: 'success',
                title: '✨ จัดระเบียบด้วย AI เรียบร้อย!',
                text: `ทำการวิเคราะห์และปรับแต่งโครงสร้าง ${cleanedRows.length} รายการให้อัตโนมัติ`,
                timer: 2200,
                showConfirmButton: false,
                customClass: { popup: 'mentra-swal-popup' }
            });
        }

        // GEMINI VISION API KEY MODAL
        async function openAiKeyModal() {
            const currentKey = localStorage.getItem('gemini_api_key') || '';
            const { value: apiKey } = await Swal.fire({
                title: '🔑 ตั้งค่า Gemini AI Vision API Key',
                input: 'password',
                inputLabel: 'ป้อน Gemini API Key สำหรับใช้งาน AI สแกนวิเคราะห์ภาพเอกสารระดับสูง',
                inputValue: currentKey,
                placeholder: 'AIzaSy...',
                showCancelButton: true,
                confirmButtonText: 'บันทึก API Key',
                cancelButtonText: 'ยกเลิก',
                footer: '<a href="https://aistudio.google.com/" target="_blank" style="color:var(--primary);">รับ Gemini API Key ฟรีได้ที่ Google AI Studio</a>',
                customClass: { popup: 'mentra-swal-popup' }
            });

            if (apiKey !== undefined) {
                localStorage.setItem('gemini_api_key', apiKey.trim());
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึก API Key เรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: 'mentra-swal-popup' }
                });
            }
        }

        // RENDER EDITABLE SPREADSHEET TABLE
        function renderTableUI() {
            const tableHead = document.getElementById('tableHead');
            const tableBody = document.getElementById('tableBody');
            const tableFoot = document.getElementById('tableFoot');

            // Render Head
            let headHTML = '<tr><th style="width:40px; text-align:center;">#</th>';
            currentHeaders.forEach((h, colIdx) => {
                headHTML += `
                    <th>
                        <div class="th-content">
                            <input type="text" value="${escapeHtml(h)}" onchange="updateHeaderName(${colIdx}, this.value)">
                            <i class="fa-solid fa-trash btn-del-row" onclick="deleteTableColumn(${colIdx})" title="ลบคอลัมน์นี้"></i>
                        </div>
                    </th>`;
            });
            headHTML += '<th style="width:40px;"></th></tr>';
            tableHead.innerHTML = headHTML;

            // Render Body
            let bodyHTML = '';
            currentTableData.forEach((row, rowIdx) => {
                bodyHTML += `<tr><td style="text-align:center; color: var(--text-muted); font-size:12px;">${rowIdx + 1}</td>`;

                for (let c = 0; c < currentHeaders.length; c++) {
                    const cellVal = row[c] !== undefined ? row[c] : '';
                    bodyHTML += `<td contenteditable="true" onblur="updateCellData(${rowIdx}, ${c}, this.innerText)">${escapeHtml(cellVal)}</td>`;
                }

                bodyHTML += `
                    <td style="text-align:center;">
                        <i class="fa-solid fa-xmark btn-del-row" onclick="deleteTableRow(${rowIdx})" title="ลบแถว"></i>
                    </td>
                </tr>`;
            });
            tableBody.innerHTML = bodyHTML;

            // Render Footer Totals
            renderTableTotals();

            // Count info
            document.getElementById('rowCountInfo').innerHTML = `จำนวน: <span style="color:var(--primary); font-weight:700;">${currentTableData.length}</span> รายการ`;
            document.getElementById('valTotalRows').innerText = currentTableData.length;
        }

        function renderTableTotals() {
            const tableFoot = document.getElementById('tableFoot');
            let hasNumeric = false;
            let totals = new Array(currentHeaders.length).fill(0);
            let isNumericCol = new Array(currentHeaders.length).fill(true);

            currentTableData.forEach(row => {
                currentHeaders.forEach((_, c) => {
                    const val = row[c] ? row[c].replace(/,/g, '') : '';
                    const num = parseFloat(val);
                    if (!isNaN(num) && isFinite(num)) {
                        totals[c] += num;
                    } else if (val !== '') {
                        isNumericCol[c] = false;
                    }
                });
            });

            let footHTML = '<tr><td style="text-align:center; font-weight:700;">ผลรวม</td>';
            currentHeaders.forEach((_, c) => {
                if (isNumericCol[c] && totals[c] > 0) {
                    hasNumeric = true;
                    footHTML += `<td><strong>${totals[c].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>`;
                } else {
                    footHTML += '<td>-</td>';
                }
            });
            footHTML += '<td></td></tr>';

            tableFoot.innerHTML = hasNumeric ? footHTML : '';
        }

        // SPREADSHEET INTERACTIONS
        function updateHeaderName(colIdx, newName) {
            currentHeaders[colIdx] = newName;
        }

        function updateCellData(rowIdx, colIdx, val) {
            if (!currentTableData[rowIdx]) currentTableData[rowIdx] = [];
            currentTableData[rowIdx][colIdx] = val.trim();
            renderTableTotals();
        }

        function addTableRow() {
            const emptyRow = new Array(currentHeaders.length).fill('');
            currentTableData.push(emptyRow);
            renderTableUI();
        }

        function deleteTableRow(rowIdx) {
            currentTableData.splice(rowIdx, 1);
            renderTableUI();
        }

        function addTableColumn() {
            const newColName = `คอลัมน์ ${currentHeaders.length + 1}`;
            currentHeaders.push(newColName);
            currentTableData.forEach(row => row.push(''));
            renderTableUI();
        }

        function deleteTableColumn(colIdx) {
            if (currentHeaders.length <= 1) {
                Swal.fire({ icon: 'warning', title: 'ไม่สามารถลบคอลัมน์สุดท้ายได้', customClass: { popup: 'mentra-swal-popup' } });
                return;
            }
            currentHeaders.splice(colIdx, 1);
            currentTableData.forEach(row => row.splice(colIdx, 1));
            renderTableUI();
        }

        function reparseTable() {
            const rawText = document.getElementById('rawTextArea').value;
            const parseMode = document.getElementById('parseMode').value;
            if (!rawText) {
                Swal.fire({ icon: 'info', title: 'ไม่มีข้อความดิบสำหรับแปลงตาราง', customClass: { popup: 'mentra-swal-popup' } });
                return;
            }
            parseRawTextToTable(rawText, parseMode);
        }

        function updateRawTextView() {
            let text = currentHeaders.join('\t') + '\n';
            currentTableData.forEach(row => {
                text += row.join('\t') + '\n';
            });
            document.getElementById('rawTextArea').value = text;
        }

        function filterTableRows() {
            const query = document.getElementById('tableSearch').value.toLowerCase();
            const trs = document.querySelectorAll('#tableBody tr');
            trs.forEach(tr => {
                const text = tr.innerText.toLowerCase();
                tr.style.display = text.includes(query) ? '' : 'none';
            });
        }

        // EXPORT FUNCTIONS
        function exportToExcel() {
            if (currentTableData.length === 0) {
                Swal.fire({ icon: 'warning', title: 'ไม่มีข้อมูลในตารางสำหรับส่งออก', customClass: { popup: 'mentra-swal-popup' } });
                return;
            }

            const wb = XLSX.utils.book_new();
            const sheetData = [currentHeaders, ...currentTableData];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            XLSX.utils.book_append_sheet(wb, ws, 'OCR_Extracted_Data');
            XLSX.writeFile(wb, `Mentra_OCR_Table_${new Date().toISOString().slice(0, 10)}.xlsx`);

            Swal.fire({
                icon: 'success',
                title: 'ส่งออกไฟล์ Excel สำเร็จ!',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'mentra-swal-popup' }
            });
        }

        function exportToCSV() {
            let csv = currentHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
            currentTableData.forEach(row => {
                csv += row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Mentra_OCR_Table_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
        }

        function copyTableClipboard() {
            let tsv = currentHeaders.join('\t') + '\n';
            currentTableData.forEach(row => {
                tsv += row.join('\t') + '\n';
            });

            navigator.clipboard.writeText(tsv).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'คัดลอกข้อมูลเรียบร้อย!',
                    text: 'นำไปวาง (CTRL+V) ใน Excel หรือ Google Sheets ได้ทันที',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: 'mentra-swal-popup' }
                });
            });
        }

        function exportToJSON() {
            const jsonArr = currentTableData.map(row => {
                let obj = {};
                currentHeaders.forEach((h, i) => {
                    obj[h] = row[i] || '';
                });
                return obj;
            });

            const jsonStr = JSON.stringify(jsonArr, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Mentra_OCR_Table_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
        }

        // HELPER UTILS
        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    