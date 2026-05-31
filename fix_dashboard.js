const fs = require('fs');

let content = fs.readFileSync('dashboard.html', 'utf8');

// Fix FIREBASE_CONFIG block
let brokenConfig = `        let FIREBASE_CONFIG, GAS_URL, DRIVE_ROOT_FOLDER_ID;
        try {
        window.GAS_URL = GAS_URL;`;

let fixedConfig = `        let FIREBASE_CONFIG, GAS_URL, DRIVE_ROOT_FOLDER_ID;
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

        window.GAS_URL = GAS_URL;`;

content = content.replace(brokenConfig, fixedConfig);

// Fix navigateTo
let oldNavRegex = /const titles = \{[\s\S]*?document\.getElementById\('pageSubtitle'\)\.textContent = sub;/m;
let newNav = `const titles = {
                dashboard: ['Dashboard', 'ภาพรวมระบบทั้งหมด'],
                projects: ['โครงการทั้งหมด', 'จัดการโครงการและงบประมาณ'],
                users: ['จัดการผู้ใช้งาน', 'รายชื่อสมาชิกในระบบ'],
                items: ['ราคาทุน / สิ่งของ', 'ราคาทุนสิ่งของตามโครงการ'],
                detail: ['รายละเอียดโครงการ', currentProjectData?.projectName || ''],
                quotation: ['ใบเสนอราคา', 'สร้างและพิมพ์ใบเสนอราคา'],
                training: ['ระบบจัดอบรม', 'ระบบตารางและจัดการอบรมภายนอก']
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
            }`;

content = content.replace(oldNavRegex, newNav);

fs.writeFileSync('dashboard.html', content);
console.log("Fixed dashboard.html!");
