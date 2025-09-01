// @ts-nocheck
'use client'

import { useMemo, useState } from 'react'
import { addOrderItem } from '@/app/tables/actions'

type Category = { id: string; name: string }
type Item = {
  id: string
  name: string
  price: number
  category_id: string | null
  is_sold_out: boolean
}

export default function OrderBuilder({
  orderId,
  categories,
  items
}: {
  orderId: string
  categories: Category[]
  items: Item[]
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [qty, setQty] = useState<number>(1)

  const cats = useMemo(() => [{ id: 'all', name: '전체' }, ...categories], [categories])
  const filtered = useMemo(() => {
    let rows = items
    if (cat !== 'all') rows = rows.filter(r => r.category_id === cat)
    if (q.trim()) {
      const qq = q.toLowerCase()
      rows = rows.filter(r => r.name.toLowerCase().includes(qq))
    }
    return rows
  }, [cat, q, items])

  const add = async (menuItemId: string) => {
    await addOrderItem({ orderId, menuItemId, qty })
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-2">메뉴 선택</div>
      <div className="flex flex-wrap gap-2 mb-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="검색" className="border rounded px-3 py-2 text-sm" />
        <select value={cat} onChange={e=>setCat(e.target.value)} className="border rounded px-3 py-2 text-sm">
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-sm opacity-70">수량</span>
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="px-2 py-1 border rounded text-sm">-</button>
          <span className="text-sm w-6 text-center">{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} className="px-2 py-1 border rounded text-sm">+</button>
        </div>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(m => (
          <li key={m.id} className="border rounded p-2">
            <div className="text-sm font-medium">{m.name}</div>
            <div className="text-xs opacity-70 mb-2">₩ {m.price.toLocaleString()}</div>
            <button onClick={()=>add(m.id)} className="w-full px-2 py-1 rounded bg-black text-white text-sm">추가</button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && <p className="text-sm opacity-70">표시할 메뉴가 없습니다.</p>}
    </div>
  )
}
