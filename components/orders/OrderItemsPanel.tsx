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

  function sortItems(arr: OrderItem[]) {
    return (arr || []).slice().sort((a, b) => {
      const na = Number((a as any).id)
      const nb = Number((b as any).id)
      if (!isNaN(na) && !isNaN(nb)) return nb - na
      const ta = (a as any).created_at
      const tb = (b as any).created_at
      if (ta && tb) return new Date(tb).getTime() - new Date(ta).getTime()
      return 0
    })
  }

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
      if (!ignore) setItems(sortItems(data ?? []))
    }
    load()

    function onOrderItemsUpdated(e: any) {
      try {
        if (e?.detail?.orderId === orderId) load()
      } catch (err) {}
    }
    window.addEventListener('order:items:updated', onOrderItemsUpdated)

    const ch = client
      .channel(`order_items_${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item', filter: `order_id=eq.${orderId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => sortItems([payload.new as OrderItem, ...prev]))
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => sortItems(prev.map(i => i.id === (payload.new as OrderItem).id ? (payload.new as OrderItem) : i)))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== (payload.old as OrderItem).id))
        }
      })
      .subscribe()

  return () => { ignore = true; window.removeEventListener('order:items:updated', onOrderItemsUpdated); client.removeChannel(ch) }
  }, [orderId])

  const lineTotal = (it: OrderItem) => (it.price_snapshot * it.qty)

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">현재 주문</div>
        <div>
          <button
            onClick={async () => {
              if (!orderId) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 ID를 찾을 수 없습니다', type: 'error' } }))
              if (!items || items.length === 0) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '전송할 항목이 없습니다', type: 'info' } }))
              try {
                const res = await fetch('/api/order/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId }) })
                const j = await res.json()
                if (j.ok) {
                  window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 전송됨', type: 'success' } }))
                  // fire global update so other parts refresh
                  window.dispatchEvent(new CustomEvent('pos:data-updated', { detail: { table: 'order_ticket' } }))
                } else {
                  throw new Error(j.error || 'failed')
                }
              } catch (err) {
                window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 전송 실패', type: 'error' } }))
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-base font-semibold shadow-sm"
          >
            주문
          </button>
        </div>
      </div>
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
              <button
                onClick={async () => {
                  // optimistic remove
                  setItems(prev => prev.filter(i => i.id !== it.id))
                  try {
                    await removeOrderItem(it.id)
                  } catch (err) {
                    // if server delete fails, reload from DB and notify
                    try {
                      const client = supabase()
                      const { data } = await client
                        .from('order_item')
                        .select('id, name_snapshot, price_snapshot, qty, status')
                        .eq('order_id', orderId)
                        .order('id', { ascending: false })
                      setItems(data ?? [])
                    } catch (e) {
                      // ignore
                    }
                    window.dispatchEvent(new CustomEvent('notify', { detail: { message: '삭제 실패', type: 'error' } }))
                  }
                }}
                className="ml-auto px-2 py-1 border rounded text-sm text-red-600"
              >
                삭제
              </button>
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
