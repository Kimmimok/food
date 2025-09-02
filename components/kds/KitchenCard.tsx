// @ts-nocheck
'use client'

import { setKitchenStatus } from '@/app/kitchen/actions'
import { useState } from 'react'

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
  const [loadingInProgress, setLoadingInProgress] = useState(false)
  const [loadingDone, setLoadingDone] = useState(false)
  const [loadingServed, setLoadingServed] = useState(false)
  const tableLabel = q.order_item?.order_ticket?.table_id ? (tableLabelMap[q.order_item.order_ticket.table_id] ?? '') : ''

  const toInProgress = async () => {
    const id = q.order_item?.id
    if (!id) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 항목 정보 없음', type: 'error' } }))
    try {
      setLoadingInProgress(true)
      await setKitchenStatus(id, 'in_progress')
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '조리 시작', type: 'success' } }))
      // optimistic UI: inform kitchen board to update this item immediately
      window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, status: 'in_progress' } }))
    } catch (err:any) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '조리 시작 실패: '+(err?.message||String(err)), type: 'error' } }))
    } finally { 
      setLoadingInProgress(false) 
    }
  }

  const toDone = async () => {
    const id = q.order_item?.id
    if (!id) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 항목 정보 없음', type: 'error' } }))
    try {
      setLoadingDone(true)
      await setKitchenStatus(id, 'done')
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '완료 처리됨', type: 'success' } }))
      window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, status: 'done' } }))
    } catch (err:any) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '완료 처리 실패: '+(err?.message||String(err)), type: 'error' } }))
    } finally { 
      setLoadingDone(false) 
    }
  }

  const toServed = async () => {
    const id = q.order_item?.id
    if (!id) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 항목 정보 없음', type: 'error' } }))
    try {
      setLoadingServed(true)
      await setKitchenStatus(id, 'served')
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '서빙 완료 처리됨', type: 'success' } }))
      window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, status: 'served' } }))
    } catch (err:any) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '서빙 처리 실패: '+(err?.message||String(err)), type: 'error' } }))
    } finally { 
      setLoadingServed(false) 
    }
  }

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
        <button onClick={toInProgress} disabled={q.status!=='queued' || loadingInProgress} className="px-2 py-1 border rounded text-xs disabled:opacity-40">{loadingInProgress ? '처리중...' : '조리시작'}</button>
        <button onClick={toDone} disabled={q.status!=='in_progress' || loadingDone} className="px-2 py-1 border rounded text-xs disabled:opacity-40">{loadingDone ? '처리중...' : '완료'}</button>
        <button onClick={toServed} disabled={q.status!=='done' || loadingServed} className="px-2 py-1 border rounded text-xs disabled:opacity-40">{loadingServed ? '처리중...' : '서빙완료'}</button>
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
