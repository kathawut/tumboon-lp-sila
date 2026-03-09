import { NextRequest, NextResponse } from 'next/server'
import type { WebhookEvent } from '@line/bot-sdk'
import { verifySignature, lineClient, downloadImage } from '@/lib/line'
import { verifySlip } from '@/lib/slip'
import { saveSlip } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function buildWelcomeMessage(): string {
  const bankName = process.env.TARGET_BANK_NAME
  const accountName = process.env.TARGET_ACCOUNT_NAME
  const accountNumber = process.env.TARGET_BANK_ACCOUNT
  const amount = process.env.WELCOME_AMOUNT

  if (!bankName && !accountName && !accountNumber && !amount) {
    return '🙏 สวัสดีครับ/ค่ะ ยินดีต้อนรับ\nกรุณาส่งสลิปการโอนเงินทาง LINE นี้ได้เลยครับ/ค่ะ 🙏'
  }

  return [
    '🙏 สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่การทำบุญออนไลน์',
    '',
    '💳 กรุณาโอนเงินเข้าบัญชีทำบุญ:',
    bankName ? `🏦 ธนาคาร: ${bankName}` : null,
    accountName ? `👤 ชื่อบัญชี: ${accountName}` : null,
    accountNumber ? `🔢 เลขบัญชี: ${accountNumber}` : null,
    amount ? `💰 ยอดทำบุญ: ${amount} บาท` : null,
    '',
    '📸 เมื่อโอนเรียบร้อยแล้ว กรุณาส่งสลิปการโอนเงินทาง LINE นี้ได้เลยครับ/ค่ะ 🙏',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer()
    const body = Buffer.from(arrayBuffer).toString('utf-8')
    const signature = request.headers.get('x-line-signature') || ''

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { events } = JSON.parse(body) as { events: WebhookEvent[] }

    await Promise.all(
      events.map(async (event) => {
        try {
          // Follow event (add friend)
          if (event.type === 'follow') {
            await lineClient().replyMessage(event.replyToken, {
              type: 'text',
              text: buildWelcomeMessage(),
            })
            return
          }

          // Text message → welcome message
          if (event.type === 'message' && event.message.type === 'text') {
            await lineClient().replyMessage(event.replyToken, {
              type: 'text',
              text: buildWelcomeMessage(),
            })
            return
          }

          if (event.type !== 'message' || event.message.type !== 'image') {
            return
          }

          const messageId = event.message.id
          const userId = event.source.userId || ''
          const replyToken = event.replyToken

          const imageBuffer = await downloadImage(messageId)
          const imageBase64 = imageBuffer.toString('base64')

          const slipResult = await verifySlip(imageBase64)

          if (!slipResult) {
            await lineClient().replyMessage(replyToken, {
              type: 'text',
              text: 'ไม่สามารถอ่าน slip ได้ กรุณาส่งรูปใหม่อีกครั้ง',
            })
            return
          }

          // Receiver validation
          const targetAccount = process.env.TARGET_BANK_ACCOUNT
          if (targetAccount) {
            const receiverAccountNumber = slipResult.receiverAccountNumber
            const isValidReceiver =
              receiverAccountNumber != null &&
              (receiverAccountNumber.slice(-4) === targetAccount.slice(-4) ||
                receiverAccountNumber === targetAccount)

            if (!isValidReceiver) {
              await lineClient().replyMessage(replyToken, {
                type: 'text',
                text: `❌ ไม่พบการโอนเงินเข้าบัญชีที่กำหนด\nกรุณาโอนเข้าบัญชี: ${targetAccount}\nแล้วส่ง slip ใหม่อีกครั้ง`,
              })
              return
            }
          }

          await saveSlip({
            line_user_id: userId,
            message_id: messageId,
            amount: slipResult.amount,
            sender_name: slipResult.sender.account.name,
            sender_bank: slipResult.sender.bank.name,
            receiver_name: slipResult.receiver.account.name,
            receiver_bank: slipResult.receiver.bank.name,
            pay_date: slipResult.payDate,
            raw_response: slipResult as unknown as object,
          })

          const replyText = [
            '✅ บันทึก Slip สำเร็จ',
            `📅 วันที่: ${slipResult.payDate}`,
            `💰 จำนวนเงิน: ${Number(slipResult.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
            `👤 ผู้โอน: ${slipResult.sender.account.name} (${slipResult.sender.bank.name})`,
            `🏦 ผู้รับ: ${slipResult.receiver.account.name} (${slipResult.receiver.bank.name})`,
          ].join('\n')

          await lineClient().replyMessage(replyToken, { type: 'text', text: replyText })
        } catch (eventError) {
          console.error('Error processing event:', eventError)
        }
      }),
    )

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}
