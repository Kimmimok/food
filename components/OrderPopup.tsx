"use client"

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase-client'

type PopupData = {
  tableLabel?: string
  items?: Array<{ name: string; qty: number }>
  createdAt?: string
}

export default function OrderPopup() {
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PopupData | null>(null)
  const timerRef = useRef<any>(null)

  // Load server toggle
  useEffect(() => {
    (async () => {
      try {
        const client = supabase()
        const { data } = await client
          .from('restaurant_settings')
          .select('enable_new_order_popup')
          .eq('id', 1)
          .maybeSingle()
        setEnabled(data?.enable_new_order_popup !== false)
      } catch {
        setEnabled(true)
      }
    })()
  }, [])

  useEffect(() => {
    const handler = async (e: any) => {
      if (!enabled) return
      const detail = e?.detail || {}
      const client = supabase()

      let popup: PopupData | null = null
      try {
        if (detail.order_ticket_id) {
          const { data: ticket } = await client
            .from('order_ticket')
            .select('id, table_id, created_at, order_item(name_snapshot, qty)')
            .eq('id', detail.order_ticket_id)
            .maybeSingle()
          const tableId = ticket?.table_id
          let tableLabel: string | undefined = undefined
          if (tableId) {
            const { data: table } = await client
              .from('dining_table')
              .select('label')
              .eq('id', tableId)
              .maybeSingle()
            tableLabel = table?.label ?? undefined
          }
          popup = {
            tableLabel,
            items: (ticket?.order_item || []).map((it: any) => ({ name: it.name_snapshot, qty: it.qty })),
            createdAt: ticket?.created_at,
          }
        } else if (detail.order_item_id) {
          const { data: item } = await client
            .from('order_item')
            .select('name_snapshot, qty, order_ticket:order_id(id, table_id, created_at)')
            .eq('id', detail.order_item_id)
            .maybeSingle()
          let tableLabel: string | undefined = undefined
          const ot = Array.isArray((item as any)?.order_ticket) ? (item as any).order_ticket[0] : (item as any)?.order_ticket
          const tableId = ot?.table_id
          if (tableId) {
            const { data: table } = await client
              .from('dining_table')
              .select('label')
              .eq('id', tableId)
              .maybeSingle()
            tableLabel = table?.label ?? undefined
          }
          popup = {
            tableLabel,
            items: item ? [{ name: item.name_snapshot, qty: item.qty }] : [],
            createdAt: ot?.created_at,
          }
        }
      } catch (err) {
        // ignore
      }

      if (!popup) return
      setData(popup)
      setOpen(true)
      // auto-hide after 6s
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setOpen(false), 6000)
    }

    window.addEventListener('pos:new-order', handler)
    return () => window.removeEventListener('pos:new-order', handler)
  }, [enabled])

  if (!open || !data) return null

  return (
    <div className="fixed top-4 right-4 z-50 w-[22rem] max-w-[90vw]">
      <div className="bg-white shadow-2xl rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-blue-600 text-white flex items-center justify-between">
          <div className="font-semibold">새 주문 도착</div>
          <button className="text-white/80 hover:text-white" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="p-4 space-y-2">
          {data.tableLabel && (
            <div className="text-sm text-gray-700">테이블: <span className="font-medium">{data.tableLabel}</span></div>
          )}
          <div className="text-sm text-gray-900">
            {data.items && data.items.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {data.items.slice(0, 5).map((it, i) => (
                  <li key={i}>{it.name} × {it.qty}</li>
                ))}
                {data.items.length > 5 && (
                  <li className="text-gray-500">외 {data.items.length - 5}개</li>
                )}
              </ul>
            ) : (
              <div className="text-gray-500">항목 불러오는 중</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
