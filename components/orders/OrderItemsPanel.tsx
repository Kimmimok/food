// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { removeOrderItem, updateQty } from '@/app/tables/actions'

type OrderItem = {
  id: string
  name_snapshot: string
  price_snapshot: number
  qty: number
  status: 'queued' | 'in_progress' | 'done' | 'served' | 'canceled'
}

export default function OrderItemsPanel({ orderId }: { orderId: string }) {
  const [items, setItems] = useState<OrderItem[]>([])

  // 초기 로드 + Realtime
  useEffect(() => {
    const client = supabase()
    let ignore = false

    async function load() {
      const { data } = await client
        .from('order_item')
        .select('id, name_snapshot, price_snapshot, qty, status')
        .eq('order_id', orderId)
        .order('id', { ascending: false })
      if (!ignore) setItems(data ?? [])
    }
    load()

    const ch = client
      .channel(`order_items_${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item', filter: `order_id=eq.${orderId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [payload.new as OrderItem, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === (payload.new as OrderItem).id ? (payload.new as OrderItem) : i))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== (payload.old as OrderItem).id))
        }
      })
      .subscribe()

    return () => { ignore = true; client.removeChannel(ch) }
  }, [orderId])

  const lineTotal = (it: OrderItem) => (it.price_snapshot * it.qty)

  return (
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-2">현재 주문</div>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.id} className="border rounded p-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{it.name_snapshot}</div>
                <div className="text-xs opacity-70">{it.status}</div>
              </div>
              <div className="text-sm">₩ {lineTotal(it).toLocaleString()}</div>
            </div>
            <div className="mt-2 flex gap-2 items-center">
              <button onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))} className="px-2 py-1 border rounded text-sm">-</button>
              <span className="text-sm w-6 text-center">{it.qty}</span>
              <button onClick={() => updateQty(it.id, it.qty + 1)} className="px-2 py-1 border rounded text-sm">+</button>
              <button onClick={() => removeOrderItem(it.id)} className="ml-auto px-2 py-1 border rounded text-sm text-red-600">삭제</button>
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && <p className="text-sm opacity-70">항목이 없습니다. 우측에서 메뉴를 추가하세요.</p>}

      <div className="mt-3 border-t pt-2 flex justify-between text-sm">
        <span>소계</span>
        <span>
          ₩ {items.reduce((s, it) => s + (it.price_snapshot * it.qty), 0).toLocaleString()}
        </span>
      </div>
    </div>
  )
}
