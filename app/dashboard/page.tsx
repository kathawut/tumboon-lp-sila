'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import SlipTable from './SlipTable'

export interface SlipRow {
  id: string
  created_at: string
  pay_date: string
  sender_name: string
  confirmed_name: string | null
  name_confirmed_at: string | null
  amount: number
  sender_bank: string
  receiver_bank: string
  slip_image_url: string | null
  line_user_id: string
  trans_ref: string | null
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default function DashboardPage() {
  const [slips, setSlips] = useState<SlipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState('')
  const [filterConfirmed, setFilterConfirmed] = useState<'all' | 'confirmed' | 'pending'>('all')

  useEffect(() => {
    async function fetchSlips() {
      setLoading(true)
      setError(null)
      const supabase = getSupabase()
      if (!supabase) {
        setError('ไม่พบ Supabase configuration — กรุณาตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY')
        setLoading(false)
        return
      }

      let query = supabase
        .from('slips')
        .select(
          'id, created_at, pay_date, sender_name, confirmed_name, name_confirmed_at, amount, sender_bank, receiver_bank, slip_image_url, line_user_id, trans_ref'
        )
        .order('created_at', { ascending: false })

      if (filterDate) {
        query = query.gte('pay_date', filterDate).lte('pay_date', filterDate + 'T23:59:59')
      }

      if (filterConfirmed === 'confirmed') {
        query = query.not('name_confirmed_at', 'is', null)
      } else if (filterConfirmed === 'pending') {
        query = query.is('name_confirmed_at', null)
      }

      const { data, error: fetchError } = await query
      if (fetchError) {
        setError('เกิดข้อผิดพลาด: ' + fetchError.message)
      } else {
        setSlips((data as SlipRow[]) || [])
      }
      setLoading(false)
    }

    fetchSlips()
  }, [filterDate, filterConfirmed])

  const totalAmount = slips.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const confirmedCount = slips.filter((s) => s.name_confirmed_at).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-800">🪨 ระบบจัดการ Slip ทำบุญ</h1>
          <p className="text-sm text-gray-500 mt-1">รายการการโอนเงินทำบุญทั้งหมด</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📋</div>
              <p className="text-sm font-medium text-gray-500">จำนวน Slip ทั้งหมด</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{slips.length}</p>
            <p className="text-sm text-gray-400 mt-1">รายการ</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">💰</div>
              <p className="text-sm font-medium text-gray-500">ยอดรวมทั้งหมด</p>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400 mt-1">บาท</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">✅</div>
              <p className="text-sm font-medium text-gray-500">ยืนยันชื่อแล้ว</p>
            </div>
            <p className="text-3xl font-bold text-purple-600">{confirmedCount}</p>
            <p className="text-sm text-gray-400 mt-1">จาก {slips.length} รายการ</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                กรองตามวันที่
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                สถานะยืนยันชื่อ
              </label>
              <select
                value={filterConfirmed}
                onChange={(e) => setFilterConfirmed(e.target.value as 'all' | 'confirmed' | 'pending')}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50"
              >
                <option value="all">ทั้งหมด</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="pending">รอยืนยัน</option>
              </select>
            </div>
            {(filterDate || filterConfirmed !== 'all') && (
              <button
                onClick={() => { setFilterDate(''); setFilterConfirmed('all') }}
                className="text-sm text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-xl px-3 py-2 transition-colors"
              >
                ล้างตัวกรอง ✕
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="text-4xl mb-3 animate-pulse">🪨</div>
            <p className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <SlipTable slips={slips} />
        )}
      </div>
    </div>
  )
}