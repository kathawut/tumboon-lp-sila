# tumboon-lp-sila

LINE Bot ที่รับรูป Slip จากลูกค้า อ่านข้อมูลด้วย EasySlip API แล้วบันทึกลง Supabase โดย deploy บน Vercel ด้วย Next.js

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Deploy**: Vercel (Serverless)
- **LINE SDK**: `@line/bot-sdk`
- **Slip OCR**: EasySlip API
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

## Setup

### 1. Clone และติดตั้ง dependencies

```bash
git clone https://github.com/kathawut/tumboon-lp-sila.git
cd tumboon-lp-sila
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.local.example .env.local
```

แก้ไขค่าใน `.env.local`:

```
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
EASYSLIP_API_KEY=your_easyslip_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. สร้างตาราง Supabase

รัน SQL migration ใน Supabase SQL Editor ตามลำดับ:

```sql
-- ตาราง slips หลัก
create table slips (
  id uuid default gen_random_uuid() primary key,
  line_user_id text not null,
  message_id text not null unique,
  amount numeric(10,2) not null,
  sender_name text,
  sender_bank text,
  receiver_name text,
  receiver_bank text,
  pay_date timestamptz,
  raw_response jsonb,
  created_at timestamptz default now()
);
```

จากนั้นรัน `supabase/migrations/003_full_features.sql` เพื่อสร้าง columns และตารางเพิ่มเติม

### 4. สร้าง Supabase Storage Bucket

> ⚠️ **สำคัญ**: ต้องสร้าง Storage bucket ด้วยตนเองผ่าน Supabase Dashboard เนื่องจาก SQL migration ไม่สามารถสร้าง Storage bucket ได้

1. เข้าไปที่ Supabase Dashboard > **Storage**
2. คลิก **New bucket**
3. ตั้งชื่อ: `slip-images`
4. เลือก **Private** (ไม่ public)
5. คลิก **Create bucket**

### 5. Deploy บน Vercel

```bash
npx vercel
```

หรือ connect repository กับ Vercel dashboard แล้วตั้งค่า Environment Variables ใน Project Settings > Environment Variables

**Environment Variables ที่ต้องใส่ใน Vercel Dashboard:**

| Variable | Description |
|----------|-------------|
| `LINE_CHANNEL_SECRET` | LINE Channel Secret จาก LINE Developers Console |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `EASYSLIP_API_KEY` | API Key จาก EasySlip |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (สำหรับ Dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |

### 6. ตั้งค่า LINE Webhook URL

ใน LINE Developers Console > Messaging API > Webhook URL:

```
https://<your-vercel-domain>/api/webhook
```

เปิดใช้งาน "Use webhook"

## Features

- **รับ Slip รูปภาพ**: ตรวจสอบ slip ด้วย EasySlip API
- **ตรวจสอบบัญชีปลายทาง**: เช็คว่าโอนเข้าบัญชีที่กำหนดถูกต้อง
- **ตรวจสอบ Duplicate**: ป้องกัน slip ซ้ำด้วย transRef
- **สะสมยอดหลายครั้ง**: ลูกค้าโอนหลายครั้งได้จนครบยอดที่กำหนด
- **ยืนยันชื่อ**: ลูกค้ายืนยัน/แก้ไขชื่อสำหรับสลักหินอ่อน
- **เก็บรูป Slip**: อัพโหลดรูป slip ลง Supabase Storage
- **Dashboard**: หน้าแสดงรายการ slip ทั้งหมดที่ `/dashboard`

## File Structure

```
tumboon-lp-sila/
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts        # LINE Webhook endpoint
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard หน้ารายการ slip
│   │   └── SlipTable.tsx       # ตารางแสดง slip
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Simple status page
├── lib/
│   ├── line.ts                 # LINE SDK client & helpers
│   ├── slip.ts                 # EasySlip API integration
│   └── supabase.ts             # Supabase client & helpers
├── supabase/
│   └── migrations/
│       └── 003_full_features.sql  # DB migration
├── types/
│   └── slip.ts                 # TypeScript types
├── .env.local.example
├── .gitignore
├── next.config.ts
├── package.json
└── README.md
```

## Development

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อดู status page
เปิด [http://localhost:3000/dashboard](http://localhost:3000/dashboard) เพื่อดู dashboard

