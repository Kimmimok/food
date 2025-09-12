"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

type OrderItem = { name_snapshot: string; qty: number }

export default function TableCard({ table, order, onCleanComplete }: { table: any; order?: any | null; onCleanComplete?: (tableId: string) => void }) {
  const [roundedMinutes, setRoundedMinutes] = useState<number>(0)

  useEffect(() => {
    if (!order || !order.created_at || order.status === 'completed' || order.status === 'paid') {
      setRoundedMinutes(0)
      return
    }
    let mounted = true
    const created = new Date(order.created_at).getTime()

    function updateRounded() {
      const now = Date.now()
      const minutes = Math.floor((now - created) / 60000)
      const rounded = Math.floor(minutes / 10) * 10
      if (mounted) setRoundedMinutes(rounded)
    }

    // initial update
    updateRounded()

    // compute ms until next 10-min boundary
    const now = Date.now()
    const minutes = Math.floor((now - created) / 60000)
    const nextBoundaryMinutes = (Math.floor(minutes / 10) + 1) * 10
    const msUntilNext = nextBoundaryMinutes * 60000 - (now - created)

    const t1 = setTimeout(() => {
      updateRounded()
      // then every 10 minutes
      const iv = setInterval(updateRounded, 10 * 60 * 1000)
      // store interval id on window to clear on unmount
      ;(window as any).__tablecard_iv = iv
    }, Math.max(0, msUntilNext))

    return () => {
      mounted = false
      clearTimeout(t1)
      const iv = (window as any).__tablecard_iv
      if (iv) clearInterval(iv)
    }
  }, [order?.created_at, order?.status])

  return (
    <div className={`rounded-lg border-2 p-4 flex flex-col bg-white ${getOrderStatusStyle(order?.status)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-lg">{table.label}</div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeStyle(table.status || 'empty')}`}>
          {getStatusLabel(table.status || 'empty')}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-3">최대 {table.capacity ?? 4}명</div>

  {order && table.status === 'seated' ? (
        <div className="text-sm text-gray-700 space-y-2">
          <div>주문시간: {new Date(order.created_at).toLocaleString()}</div>
          {order.status === 'completed' || order.status === 'paid' ? (
            <div className="text-green-600 font-medium">식사 완료됨</div>
          ) : (
            <div>식사시간(10분 단위): {roundedMinutes}분</div>
          )}
          <div className="pt-2">
            <div className="text-xs text-gray-500">주문메뉴</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {order.items && order.items.length > 0 ? order.items.map((it: OrderItem, i: number) => (
                <li key={i}>{it.name_snapshot} × {it.qty}</li>
              )) : <li className="text-gray-400">항목 없음</li>}
            </ul>
          </div>
        </div>
  ) : table.status === 'dirty' ? (
        <div className="text-sm text-yellow-700 space-y-2">
          <div className="text-yellow-600 font-medium">🧹 정리 필요</div>
          <div>결제가 완료되어 테이블 정리가 필요합니다.</div>
          <div className="text-xs text-gray-500 mt-2">새로고침 시 사용 가능 상태로 전환됩니다.</div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">현재 오픈된 주문이 없습니다</div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {table.status === 'dirty' && onCleanComplete ? (
          <button
            onClick={() => onCleanComplete(table.id)}
            className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
          >
            <span aria-hidden>✅</span>
            <span>정리완료</span>
          </button>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-400 text-gray-200 rounded cursor-not-allowed text-xs font-medium"
          >
            <span aria-hidden>🔍</span>
            <span>상세</span>
          </button>
        )}
      </div>
    </div>
  )
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'seated': return 'bg-green-100 text-green-800'
    case 'dirty': return 'bg-yellow-100 text-yellow-800'
    case 'reserved': return 'bg-blue-100 text-blue-800'
    case 'empty': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getOrderStatusStyle(status?: string) {
  switch (status) {
    case 'completed':
    case 'paid':
      return 'border-green-300 bg-green-50'
    case 'sent_to_kitchen':
      return 'border-blue-300 bg-blue-50'
    case 'open':
      return 'border-yellow-300 bg-yellow-50'
    default:
      return 'border-gray-300 bg-white'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'seated': return '사용중'
    case 'dirty': return '정리 필요'
    case 'reserved': return '예약됨'
    case 'empty': return '사용 가능'
    default: return '사용 가능'
  }
}
