// @ts-nocheck
'use client'

import { useMemo, useState, useEffect } from 'react'
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
  const [cat, setCat] = useState<string>('all')
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

  const cats = useMemo(() => {
    const preferredOrder = ['식사', '안주', '주류', '음료']
    const normalize = (s: string) => (s || '').toLowerCase()
    // map english-ish keywords to our preferred buckets
    const mapKey = (name: string) => {
      const n = normalize(name)
      if (n.includes('식') || n.includes('meal') || n.includes('main')) return '식사'
      if (n.includes('안주') || n.includes('side') || n.includes('appetizer')) return '안주'
      if (n.includes('주류') || n.includes('alcohol') || n.includes('beer') || n.includes('wine')) return '주류'
      if (n.includes('음료') || n.includes('drink') || n.includes('beverage') || n.includes('juice')) return '음료'
      return name
    }

    const cloned = Array.isArray(categories) ? [...categories] : []
    // sort using preferredOrder; unknown categories come after, preserving relative order
    cloned.sort((a: any, b: any) => {
      const ka = mapKey(a.name)
      const kb = mapKey(b.name)
      const ia = preferredOrder.indexOf(ka as string)
      const ib = preferredOrder.indexOf(kb as string)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

    return [{ id: 'all', name: '전체' }, ...cloned]
  }, [categories])
  // when categories load, prefer to default to the '식사' category if present
  useEffect(() => {
    try {
      if (!categories || categories.length === 0) return
      // only set default when currently 'all'
      if (cat && cat !== 'all') return
      const preferred = categories.find((c: any) => {
        const n = (c.name || '').toLowerCase()
        return n.includes('식') || n.includes('meal') || n.includes('main')
      })
      if (preferred) setCat(preferred.id)
    } catch (e) {}
  }, [categories])
  const filtered = useMemo(() => {
    let rows = items
    if (cat !== 'all') rows = rows.filter(r => r.category_id === cat)
    return rows
  }, [cat, items])

  const add = async (menuItemId: string, useQty?: number) => {
    const sendQty = typeof useQty === 'number' ? useQty : (qtyMap[menuItemId] ?? 1)
    try {
      const res = await fetch('/api/order/add', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, menuItemId, qty: sendQty }) })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'failed')
  // reset per-menu qty to 1 after successful add
  setQtyMap(prev => ({ ...prev, [menuItemId]: 1 }))
  // notify other components (e.g., OrderItemsPanel) to reload
  try { window.dispatchEvent(new CustomEvent('order:items:updated', { detail: { orderId } })) } catch (e) { /* noop */ }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 추가 실패', type: 'error' } }))
    }
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-2">메뉴 선택</div>
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-sm font-medium transition-colors ${cat === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
  {/* 검색창 및 전체 수량 선택 제거 */}
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(m => (
          <li key={m.id} className="border rounded p-2">
            <div className="text-base font-semibold">{m.name}</div>
            <div className="text-xs opacity-70 mb-2">₩ {m.price.toLocaleString()}</div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={()=>setQtyMap(prev => ({ ...prev, [m.id]: Math.max(1, (prev[m.id] || 1) - 1) }))} className="px-2 py-1 border rounded text-sm">-</button>
              <div className="text-base w-8 text-center">{qtyMap[m.id] ?? 1}</div>
              <button onClick={()=>setQtyMap(prev => ({ ...prev, [m.id]: (prev[m.id] || 1) + 1 }))} className="px-2 py-1 border rounded text-sm">+</button>
              <div className="ml-auto text-sm text-gray-500">수량 선택</div>
            </div>
            <div className="flex justify-end">
              <button onClick={()=>add(m.id)} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-base transition-colors">추가</button>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && <p className="text-sm opacity-70">표시할 메뉴가 없습니다.</p>}
    </div>
  )
}
