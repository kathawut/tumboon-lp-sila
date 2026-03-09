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
    const payDate =
      slip.date || slip.transDate || slip.payDate || new Date().toISOString()

    return {
      payDate,
      amount: typeof slip.amount?.amount === 'number' ? slip.amount.amount : 0,
      transRef: slip.transRef || slip.transId || '',
      receiverAccountNumber: slip.receiver?.account?.bank?.account || '',
      sender: {
        bank: {
          code: slip.sender?.bank?.code ?? '',
          name: slip.sender?.bank?.name ?? '',
        },
        account: {
          name: slip.sender?.account?.name ?? '',
        },
      },
      receiver: {
        bank: {
          code: slip.receiver?.bank?.code ?? '',
          name: slip.receiver?.bank?.name ?? '',
        },
        account: {
          name: slip.receiver?.account?.name ?? '',
        },
      },
    }
  } catch {
    return null
  }
}
