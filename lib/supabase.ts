import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SlipRecord } from '@/types/slip'

let _supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  }
  return _supabase
}

export { getSupabaseClient as supabase }

export async function saveSlip(data: SlipRecord) {
  const supabase = getSupabaseClient()
  const { data: result, error } = await supabase
    .from('slips')
    .insert(data)
    .select('id')
    .single()

  if (error) {
    console.error('Save slip error:', error, { line_user_id: data.line_user_id, trans_ref: data.trans_ref })
    return null
  }
  return result
}

export async function checkDuplicateSlip(transRef: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('slips')
    .select('id')
    .eq('trans_ref', transRef)
    .maybeSingle()
  return !!data
}

export async function getActiveTargetAccounts(): Promise<
  Array<{ bank_name: string; account_number: string; account_name: string }>
> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('target_accounts')
    .select('bank_name, account_number, account_name')
    .eq('is_active', true)
  return data || []
}

const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60 * 24 * 365 * 10 // 10 years

export async function uploadSlipImage(
  lineUserId: string,
  transRef: string,
  imageBuffer: Buffer
): Promise<string | null> {
  const supabase = getSupabaseClient()
  const filePath = `slips/${lineUserId}/${transRef}.jpg`

  const { error } = await supabase.storage
    .from('slip-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error('Upload slip image error:', error)
    return null
  }

  // return signed URL (valid 10 years)
  const { data } = await supabase.storage
    .from('slip-images')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRATION_SECONDS)

  return data?.signedUrl || null
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value || null
}

export async function getUserSession(lineUserId: string) {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle()
  return data
}

export async function setUserSession(
  lineUserId: string,
  state: string,
  slipId: string,
  defaultName: string
) {
  const supabase = getSupabaseClient()
  await supabase
    .from('user_sessions')
    .upsert({
      line_user_id: lineUserId,
      state,
      slip_id: slipId,
      default_name: defaultName,
      updated_at: new Date().toISOString(),
    })
}

export async function clearUserSession(lineUserId: string) {
  const supabase = getSupabaseClient()
  await supabase
    .from('user_sessions')
    .delete()
    .eq('line_user_id', lineUserId)
}

export async function updateConfirmedName(slipId: string, confirmedName: string) {
  const supabase = getSupabaseClient()
  await supabase
    .from('slips')
    .update({
      confirmed_name: confirmedName,
      name_confirmed_at: new Date().toISOString(),
    })
    .eq('id', slipId)
}

export async function getTotalPaidAmount(lineUserId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('slips')
    .select('amount')
    .eq('line_user_id', lineUserId)

  if (!data) return 0
  return data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

