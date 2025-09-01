// @ts-nocheck
'use client'

import { useState } from 'react'
import { payOrder } from '@/app/cashier/actions'

type Order = {
  id: string
  table_id: string
  total: number
  status: string
  dining_table?: { label: string }
}

export default function CashierPanel({ orders }: { orders: Order[] }) {
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [amount, setAmount] = useState('')

  const handlePay = async (orderId: string, total: number) => {
    const amt = Number(amount || total)
    if (isNaN(amt) || amt <= 0) {
      alert('결제 금액을 입력하세요.')
      return
    }
    await payOrder({ orderId, method, amount: amt })
    alert('결제 완료!')
  }

  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div key={o.id} className="border rounded-xl p-3">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">테이블 {o.dining_table?.label ?? ''}</div>
              <div className="text-xs opacity-70">{o.status}</div>
            </div>
            <div className="text-sm">합계 ₩ {o.total?.toLocaleString() ?? 0}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select value={method} onChange={e => setMethod(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="cash">현금</option>
              <option value="card">카드</option>
            </select>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="금액"
              inputMode="decimal"
              className="border rounded px-2 py-1 text-sm w-28"
            />
            <button
              onClick={() => handlePay(o.id, o.total ?? 0)}
              className="px-3 py-1 rounded bg-black text-white text-sm"
            >
              결제 완료
            </button>
          </div>
        </div>
      ))}

      {orders.length === 0 && (
        <p className="text-sm opacity-70">열린 주문이 없습니다.</p>
      )}
    </div>
  )
}
