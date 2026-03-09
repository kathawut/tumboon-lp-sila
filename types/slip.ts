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
  amount: number
  sender_name: string
  sender_bank: string
  receiver_name: string
  receiver_bank: string
  pay_date: string
  raw_response: object
  trans_ref?: string
  created_at?: string
}

export interface TargetAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
  is_active: boolean
  created_at?: string
}
