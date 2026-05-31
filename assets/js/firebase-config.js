// ==============================================================================
// Mentra Manager — Firebase Configuration
// บริษัท เมนทร้า โซลูชั่น จำกัด
// ==============================================================================
// วิธีใช้: เปลี่ยนค่าด้านล่างด้วยค่าจาก Firebase Console ของคุณ
// Firebase Console → Project Settings → Your Apps → SDK setup and configuration
// ==============================================================================

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDRGKOGn4v7of-AH8HuZTtk8FfI24NHdCU",
    authDomain: "mentra-manager-e039f.firebaseapp.com",
    projectId: "mentra-manager-e039f",
    storageBucket: "mentra-manager-e039f.firebasestorage.app",
    messagingSenderId: "563604754745",
    appId: "1:563604754745:web:ea0892fafb48b74dcf58e8"
};

// ==============================================================================
// Google Apps Script — สำหรับอัพโหลดไฟล์ไปยัง Google Drive
// วาง URL จาก Google Apps Script Web App Deployment ที่นี่
// ==============================================================================
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbxJIaFnBOtQUjoxjkVYiK2OBbGvbMlgeR5FSsO0n0vfYNHHc6pfPIki7CCFTeEh63m5/exec';

// ==============================================================================
// Google Drive Root Folder ID — โฟลเดอร์หลักที่จะสร้าง sub-folder แยกตามโครงการ
// วิธีหา: เปิดโฟลเดอร์ใน Google Drive แล้วดู URL: drive.google.com/drive/folders/{FOLDER_ID}
// ==============================================================================
export const DRIVE_ROOT_FOLDER_ID = '1a0B6l56PAVCZ4v8lzSeIRslq78XSJh8e';
