// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import ServingCard from './ServingCard'

type SQueue = {
  id: string
  status: 'queued' | 'in_progress' | 'done' | 'served'
  created_at: string | null
  started_at: string | null
  done_at: string | null
  order_item: {
    id: string
    name_snapshot: string
    qty: number
    order_ticket: { id: string, table_id: string | null } | null
  } | null
}

export default function ServingBoard({
  station,
  initialQueue,
  tableLabelMap
}: {
  station: string
  initialQueue: SQueue[]
  tableLabelMap: Record<string, string>
}) {
  const [rows, setRows] = useState<SQueue[]>(initialQueue)

  // Realtime 구독: 완료된 아이템들의 상태 변경 감지
  useEffect(() => {
    const client = supabase()

    const ch1 = client
      .channel(`serving_items_${station}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item' }, async (payload) => {
        const id = (payload.new as any)?.id ?? (payload.old as any)?.id
        if (!id) return
        const { data } = await client
          .from('order_item')
          .select(`
            id, status, created_at,
            name_snapshot, qty,
            order_ticket:order_id ( id, table_id ),
            menu_item:menu_item_id ( id, station )
          `)
          .eq('id', id)
          .single()
        if (!data) return
        const st = (data as any).menu_item?.station || 'main'
        if (st !== station || data.status !== 'done') return
        const q = {
          id: String(data.id),
          status: data.status,
          created_at: data.created_at ?? null,
          started_at: null,
          done_at: null,
          order_item: {
            id: String(data.id),
            name_snapshot: (data as any).name_snapshot,
            qty: (data as any).qty,
            order_ticket: (data as any).order_ticket ? { id: (data as any).order_ticket.id, table_id: (data as any).order_ticket.table_id } : null,
          }
        } as any
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setRows(prev => {
            const existing = prev.find(r => r.id === q.id)
            if (existing) {
              return prev.map(r => r.id === q.id ? { ...q } : r)
            } else {
              return [...prev, q]
            }
          })
        } else if (payload.eventType === 'DELETE') {
          setRows(prev => prev.filter(r => r.id !== q.id))
        }
      })
      .subscribe()

    const ch2 = client
      .channel(`serving_queue_${station}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_queue' }, async (payload) => {
        const id = (payload.new as any)?.id ?? (payload.old as any)?.id
        if (!id) return
        const { data } = await client
          .from('kitchen_queue')
          .select(`
            id, status, created_at, started_at, done_at, station,
            order_item:order_item_id ( id, name_snapshot, qty, order_ticket:order_id ( id, table_id ) )
          `)
          .eq('id', id)
          .single()
        if (!data) return
        if ((data as any).station !== station || data.status !== 'done') return
        const q = {
          id: String(data.id),
          status: (Array.isArray(data.order_item) ? data.order_item[0]?.status : data.order_item?.status) ?? data.status,
          created_at: data.created_at ?? null,
          started_at: data.started_at ?? null,
          done_at: data.done_at ?? null,
          order_item: data.order_item ? ({
            id: String(data.order_item.id),
            name_snapshot: data.order_item.name_snapshot,
            qty: data.order_item.qty,
            order_ticket: data.order_item.order_ticket ? { id: data.order_item.order_ticket.id, table_id: data.order_item.order_ticket.table_id } : null,
          }) : null
        } as any
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setRows(prev => {
            const existing = prev.find(r => r.id === q.id)
            if (existing) {
              return prev.map(r => r.id === q.id ? { ...q } : r)
            } else {
              return [...prev, q]
            }
          })
        } else if (payload.eventType === 'DELETE') {
          setRows(prev => prev.filter(r => r.id !== q.id))
        }
      })
      .subscribe()

    return () => {
      client.removeChannel(ch1)
      client.removeChannel(ch2)
    }
  }, [station])

  // optimistic local updates from ServingCard actions
  useEffect(() => {
    function onLocalUpdate(e:any) {
      const { id, status } = e.detail || {}
      if (!id) return
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
    window.addEventListener('serving:updated', onLocalUpdate)
    return () => window.removeEventListener('serving:updated', onLocalUpdate)
  }, [])

  const grouped = useMemo(() => {
    const g: Record<string, SQueue[]> = { done: [], served: [] }
    for (const r of rows) g[r.status]?.push(r)
    return g
  }, [rows])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Section title="서빙 준비 완료" items={grouped.done} tableLabelMap={tableLabelMap} />
      <Section title="서빙 완료" items={grouped.served} tableLabelMap={tableLabelMap} />
    </div>
  )
}

function Section({ title, items, tableLabelMap }:{
  title: string
  items: SQueue[]
  tableLabelMap: Record<string,string>
}) {
  return (
    <div className="rounded-xl border-2 border-gray-300 p-6 min-h-[300px] bg-gray-50">
      <div className="font-bold text-xl mb-4 text-center">{title} ({items.length})</div>
      <ul className="space-y-3">
        {items.map(q => (
          <li key={q.id}>
            <ServingCard q={q} tableLabelMap={tableLabelMap} />
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-lg opacity-60 text-center mt-8">없음</p>}
    </div>
  )
}
