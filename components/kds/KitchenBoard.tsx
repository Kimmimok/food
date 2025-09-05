// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import KitchenCard from './KitchenCard'

type KQueue = {
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

export default function KitchenBoard({
  station,
  initialQueue,
  tableLabelMap
}: {
  station: string
  initialQueue: KQueue[]
  tableLabelMap: Record<string, string>
}) {
  const [rows, setRows] = useState<KQueue[]>(initialQueue)

  // Realtime 구독: station 필터
  useEffect(() => {
    const client = supabase()

    const ch = client
      .channel(`kitchen_${station}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_queue', filter: `station=eq.${station}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // 새 insert는 order_item 정보가 비어있을 수 있으니, 한 번 더 fetch
            const { data } = await client
              .from('kitchen_queue')
              .select(`
                id, status, created_at, started_at, done_at,
                order_item:order_item_id (
                  id, name_snapshot, qty,
                  order_ticket:order_id ( id, table_id )
                )
              `)
              .eq('id', (payload.new as any).id)
              .single()
            setRows(prev => [...prev, ...(data ? [data as any] : [])])
          } else if (payload.eventType === 'UPDATE') {
            setRows(prev => prev.map(r => r.id === (payload.new as any).id ? { ...(payload.new as any), order_item: prev.find(x=>x.id==(payload.new as any).id)?.order_item ?? null } : r))
          } else if (payload.eventType === 'DELETE') {
            setRows(prev => prev.filter(r => r.id !== (payload.old as any).id))
          }
        })
      .subscribe()

    return () => { client.removeChannel(ch) }
  }, [station])

  const grouped = useMemo(() => {
    const g: Record<string, KQueue[]> = { queued: [], in_progress: [], done: [], served: [] }
    for (const r of rows) g[r.status]?.push(r)
    return g
  }, [rows])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Section title="접수" items={grouped.queued} tableLabelMap={tableLabelMap} />
      <Section title="조리중" items={grouped.in_progress} tableLabelMap={tableLabelMap} />
      <Section title="완료" items={grouped.done} tableLabelMap={tableLabelMap} />
      <Section title="서빙완료" items={grouped.served} tableLabelMap={tableLabelMap} />
    </div>
  )
}

function Section({ title, items, tableLabelMap }:{
  title: string
  items: KQueue[]
  tableLabelMap: Record<string,string>
}) {
  return (
    <div className="rounded-xl border p-3 min-h-[200px]">
      <div className="font-semibold mb-2">{title} ({items.length})</div>
      <ul className="space-y-2">
        {items.map(q => (
          <li key={q.id}>
            <KitchenCard q={q} tableLabelMap={tableLabelMap} />
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-xs opacity-60">없음</p>}
    </div>
  )
}
