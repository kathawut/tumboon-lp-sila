import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SlipRecord, TargetAccount } from '@/types/slip'

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

export async function saveSlip(data: SlipRecord): Promise<void> {
  const { error } = await getSupabaseClient().from('slips').insert([data])
  if (error) {
    throw new Error(`Failed to save slip: ${error.message}`)
  }
}

export async function checkDuplicateSlip(transRef: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('slips')
    .select('id')
    .eq('trans_ref', transRef)
    .maybeSingle()

  if (error) {
    console.error('checkDuplicateSlip error:', error.message)
    return false
  }
  return !!data
}

export async function getActiveTargetAccounts(): Promise<TargetAccount[]> {
  const { data, error } = await getSupabaseClient()
    .from('target_accounts')
    .select('*')
    .eq('is_active', true)

  if (error || !data) return []
  return data as TargetAccount[]
}
