# tumboon-lp-sila

LINE Bot ที่รับรูป Slip จากลูกค้า อ่านข้อมูลด้วย EasySlip API แล้วบันทึกลง Supabase โดย deploy บน Vercel ด้วย Next.js

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Deploy**: Vercel (Serverless)
- **LINE SDK**: `@line/bot-sdk`
- **Slip OCR**: EasySlip API
- **Database**: Supabase (PostgreSQL)

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
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. สร้างตาราง Supabase

รัน SQL ต่อไปนี้ใน Supabase SQL Editor:

```sql
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

### 4. รัน Migration (ป้องกัน Slip ซ้ำ + บัญชีปลายทาง)

รัน SQL จากไฟล์ `supabase/migrations/002_add_target_accounts.sql` ใน Supabase SQL Editor:

```sql
-- เพิ่ม trans_ref column ในตาราง slips
alter table slips add column if not exists trans_ref text;
create unique index if not exists slips_trans_ref_idx on slips(trans_ref) where trans_ref is not null;

-- สร้างตาราง target_accounts
create table if not exists target_accounts (
  id uuid default gen_random_uuid() primary key,
  bank_name text not null,
  account_number text not null unique,
  account_name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### 5. เพิ่มบัญชีปลายทางใน Supabase

เปิด **Supabase Table Editor** → ตาราง `target_accounts` → Insert row:

| Column | ค่าตัวอย่าง |
|--------|-------------|
| `bank_name` | `ธนาคารกสิกรไทย` |
| `account_number` | `0123456789` |
| `account_name` | `นาย สมชาย ใจดี` |
| `is_active` | `true` |

> **หมายเหตุ:** ถ้าตาราง `target_accounts` ไม่มีข้อมูล (ว่าง) ระบบจะยอมรับทุกบัญชีเหมือนเดิม

### 6. Deploy บน Vercel

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |

### 7. ตั้งค่า LINE Webhook URL

ใน LINE Developers Console > Messaging API > Webhook URL:

```
https://<your-vercel-domain>/api/webhook
```

เปิดใช้งาน "Use webhook"

## ฟีเจอร์

### ป้องกัน Slip ซ้ำ

ระบบตรวจสอบ `transRef` (Transaction Reference ID) จาก EasySlip ก่อนบันทึกทุกครั้ง หากพบว่า Slip นั้นถูกบันทึกไปแล้ว จะแจ้งเตือนผู้ใช้และไม่บันทึกซ้ำ

### ตรวจสอบบัญชีปลายทาง

ระบบดึงบัญชีปลายทางที่ active จากตาราง `target_accounts` และตรวจสอบว่าการโอนเงินตรงกับบัญชีที่กำหนดหรือไม่ หากไม่ตรง จะแจ้งข้อมูลบัญชีที่ถูกต้องให้ผู้ใช้

## File Structure

```
tumboon-lp-sila/
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts        # LINE Webhook endpoint
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Simple status page
├── lib/
│   ├── line.ts                 # LINE SDK client & helpers
│   ├── slip.ts                 # EasySlip API integration
│   └── supabase.ts             # Supabase client
├── supabase/
│   └── migrations/
│       └── 002_add_target_accounts.sql  # DB migration
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
