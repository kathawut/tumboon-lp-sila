# tumboon-lp-sila

LINE Chatbot สำหรับรับสลิปการโอนเงินและอ่านยอดเงินบริจาคอัตโนมัติ

## วิธีใช้งาน

1. ผู้ใช้ **Add** LINE Bot ของคุณ → ระบบส่งข้อความต้อนรับ
2. ผู้ใช้**ส่งรูปสลิป**การโอนเงิน → ระบบอ่านยอดเงินด้วย AI (GPT-4o Vision) แล้วตอบกลับยอดเงิน

## การติดตั้ง

```bash
npm install
cp .env.example .env
# แก้ไขค่า LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET และ OPENAI_API_KEY ใน .env
npm start
```

## Environment Variables

| Variable | Description |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Channel Access Token |
| `LINE_CHANNEL_SECRET` | LINE Messaging API Channel Secret |
| `OPENAI_API_KEY` | OpenAI API Key (สำหรับ GPT-4o Vision) |
| `PORT` | Port สำหรับ server (default: 3000) |

## Webhook

ตั้งค่า LINE Webhook URL เป็น `https://<your-domain>/webhook`

## Tests

```bash
npm test
```
