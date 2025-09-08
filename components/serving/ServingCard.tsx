// @ts-nocheck
'use client'

import { setKitchenStatus } from '@/app/kitchen/actions'
import { useState } from 'react'

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

export default function ServingCard({ q, tableLabelMap }: { q: SQueue, tableLabelMap: Record<string,string> }) {
  const [loadingServed, setLoadingServed] = useState(false)
  const tableLabel = q.order_item?.order_ticket?.table_id ? (tableLabelMap[q.order_item.order_ticket.table_id] ?? '') : ''

  const toServed = async () => {
    const id = q.order_item?.id
    if (!id) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 항목 정보 없음', type: 'error' } }))
    try {
      setLoadingServed(true)
      await setKitchenStatus(id, 'served')
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '서빙 완료 처리됨', type: 'success' } }))
      // optimistic UI: inform serving board to update this item immediately
      window.dispatchEvent(new CustomEvent('serving:updated', { detail: { id, status: 'served' } }))
    } catch (err:any) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '서빙 처리 실패: '+(err?.message||String(err)), type: 'error' } }))
    } finally {
      setLoadingServed(false)
    }
  }

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 bg-green-50 shadow-sm min-h-[120px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-semibold text-lg">{q.order_item?.name_snapshot} × {q.order_item?.qty}</div>
          {tableLabel && <div className="text-sm opacity-70 mt-1">테이블 {tableLabel}</div>}
          {q.done_at && (
            <div className="text-sm text-green-600 mt-1">
              완료 시간: {new Date(q.done_at).toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="text-sm border rounded-full px-3 py-1 bg-green-100 text-green-700">{badge(q.status)}</span>
          <button
            onClick={toServed}
            disabled={q.status !== 'done' || loadingServed}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-green-700 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loadingServed ? '처리중...' : '서빙완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

function badge(s: SQueue['status']) {
  switch (s) {
    case 'done': return '서빙대기'
    case 'served': return '서빙완료'
    default: return s
  }
}
