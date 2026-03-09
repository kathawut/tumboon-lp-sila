export interface SlipResult {
  payDate: string
  amount: number
  sender: {
    bank: { code: string; name: string }
    account: { name: string }
  }
  receiver: {
    bank: { code: string; name: string }
    account: { name: string }
  }
  receiverAccountNumber?: string
}

export interface SlipRecord {
  line_user_id: string
  message_id: string
  amount: number
  sender_name: string
  sender_bank: string
  receiver_name: string
  receiver_bank: string
  pay_date: string
  raw_response: object
  created_at?: string
}
