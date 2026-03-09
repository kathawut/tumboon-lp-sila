export interface SlipResult {
  payDate: string
  amount: number
  transRef?: string
  receiverAccountNumber?: string
  sender: {
    bank: { code: string; name: string }
    account: { name: string }
  }
  receiver: {
    bank: { code: string; name: string }
    account: { name: string }
  }
}

export interface SlipRecord {
  line_user_id: string
  message_id: string
  trans_ref?: string
  amount: number
  sender_name: string
  sender_bank: string
  receiver_name: string
  receiver_bank: string
  pay_date: string
  slip_image_url?: string | null
  confirmed_name?: string
  raw_response: object
  created_at?: string
}
