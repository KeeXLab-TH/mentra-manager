# 📦 Mentra Manager — คู่มือและชุดเครื่องมือสำหรับการย้ายบัญชี (Account Migration Kit)

โฟลเดอร์นี้รวบรวมไฟล์ตัวอย่าง โครงสร้างฐานข้อมูล โค้ด Google Apps Script และคู่มือขั้นตอนการย้ายบัญชีระบบ Mentra Manager ไว้อย่างครบถ้วน เพื่อให้คุณสามารถสลับหรือย้ายบัญชี Firebase และ Google Drive ได้อย่างง่ายดาย

---

## 📁 โครงสร้างในโฟลเดอร์นี้

```
_account_migration_kit/
├── README.md                           <-- (ไฟล์นี้) คู่มือการย้ายบัญชีฉบับสมบูรณ์
├── google_apps_script/
│   ├── Code.gs                         <-- โค้ด Google Apps Script เชื่อม Google Drive
│   └── appsscript.json                 <-- ไฟล์สิทธิ์ (Manifest) ของ GAS
└── templates/
    ├── firebase-config.template.js     <-- แม่แบบตั้งค่าเชื่อมต่อ Firebase + GAS
    └── sample_backup.json              <-- ตัวอย่างรูปแบบไฟล์ Backup ฐานข้อมูล
```

---

## 🏗️ 1. สถาปัตยกรรมและการเก็บข้อมูลของระบบ Mentra

ระบบ Mentra Manager แบ่งการเก็บข้อมูลออกเป็น **2 ส่วนหลัก**:

### 1.1 Firestore Database (ฐานข้อมูลระบบ)
เก็บข้อมูลสมาชิก สิทธิ์การเข้าถึง และ Log ต่างๆ:

| Collection Name | หน้าที่ / ข้อมูลที่เก็บ | คีย์หลัก (Document ID) |
|---|---|---|
| `users` | ข้อมูลโปรไฟล์ผู้ใช้, อีเมล, ชื่อ-นามสกุล, สิทธิ์ (`admin`/`user`), สถานะอนุมัติ (`approved`/`pending`/`rejected`), หน้าที่อนุญาต (`allowedPages`) | `UID` จาก Firebase Auth |
| `usernames` | แมปปิ้งชื่อผู้ใช้ (Username) ไปยัง UID และข้อมูลสิทธิ์ เพื่อให้ล็อกอินด้วย Username ได้ | `username` (เช่น `admin`, `user01`) |
| `activity_logs` | บันทึกประวัติการทำงาน (System Audit Logs) | Auto-generated ID |

#### 🔐 ตัวอย่างโครงสร้างข้อมูลผู้ใช้ (`users` collection):
```json
{
  "uid": "AbCdEf123456...",
  "username": "admin",
  "email": "admin@mentra.com",
  "displayName": "ผู้ดูแลระบบ",
  "firstName": "Admin",
  "lastName": "Mentra",
  "role": "admin",
  "status": "approved",
  "allowedPages": {
    "dashboard.html": true,
    "materials_purchasing.html": true,
    "quotation.html": true,
    "products.html": true,
    "equipments.html": true,
    "external_training.html": true,
    "calendar.html": true,
    "crm.html": true,
    "register_training.html": true,
    "ocr_table.html": true,
    "certificate_template.html": true,
    "internship_journal.html": true,
    "business_card.html": true
  },
  "createdAt": "2026-09-01T00:00:00.000Z",
  "lastActiveAt": "2026-09-01T12:00:00.000Z"
}
```

---

### 1.2 Google Drive Cloud (ไฟล์เอกสาร & รูปภาพ)
ไฟล์แนบ รูปภาพสินค้า และเอกสาร PDF จะถูกส่งไปเก็บไว้ที่ Google Drive ผ่าน **Google Apps Script Web App**:

- **Root Folder**: โฟลเดอร์หลักที่ระบุใน `DRIVE_ROOT_FOLDER_ID`
- **Sub-folders**: สร้างอัตโนมัติแยกตามโมดูล เช่น
  - `📁 จัดซื้อจัดจ้าง/`
  - `📁 ใบเสนอราคา/`
  - `📁 รูปภาพสินค้า/`
  - `📁 เกียรติบัตร/`

---

## 🚀 2. ขั้นตอนการย้ายไปยังบัญชีใหม่ (Step-by-Step Migration Guide)

### 📌 ขั้นตอนที่ 1: สำรองข้อมูลจากบัญชีเดิม (Backup)
1. เปิดหน้า **Admin Console** (`pages/admin/console_admin.html`)
2. ที่แถบ **"ฐานข้อมูล:"** ให้กดปุ่ม **"📥 Backup ข้อมูล"**
3. ระบบจะดาวน์โหลดไฟล์ `.json` เช่น `mentra_backup_2026-09-01T13-30-00.json` เก็บไว้ในเครื่องคอมพิวเตอร์ของคุณ

---

### 📌 ขั้นตอนที่ 2: เตรียม Firebase Project ใหม่
1. ไปที่ [Firebase Console](https://console.firebase.google.com/) ล็อกอินด้วยบัญชี Google ใหม่
2. กด **"Add project"** ตั้งชื่อ Project เช่น `mentra-production`
3. เปิดใช้งาน **Authentication**:
   - ไปที่ **Authentication** ➔ **Sign-in method**
   - เปิดใช้งาน **Email/Password**
4. เปิดใช้งาน **Cloud Firestore**:
   - ไปที่ **Firestore Database** ➔ กด **Create database**
   - เลือก Location (เช่น `asia-southeast1` สิงคโปร์) ➔ เลือก **Start in production mode** (หรือ test mode)
5. ไปที่ **Project Settings (รูปเฟือง)** ➔ ส่วน **"Your apps"** ➔ กดไอคอนเว็บ `</>` เพื่อลงทะเบียนเว็บแอป
6. คัดลอกโค้ด `firebaseConfig`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-project.firebaseapp.com",
  projectId: "my-project",
  storageBucket: "my-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

### 📌 ขั้นตอนที่ 3: เตรียม Google Apps Script ใน Google Drive ใหม่
1. เปิด Google Drive ของบัญชีใหม่ สร้างโฟลเดอร์หลักสำหรับเก็บไฟล์ระบบ แล้วคัดลอก **Folder ID** จาก URL:
   `https://drive.google.com/drive/folders/`**`1a0B6l56PAxxxxxxxx`**
2. ไปที่ [Google Apps Script](https://script.google.com/) กด **"New project"**
3. คัดลอกโค้ดจากไฟล์ `_account_migration_kit/google_apps_script/Code.gs` ไปวางแทนโค้ดเดิม
4. ไปที่ **Project Settings (⚙️)** ➔ ติ๊กเลือก **"Show 'appsscript.json' manifest file in editor"**
5. เปิดไฟล์ `appsscript.json` แล้วคัดลอกเนื้อหาจาก `_account_migration_kit/google_apps_script/appsscript.json` ไปวาง
6. กด **▶ Run** ฟังก์ชัน `testAuth` เพื่อกด Allow อนุญาตสิทธิ์
7. กด **Deploy** ➔ **New deployment** ➔ เลือกชนิด **Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
8. คัดลอก **Web App URL** ที่ได้ (เช่น `https://script.google.com/macros/s/.../exec`)

---

### 📌 ขั้นตอนที่ 4: เชื่อมต่อและกู้คืนข้อมูล (Switch & Restore)

คุณสามารถเลือกทำได้ **2 วิธี**:

#### วิธีที่ A: ผ่านหน้าเว็บ Admin Console (ไม่ต้องแก้โค้ด)
1. เปิดหน้า `pages/admin/console_admin.html`
2. กดปุ่ม **"🔄 สลับบัญชี Firebase"**
3. วางโค้ด `firebaseConfig` ที่คัดลอกมาลงในช่อง **"📋 วาง Firebase Config"** (ระบบจะกรอก Project ID และ API Key ให้อัตโนมัติ)
4. ใส่ **GAS Web App URL** จากขั้นตอนที่ 3 แล้วกด **"💾 บันทึกและสลับบัญชี"**
5. หน้าเว็บจะรีโหลดและเชื่อมต่อกับ Firebase ใหม่ทันที
6. กดปุ่ม **"📤 Restore ข้อมูล"** ➔ เลือกไฟล์ Backup `.json` ที่โหลดไว้จากขั้นตอนที่ 1
7. กดยืนยัน ➔ ข้อมูลผู้ใช้และประวัติจะถูกเขียนเข้า Firebase ใหม่ทันที!

#### วิธีที่ B: แก้ไขที่ไฟล์ `assets/js/firebase-config.js`
คัดลอก `_account_migration_kit/templates/firebase-config.template.js` ไปทับ `assets/js/firebase-config.js` แล้วกรอกค่า Project ID, API Key, GAS URL, และ Folder ID ใหม่ให้ครบถ้วน

---

## 🔒 3. ข้อแนะนำด้านความปลอดภัย
1. ❌ **ห้ามอัปโหลดไฟล์ `firebase-config.js` หรือไฟล์ Backup JSON ขึ้น Git สาธารณะ (GitHub Public Repo)**
2. ไฟล์ `assets/js/firebase-config.js` ถูกกำหนดไว้ใน `.gitignore` เรียบร้อยแล้ว
3. เก็บไฟล์ Backup `.json` ไว้ในไดรฟ์ที่ปลอดภัยเสมอ
