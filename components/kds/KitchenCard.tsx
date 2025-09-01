// @ts-nocheck
'use client'

import { setKitchenStatus } from '@/app/kitchen/actions'

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

export default function KitchenCard({ q, tableLabelMap }: { q: KQueue, tableLabelMap: Record<string,string> }) {
  const tableLabel = q.order_item?.order_ticket?.table_id ? (tableLabelMap[q.order_item.order_ticket.table_id] ?? '') : ''

  const toInProgress = async () => { await setKitchenStatus(q.id, 'in_progress') }
  const toDone = async () => { await setKitchenStatus(q.id, 'done') }
  const toServed = async () => { await setKitchenStatus(q.id, 'served') }

  return (
    <div className="border rounded p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium text-sm">{q.order_item?.name_snapshot} × {q.order_item?.qty}</div>
          {tableLabel && <div className="text-xs opacity-70">테이블 {tableLabel}</div>}
        </div>
        <span className="text-xs border rounded px-2 py-0.5">{badge(q.status)}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button onClick={toInProgress} disabled={q.status!=='queued'} className="px-2 py-1 border rounded text-xs disabled:opacity-40">조리시작</button>
        <button onClick={toDone} disabled={q.status!=='in_progress'} className="px-2 py-1 border rounded text-xs disabled:opacity-40">완료</button>
        <button onClick={toServed} disabled={q.status!=='done'} className="px-2 py-1 border rounded text-xs disabled:opacity-40">서빙완료</button>
      </div>
    </div>
  )
}

function badge(s: KQueue['status']) {
  switch (s) {
    case 'queued': return '접수'
    case 'in_progress': return '조리중'
    case 'done': return '완료'
    case 'served': return '서빙완료'
  }
}
