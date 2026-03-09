import { NextRequest, NextResponse } from 'next/server'
import type { WebhookEvent } from '@line/bot-sdk'
import { verifySignature, lineClient, downloadImage } from '@/lib/line'
import { verifySlip } from '@/lib/slip'
import { saveSlip } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

          const senderName =
            typeof slipResult.sender.account.name === 'string'
              ? slipResult.sender.account.name || 'ไม่ระบุ'
              : 'ไม่ระบุ'
          const receiverName =
            typeof slipResult.receiver.account.name === 'string'
              ? slipResult.receiver.account.name || 'ไม่ระบุ'
              : 'ไม่ระบุ'
          const senderBank = slipResult.sender.bank.name || 'ไม่ระบุ'
          const receiverBank = slipResult.receiver.bank.name || 'ไม่ระบุ'

          await saveSlip({
            line_user_id: userId,
            message_id: messageId,
            amount: slipResult.amount,
            sender_name: senderName,
            sender_bank: senderBank,
            receiver_name: receiverName,
            receiver_bank: receiverBank,
            pay_date: slipResult.payDate,
            raw_response: slipResult as unknown as object,
          })

          const replyText = [
            '✅ บันทึก Slip สำเร็จ',
            `📅 วันที่: ${slipResult.payDate}`,
            `💰 จำนวนเงิน: ${Number(slipResult.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
            `👤 ผู้โอน: ${senderName} (${senderBank})`,
            `🏦 ผู้รับ: ${receiverName} (${receiverBank})`,
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
