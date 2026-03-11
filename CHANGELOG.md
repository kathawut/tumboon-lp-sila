# Changelog

การเปลี่ยนแปลงทั้งหมดของโปรเจกต์ tumboon-lp-sila

## 2026-03-09 — Full LINE Bot Enhancement (PR #8)

อัปเกรด LINE Bot จากตัวอ่าน slip ธรรมดาให้เป็นระบบรับทำบุญเต็มรูปแบบ

### ฟีเจอร์ใหม่

- **เก็บรูป Slip** — อัพโหลดรูป slip ลง Supabase Storage bucket `slip-images`
- **สะสมยอดหลายครั้ง** — ลูกค้าโอนหลายครั้งได้จนครบยอด ฿5,100 (configurable จากตาราง `settings`)
- **ยืนยันชื่อสลักหินอ่อน** — ระบบ session state (`user_sessions`) สำหรับยืนยัน/แก้ไขชื่อ
- **ตรวจสอบบัญชีปลายทาง** — เช็คว่าโอนเข้าบัญชีที่กำหนดในตาราง `target_accounts`
- **ป้องกัน Duplicate** — ใช้ `trans_ref` unique index
- **Admin Dashboard** — หน้า `/dashboard` แสดงรายการ slip ทั้งหมด พร้อมตัวกรองวันที่และสถานะ

### DB Schema

- เพิ่มตาราง `user_sessions` — เก็บ state ลูกค้า (เช่น `waiting_name_confirm`)
- เพิ่มตาราง `target_accounts` — บัญชีปลายทางที่อนุญาต
- เพิ่มตาราง `settings` — config ต่างๆ (เช่น `required_amount`)
- เพิ่ม columns ใน `slips`: `trans_ref`, `slip_image_url`, `confirmed_name`, `name_confirmed_at`

### Webhook Flow

```
slip received → amount < required → save + notify remaining
             → amount ≥ required → save + upload + set session → ask name confirmation
text received → session=waiting_name_confirm → update confirmed_name + clear session
```

---

## 2026-03-09 — Fix sender account name (PR #5)

แก้ปัญหาชื่อผู้โอนแสดงเป็น `[object Object]` โดยใช้ EasySlip API structure ที่ถูกต้อง (`account.name.th/en`)

---

## 2026-03-09 — Fix [object Object] display (PR #3)

แก้ bug ชื่อผู้โอน/ผู้รับแสดงเป็น `[object Object]` ใน LINE reply โดยเพิ่ม fallback หลายระดับสำหรับ sender/receiver name

---

## 2026-03-09 — Initial LINE Bot (PR #2)

สร้าง LINE Bot project เริ่มต้น:

- Next.js (App Router) + TypeScript
- LINE Webhook endpoint (`/api/webhook`)
- EasySlip API integration สำหรับอ่าน slip
- Supabase สำหรับเก็บข้อมูล
- Deploy บน Vercel
