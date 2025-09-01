// @ts-nocheck
'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts'

type Row = { date: string; sales: number; orders: number }

export default function SalesChart({ rows }: { rows: Row[] }) {
  // 날짜 라벨 단순화 (YYYY-MM-DD)
  const data = rows.map(r => ({
    ...r,
    label: new Date(r.date).toISOString().slice(0, 10),
  }))

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="sales" name="매출" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" name="매출" />
            <Line type="monotone" dataKey="orders" name="주문수" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
