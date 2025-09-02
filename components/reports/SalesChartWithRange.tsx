// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import SalesChart from './SalesChart'

type Row = { date: string; sales: number; orders: number }

export default function SalesChartWithRange({ rows }: { rows: Row[] }) {
  const [range, setRange] = useState<number>(30)

  const handleSetRange = (n: number) => () => setRange(n)

  const filtered = useMemo(() => {
    if (!rows || rows.length === 0) return []
    // parse dates and filter by date >= cutoff (days)
    const today = new Date()
    const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    cutoff.setDate(cutoff.getDate() - (range - 1))

    return rows.filter(r => {
      const d = new Date(r.date)
      // normalize
      const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return nd >= cutoff
    })
  }, [rows, range])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSetRange(7)}
            className={`px-3 py-1 text-sm rounded-md ${range === 7 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
          >7일</button>
          <button
            onClick={handleSetRange(30)}
            className={`px-3 py-1 text-sm rounded-md ${range === 30 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
          >30일</button>
          <button
            onClick={handleSetRange(90)}
            className={`px-3 py-1 text-sm rounded-md ${range === 90 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
          >90일</button>
        </div>
        <div className="text-sm text-gray-500">기간: 최근 {range}일</div>
      </div>

      <SalesChart rows={filtered} />
    </div>
  )
}
