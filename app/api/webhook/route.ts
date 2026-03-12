import { NextRequest, NextResponse } from 'next/server'
import type { WebhookEvent } from '@line/bot-sdk'
import { verifySignature, lineClient, downloadImage } from '@/lib/line'
import { verifySlip } from '@/lib/slip'
import {
  saveSlip,
  checkDuplicateSlip,
  getActiveTargetAccounts,
  uploadSlipImage,
  getSetting,
  getTotalPaidAmount,
  getUserSession,
  setUserSession,
  clearUserSession,
  updateConfirmedName,
} from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function buildWelcomeMessage(
  requiredAmount: string,
  targetAccounts: Array<{ bank_name: string; account_name: string; account_number: string }>
): string {
  const primary = targetAccounts[0]
  const accountInfo = primary
    ? `\n💳 โอนเงินเข้าบัญชี:\n🏦 ธนาคาร: ${primary.bank_name}\n👤 ชื่อบัญชี: ${primary.account_name}\n🔢 เลขบัญชี: ${primary.account_number}`
    : ''
  return `🙏 สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่การทำบุญออนไลน์${accountInfo}\n💰 ยอดทำบุญ: ${Number(requiredAmount).toLocaleString('th-TH')} บาท\n\n📸 เมื่อโอนเรียบร้อยแล้ว กรุณาส่งสลิปการโอนเงินทาง LINE นี้ได้เลยครับ/ค่ะ 🙏`
}

/**
 * Normalize account number by removing dashes, spaces, and masked 'x' characters.
 * EasySlip returns masked accounts like "xxx-x-x9961-x"
 * DB stores full account numbers like "2278199617"
 * After normalizing: "9961" and "2278199617"
 * We check if DB number contains the visible digits from the slip.
 */
function normalizeAccount(account: string): string {
  return account.replace(/[-x\\s]/gi, '')
}

function isReceiverMatch(slipAccountRaw: string, dbAccount: string): boolean {
  if (!slipAccountRaw) return false
  const slipDigits = normalizeAccount(slipAccountRaw)  // e.g. "9961"
  const dbDigits = normalizeAccount(dbAccount)          // e.g. "2278199617"
  if (!slipDigits) return false
  // Exact match after normalization
  if (slipDigits === dbDigits) return true
  // DB full number contains the visible digits from masked slip
  if (dbDigits.includes(slipDigits)) return true
  // Last 4 digits match (fallback)
  if (slipDigits.length >= 4 && dbDigits.endsWith(slipDigits.slice(-4))) return true
  return false
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
          const userId = ('source' in event && event.source?.userId) ? event.source.userId : ''
          const replyToken = ('replyToken' in event) ? event.replyToken : ''

          // ── FOLLOW EVENT ──
          if (event.type === 'follow') {
            const [targetAccounts, requiredAmount] = await Promise.all([
              getActiveTargetAccounts(),
              getSetting('required_amount'),
            ])
            const welcome = buildWelcomeMessage(requiredAmount || '5100', targetAccounts)
            await lineClient().replyMessage(replyToken, { type: 'text', text: welcome })
            return
          }

          // ── TEXT MESSAGE ──
          if (event.type === 'message' && event.message.type === 'text') {
            const text = event.message.text.trim()
            const session = await getUserSession(userId)

            if (session && session.state === 'waiting_name_confirm') {
              // ลูกค้ายืนยันชื่อ
              const confirmedName = text === '✅' ? session.default_name : text
              await updateConfirmedName(session.slip_id, confirmedName)
              await clearUserSession(userId)
              await lineClient().replyMessage(replyToken, {
                type: 'text',
                text: `✅ บันทึกชื่อสำหรับสลักหินอ่อน:\n"${confirmedName}"\nเรียบร้อยแล้วครับ 🙏`,
              })
              return
            }

            // ไม่มี session → ส่ง welcome message
            const [targetAccounts, requiredAmount] = await Promise.all([
              getActiveTargetAccounts(),
              getSetting('required_amount'),
            ])
            const welcome = buildWelcomeMessage(requiredAmount || '5100', targetAccounts)
            await lineClient().replyMessage(replyToken, { type: 'text', text: welcome })
            return
          }

          // ── IMAGE MESSAGE ──
          if (event.type === 'message' && event.message.type === 'image') {
            const messageId = event.message.id

            const [imageBuffer, targetAccounts, requiredAmountStr] = await Promise.all([
              downloadImage(messageId),
              getActiveTargetAccounts(),
              getSetting('required_amount'),
            ])

            const requiredAmount = Number(requiredAmountStr || '5100')
            const imageBase64 = imageBuffer.toString('base64')
            const slipResult = await verifySlip(imageBase64)

            if (!slipResult) {
              await lineClient().replyMessage(replyToken, {
                type: 'text',
                text: '❌ ไม่สามารถอ่าน slip ได้ กรุณาส่งรูปใหม่อีกครั้งครับ',
              })
              return
            }

            // เช็ค duplicate
            if (slipResult.transRef) {
              const isDuplicate = await checkDuplicateSlip(slipResult.transRef)
              if (isDuplicate) {
                await lineClient().replyMessage(replyToken, {
                  type: 'text',
                  text: '⚠️ Slip นี้ถูกบันทึกไปแล้ว กรุณาตรวจสอบอีกครั้งครับ',
                })
                return
              }
            }

            // เช็คบัญชีปลายทาง
            // EasySlip คืน masked account เช่น "xxx-x-x9961-x"
            // DB เก็บ full account เช่น "2278199617"
            // ใช้ isReceiverMatch() เพื่อรองรับทั้ง 2 format
            if (targetAccounts.length > 0) {
              const receiverAccountNum = slipResult.receiverAccountNumber || ''
              const isValidReceiver = targetAccounts.some((ta) =>
                isReceiverMatch(receiverAccountNum, ta.account_number)
              )
              if (!isValidReceiver) {
                const primary = targetAccounts[0]
                await lineClient().replyMessage(replyToken, {
                  type: 'text',
                  text: `❌ ไม่พบการโอนเข้าบัญชีที่กำหนด\n\nกรุณาโอนเข้าบัญชี:\n🏦 ${primary.bank_name}\n👤 ${primary.account_name}\n🔢 ${primary.account_number}\n\nแล้วส่ง slip ใหม่ครับ 🙏`,
                })
                return
              }
            }

            // เช็คยอดเงินสะสม (รวมกับที่โอนมาก่อนหน้า)
            const previousTotal = await getTotalPaidAmount(userId)
            const newTotal = previousTotal + Number(slipResult.amount)


            if (newTotal < requiredAmount) {
              // ยอดยังไม่ครบ — บันทึก slip นี้ไว้ก่อน แต่แจ้งให้โอนเพิ่ม
              const slipImageUrl = await uploadSlipImage(
                userId,
                slipResult.transRef || messageId,
                imageBuffer
              )

              await saveSlip({
                line_user_id: userId,
                message_id: messageId,
                trans_ref: slipResult.transRef,
                amount: slipResult.amount,
                sender_name: slipResult.sender.account.name,
                sender_bank: slipResult.sender.bank.name,
                receiver_name: slipResult.receiver.account.name,
                receiver_bank: slipResult.receiver.bank.name,
                pay_date: slipResult.payDate,
                slip_image_url: slipImageUrl,
                raw_response: slipResult as unknown as object,
              })

              await lineClient().replyMessage(replyToken, {
                type: 'text',
                text: `✅ รับ slip แล้วครับ ขอบคุณมากครับ 🙏\nขอผลบุญนี้หนุนนำให้ชีวิตรุ่งเรือง เฮงๆ รวยๆ ปลดหนี้ปลดสิน มีกิจการงานที่รุ่งเรือง`,
              })
              return
            }

            // ยอดครบ — บันทึก + อัพโหลดรูป
            const slipImageUrl = await uploadSlipImage(
              userId,
              slipResult.transRef || messageId,
              imageBuffer,
            )

            const senderName = slipResult.sender.account.name || 'ไม่ระบุ'

            const savedSlip = await saveSlip({
              line_user_id: userId,
              message_id: messageId,
              trans_ref: slipResult.transRef,
              amount: slipResult.amount,
              sender_name: senderName,
              sender_bank: slipResult.sender.bank.name,
              receiver_name: slipResult.receiver.account.name,
              receiver_bank: slipResult.receiver.bank.name,
              pay_date: slipResult.payDate,
              slip_image_url: slipImageUrl,
              raw_response: slipResult as unknown as object,
            })

            // ตั้ง session รอยืนยันชื่อ
            if (savedSlip?.id) {
              await setUserSession(userId, 'waiting_name_confirm', savedSlip.id, senderName)
            }

            await lineClient().replyMessage(replyToken, {
              type: 'text',
              text: `✅ บันทึก Slip สำเร็จ\n📅 วันที่: ${slipResult.payDate}\n💰 ยอดรวม: ${Number(slipResult.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n\n🪨 ชื่อที่จะสลักลงหินอ่อน:\n"${senderName}"\n\nถ้าต้องการแก้ไขชื่อ พิมพ์ชื่อที่ต้องการได้เลย\nหรือพิมพ์ ✅ ถ้าถูกต้องแล้วครับ 🙏\n\nขอผลบุญนี้หนุนนำให้ชีวิตรุ่งเรือง เฮงๆ รวยๆ ปลดหนี้ปลดสิน มีกิจการงานที่รุ่งเรือง`,
            })
          }
        } catch (eventError) {
          console.error('Error processing event:', eventError)
        }
      })
    )

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}