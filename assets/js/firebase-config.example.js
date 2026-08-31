// ==============================================================================
// Mentra Manager — Firebase & Cloud Storage Configuration (EXAMPLE TEMPLATE)
// ==============================================================================
// วิธีใช้:
// 1. Copy ไฟล์นี้เป็น "firebase-config.js" (ในโฟลเดอร์เดียวกัน)
// 2. แทนค่าด้านล่างด้วยค่าจาก Firebase Console ของคุณ
// 3. Firebase Console → Project Settings → Your Apps → SDK setup and configuration
// 4. ❌ อย่า commit firebase-config.js — ไฟล์นี้อยู่ใน .gitignore แล้ว
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
// วิธีหา: เปิดโฟลเดอร์ใน Google Drive แล้วดู URL: drive.google.com/drive/folders/{FOLDER_ID}
// ==============================================================================
export const DRIVE_ROOT_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
