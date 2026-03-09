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
TARGET_BANK_ACCOUNT=xxx-x-xxxxx-x
TARGET_BANK_NAME=ธนาคารกสิกรไทย
TARGET_ACCOUNT_NAME=วัดลำปะสิงห์
WELCOME_AMOUNT=500
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

### 4. Deploy บน Vercel

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
| `TARGET_BANK_ACCOUNT` | เลขบัญชีปลายทางที่ถูกต้อง (optional) |
| `TARGET_BANK_NAME` | ชื่อธนาคารปลายทาง (optional) |
| `TARGET_ACCOUNT_NAME` | ชื่อเจ้าของบัญชี (optional) |
| `WELCOME_AMOUNT` | ยอดเงินที่ต้องการให้โอน (optional) |

### 5. ตั้งค่า LINE Webhook URL

ใน LINE Developers Console > Messaging API > Webhook URL:

```
https://<your-vercel-domain>/api/webhook
```

เปิดใช้งาน "Use webhook"

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

## Features

### ตรวจสอบบัญชีปลายทาง (Receiver Validation)

ถ้า `TARGET_BANK_ACCOUNT` ถูก set ไว้ Bot จะเปรียบเทียบเลขบัญชีปลายทางใน slip กับค่าใน env (โดยใช้ 4 ตัวท้ายของเลขบัญชี หรือ full match) ถ้าไม่ตรง Bot จะ reply แจ้งลูกค้าและไม่บันทึก slip ถ้าไม่ได้ set ตัวแปรนี้ Bot จะยอมรับทุก slip ตามปกติ

### ข้อความต้อนรับ (Welcome / Follow Message)

เมื่อลูกค้า add friend หรือส่งข้อความเข้ามา Bot จะตอบกลับข้อความต้อนรับพร้อมข้อมูลบัญชีสำหรับโอนเงิน (ถ้าตั้งค่า env vars ไว้) ทุก env var ที่เกี่ยวข้องเป็น optional — ถ้าไม่ได้ set จะแสดงข้อความ default
