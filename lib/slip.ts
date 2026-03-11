import type { SlipResult } from '@/types/slip'

const EASYSLIP_API_URL = 'https://developer.easyslip.com/api/v1/verify'

/**
 * EasySlip returns account name as either a string or an object like { th: "...", en: "..." }
 * This helper extracts the string value safely.
 */
function extractName(name: unknown): string {
  if (!name) return ''
  if (typeof name === 'string') return name
  if (typeof name === 'object') {
    const n = name as Record<string, string>
    return n.th || n.en || Object.values(n)[0] || ''
  }
  return String(name)
}

export async function verifySlip(imageBase64: string): Promise<SlipResult | null> {
  const apiKey = process.env.EASYSLIP_API_KEY
  if (!apiKey) {
    console.error('EASYSLIP_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch(EASYSLIP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${imageBase64}`,
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data || !data.data) {
      return null
    }

    const slip = data.data
    const payDate =
      slip.date || slip.transDate || slip.payDate || new Date().toISOString()

    return {
      payDate,
      amount: typeof slip.amount?.amount === 'number' ? slip.amount.amount : 0,
      transRef: slip.transRef || slip.transId || '',
      // EasySlip returns masked account like "xxx-x-x9961-x"
      receiverAccountNumber:
        slip.receiver?.account?.number ||
        slip.receiver?.account?.account ||
        slip.receiver?.account?.proxy?.account ||
        slip.receiver?.account?.bank?.account ||
        '',
      sender: {
        bank: {
          code: slip.sender?.bank?.code ?? '',
          name: slip.sender?.bank?.name ?? '',
        },
        account: {
          // name can be a string or { th: "...", en: "..." }
          name: extractName(slip.sender?.account?.name),
        },
      },
      receiver: {
        bank: {
          code: slip.receiver?.bank?.code ?? '',
          name: slip.receiver?.bank?.name ?? '',
        },
        account: {
          // name can be a string or { th: "...", en: "..." }
          name: extractName(slip.receiver?.account?.name),
        },
      },
    }
  } catch {
    return null
  }
}