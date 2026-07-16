# Mentra Manager - Web Development Pattern & Prompt Guidelines

เอกสารนี้ทำหน้าที่เป็น **Prompt Template และคู่มืออ้างอิง** สำหรับการพัฒนาหรือแก้ไข Web Application "Mentra Manager" ในอนาคต เพื่อให้ AI เข้าใจโครงสร้าง โทนสี และสไตล์การเขียนโค้ดที่โปรเจกต์นี้ใช้อยู่ ป้องกันการหลุดกรอบ (Hallucination) หรือใช้เครื่องมือผิดประเภท

---

## 1. ข้อมูลสถาปัตยกรรมโปรเจกต์ (Project Overview)
- **Tech Stack**: Google Apps Script (GAS) Web App
- **Frontend**: Pure HTML, Vanilla JavaScript, และ Vanilla CSS **(ห้ามใช้ Framework อย่าง React, Vue, หรือ TailwindCSS เด็ดขาด)**
- **Backend/API**: Google Apps Script (ไฟล์ `.gs`) และสื่อสารผ่าน `google.script.run`
- **External Libraries**: SweetAlert2 (สำหรับแจ้งเตือนและ Popup ต่างๆ)

## 2. ระบบดีไซน์และ UI/UX (Design System)
แอปพลิเคชันนี้ใช้ตีม **Enterprise Dashboard UI** เน้นความพรีเมียม ทันสมัย สะอาดตา และมีการใช้ Animation เล็กๆ น้อยๆ (Micro-animations)

### สีหลัก (Colors)
- **Primary (น้ำเงิน)**: `#1A6FBF` (Dark: `#145999`, Glow: `rgba(26, 111, 191, 0.15)`)
- **Secondary (ส้ม)**: `#E07B2F` (Dark: `#c4681f`, Glow: `rgba(224, 123, 47, 0.15)`)
- **Background**: `#f0f4f9` (พื้นหลังแอป), `#ffffff` (พื้นหลังการ์ด)
- **Semantic**: Success (`#10b981`), Warning (`#f59e0b`), Danger (`#ef4444`), Info (`#3b82f6`)

### ตัวอักษร (Typography)
- ฟอนต์หลัก: `Kanit`, `Inter`, และ `Prompt` (โหลดผ่าน Google Fonts)

### กฎการจัดสไตล์ (Styling Rules)
- **ใช้ CSS Variables เสมอ**: การกำหนดสี เงา ความโค้ง (Border Radius) หรือ Transition ต้องเรียกใช้ตัวแปร `:root` ที่มีอยู่แล้ว (เช่น `var(--primary)`, `var(--radius-md)`)
- **ความสมูท (Transitions)**: ใส่ Transition ในสถานะ Hover หรือ Focus เสมอ โดยใช้ `var(--t-fast)`, `var(--t-normal)`
- **ห้ามใช้ Inline Styles**: พยายามเขียน CSS ไว้ในแท็ก `<style>` หรือไฟล์แยก และหลีกเลี่ยงการใช้ `style="..."` ในแท็ก HTML

## 3. มาตรฐานการเขียนโค้ด (Coding Standards)
- **JavaScript**: ใช้ Vanilla JS (ES6+) เท่านั้น
- **DOM Manipulation**: จัดการ DOM ด้วย `document.querySelector` หรือ `getElementById`
- **การแจ้งเตือนผู้ใช้**: ห้ามใช้ `alert()` ธรรมดา ให้ใช้ **SweetAlert2** (`Swal.fire`) เสมอ และต้องกำหนดคลาส `mentra-swal-popup` หรือกำหนดฟอนต์ให้เป็น `Kanit` เสมอ
- **การตั้งชื่อคลาส**: ใช้หลักการที่อ่านเข้าใจง่าย (BEM หรือ Logical format) เช่น `.btn-primary`, `.form-card`, `.nav-item`

---

## 4. 📝 Pattern Prompt (สำหรับ Copy ไปสั่ง AI ในครั้งต่อไป)

เมื่อต้องการเริ่มฟีเจอร์ใหม่ หรือให้ AI ช่วยแก้โค้ด ให้ Copy ข้อความด้านล่างนี้ไปนำหน้าคำสั่งของคุณเสมอ:

```text
[System Context]
คุณคือ AI ผู้เชี่ยวชาญด้าน Web Development ที่กำลังพัฒนาโปรเจกต์ "Mentra Manager" ซึ่งเป็น Google Apps Script (GAS) Web App 

⚠️ กฎข้อบังคับที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. เทคโนโลยี: ใช้เฉพาะ HTML, Vanilla JS (ES6+) และ Vanilla CSS เท่านั้น ห้ามใช้ TailwindCSS, Bootstrap, React หรือ Framework อื่นๆ เด็ดขาด
2. ดีไซน์และ UI: คุมโทน Enterprise Premium 
   - ใช้ CSS Variables หลัก: สีน้ำเงิน (var(--primary): #1A6FBF), สีส้ม (var(--secondary): #E07B2F)
   - ฟอนต์: 'Kanit', 'Inter'
   - ต้องมี Hover effect, Transition (var(--t-normal)) และ Shadow ที่นุ่มนวล
3. การจัดการแจ้งเตือน (Alert): ห้ามใช้ alert() มาตรฐาน ให้เรียกใช้ SweetAlert2 เท่านั้น พร้อมบังคับใช้ฟอนต์ 'Kanit' ใน Popup
4. Backend Integration: หากมีการเชื่อมต่อฐานข้อมูล ให้เขียนฟังก์ชันฝั่ง Client เรียกผ่าน `google.script.run` 

[คำสั่งของคุณ]
ช่วยเขียนฟีเจอร์... (ใส่รายละเอียดที่คุณต้องการให้ AI ทำตรงนี้)
```
