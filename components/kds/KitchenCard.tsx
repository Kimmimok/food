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

export default function KitchenCard({ q, tableLabelMap, station }: { q: KQueue, tableLabelMap: Record<string,string>, station?: string }) {
  const [loadingInProgress, setLoadingInProgress] = useState(false)
  const [loadingDone, setLoadingDone] = useState(false)
  const [loadingServed, setLoadingServed] = useState(false)
  const tableLabel = q.order_item?.order_ticket?.table_id ? (tableLabelMap[q.order_item.order_ticket.table_id] ?? '') : ''
  const isMain = station === 'main'

  const toInProgress = async () => {
    const id = q.order_item?.id
    if (!id) return window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 항목 정보 없음', type: 'error' } }))
    try {
      setLoadingInProgress(true)
      await setKitchenStatus(id, 'in_progress')
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '조리 시작', type: 'success' } }))
      // optimistic UI: inform kitchen board to update this item immediately
  window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, kqId: q.id, status: 'in_progress' } }))
  // ensure canonical state is fetched if needed
  setTimeout(() => window.location.reload(), 250)
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
  window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, kqId: q.id, status: 'done' } }))
  setTimeout(() => window.location.reload(), 250)
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
  window.dispatchEvent(new CustomEvent('kitchen:updated', { detail: { id, kqId: q.id, status: 'served' } }))
  setTimeout(() => window.location.reload(), 250)
    } catch (err:any) {
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '서빙 처리 실패: '+(err?.message||String(err)), type: 'error' } }))
    } finally { 
      setLoadingServed(false) 
    }
  }

  return (
    <div className={`border-2 border-gray-300 rounded-lg ${isMain ? 'p-4' : 'p-3'} bg-white shadow-sm ${isMain ? 'min-h-[120px]' : 'min-h-[100px]'}`}>
      <div className={`flex items-center justify-between ${isMain ? 'gap-3' : 'gap-2'}`}>
        <div className="flex-1">
          <div className={`font-semibold ${isMain ? 'text-lg' : 'text-base'}`}>{q.order_item?.name_snapshot} × {q.order_item?.qty}</div>
          {tableLabel && <div className={`${isMain ? 'text-sm' : 'text-xs'} opacity-70 mt-1`}>테이블 {tableLabel}</div>}
        </div>
        <span className={`${isMain ? 'text-sm' : 'text-xs'} border rounded-full ${isMain ? 'px-3 py-1' : 'px-2 py-1'} bg-gray-100`}>{badge(q.status)}</span>
      </div>

      <div className={`${isMain ? 'mt-3' : 'mt-2'} grid grid-cols-3 ${isMain ? 'gap-3' : 'gap-2'}`}>
        <button onClick={toInProgress} disabled={q.status!=='queued' || loadingInProgress} className={`${isMain ? 'px-4 py-2' : 'px-3 py-1.5'} border-2 border-blue-500 rounded-lg ${isMain ? 'text-sm' : 'text-xs'} font-medium bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed`}>{loadingInProgress ? '처리중...' : '조리시작'}</button>
        <button onClick={toDone} disabled={q.status!=='in_progress' || loadingDone} className={`${isMain ? 'px-4 py-2' : 'px-3 py-1.5'} border-2 border-green-500 rounded-lg ${isMain ? 'text-sm' : 'text-xs'} font-medium bg-green-50 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed`}>{loadingDone ? '처리중...' : '완료'}</button>
        <button onClick={toServed} disabled={q.status!=='done' || loadingServed} className={`${isMain ? 'px-4 py-2' : 'px-3 py-1.5'} border-2 border-purple-500 rounded-lg ${isMain ? 'text-sm' : 'text-xs'} font-medium bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed`}>{loadingServed ? '처리중...' : '서빙완료'}</button>
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
