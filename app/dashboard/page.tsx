'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import SlipTable from './SlipTable'

// TODO: Add authentication before deploying to production
// This dashboard currently has no auth protection (MVP only)

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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export default function DashboardPage() {
  const [slips, setSlips] = useState<SlipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterConfirmed, setFilterConfirmed] = useState<'all' | 'confirmed' | 'pending'>('all')

  useEffect(() => {
    async function fetchSlips() {
      setLoading(true)
      const supabase = getSupabase()
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

      const { data, error } = await query
      if (error) {
        console.error('Fetch slips error:', error)
      } else {
        setSlips((data as SlipRow[]) || [])
      }
      setLoading(false)
    }

    fetchSlips()
  }, [filterDate, filterConfirmed])

  const totalAmount = slips.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Dashboard — รายการ Slip ทำบุญ</h1>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">จำนวน Slip ทั้งหมด</p>
            <p className="text-2xl font-bold text-blue-600">{slips.length} รายการ</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">ยอดรวมทั้งหมด</p>
            <p className="text-2xl font-bold text-green-600">
              {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">ยืนยันชื่อแล้ว</p>
            <p className="text-2xl font-bold text-purple-600">
              {slips.filter((s) => s.name_confirmed_at).length} รายการ
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">กรองตามวันที่</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะยืนยันชื่อ</label>
            <select
              value={filterConfirmed}
              onChange={(e) => setFilterConfirmed(e.target.value as 'all' | 'confirmed' | 'pending')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="pending">รอยืนยัน</option>
            </select>
          </div>
          {(filterDate || filterConfirmed !== 'all') && (
            <button
              onClick={() => { setFilterDate(''); setFilterConfirmed('all') }}
              className="text-sm text-red-500 hover:underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลดข้อมูล...</div>
        ) : (
          <SlipTable slips={slips} />
        )}
      </div>
    </div>
  )
}
