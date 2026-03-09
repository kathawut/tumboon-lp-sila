import type { SlipResult } from '@/types/slip'

const EASYSLIP_API_URL = 'https://developer.easyslip.com/api/v1/verify'

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
    const payDate = slip.date || slip.transRef || new Date().toISOString()

    return {
      payDate,
      amount: slip.amount?.amount ?? 0,
      sender: {
        bank: {
          code: slip.sender?.bank?.id ?? slip.sender?.bank?.short ?? '',
          name: slip.sender?.bank?.name ?? slip.sender?.bank?.short ?? '',
        },
        account: {
          name: slip.sender?.account?.name?.th ?? slip.sender?.account?.name?.en ?? '',
        },
      },
      receiver: {
        bank: {
          code: slip.receiver?.bank?.id ?? slip.receiver?.bank?.short ?? '',
          name: slip.receiver?.bank?.name ?? slip.receiver?.bank?.short ?? '',
        },
        account: {
          name: slip.receiver?.account?.name?.th ?? slip.receiver?.account?.name?.en ?? '',
        },
      },
    }
  } catch {
    return null
  }
}
