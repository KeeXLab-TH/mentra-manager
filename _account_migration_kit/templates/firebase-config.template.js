// ==============================================================================
// Mentra Manager — Firebase & Cloud Storage Configuration (TEMPLATE)
// ==============================================================================
// วิธีใช้:
// 1. Copy ไฟล์นี้เป็น "firebase-config.js" ใน assets/js/
// 2. แทนค่าด้านล่างด้วยค่าจาก Firebase Console ของคุณ
// 3. ❌ อย่า commit ไฟล์ firebase-config.js จริงขึ้น Git สาธารณะ
// ==============================================================================

export const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// บัญชีอีเมลผูกการใช้งาน Firebase Platform Project
export const FIREBASE_ACCOUNT_EMAIL = 'your-email@example.com';

// ==============================================================================
// Google Apps Script — สำหรับอัพโหลดไฟล์ไปยัง Google Drive
// วาง URL จาก Google Apps Script Web App Deployment ที่นี่
// ==============================================================================
export const GAS_URL = 'https://script.google.com/macros/s/YOUR_GAS_SCRIPT_ID/exec';

// บัญชีอีเมล Google Drive ที่ใช้เก็บข้อมูลและสร้างโฟลเดอร์โครงการ
export const DRIVE_ACCOUNT_EMAIL = 'your-drive-email@example.com';

// ==============================================================================
// Google Drive Root Folder ID — โฟลเดอร์หลักที่จะสร้าง sub-folder แยกตามโครงการ
// ==============================================================================
export const DRIVE_ROOT_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
