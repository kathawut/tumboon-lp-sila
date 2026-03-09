'use client'

import type { SlipRow } from './page'

interface SlipTableProps {
  slips: SlipRow[]
}

export default function SlipTable({ slips }: SlipTableProps) {
  if (slips.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
        ไม่พบรายการ Slip
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                วันที่
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ชื่อผู้โอน
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ชื่อสำหรับสลักหิน
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ยอดเงิน (บาท)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ธนาคารผู้โอน
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                รูป Slip
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {slips.map((slip) => (
              <tr key={slip.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDate(slip.pay_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                  {slip.sender_name || '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {slip.confirmed_name ? (
                    <span className="text-purple-700 font-semibold">{slip.confirmed_name}</span>
                  ) : (
                    <span className="text-gray-400 italic">รอยืนยัน</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono text-green-700 font-semibold">
                  {Number(slip.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {slip.sender_bank || '—'}
                </td>
                <td className="px-4 py-3">
                  {slip.name_confirmed_at ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ ยืนยันแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ รอยืนยัน
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {slip.slip_image_url ? (
                    <a
                      href={slip.slip_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-sm underline"
                    >
                      ดูรูป 🖼️
                    </a>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
