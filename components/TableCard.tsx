"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

type OrderItem = { name_snapshot: string; qty: number }

export default function TableCard({ table, order }: { table: any; order?: any | null }) {
  const [roundedMinutes, setRoundedMinutes] = useState<number>(0)

  useEffect(() => {
    if (!order || !order.created_at) return
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
  }, [order?.created_at])

  return (
    <div className="rounded-lg border-2 p-4 flex flex-col bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-lg">{table.label}</div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeStyle(table.status)}`}>
          {getStatusLabel(table.status)}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-3">최대 {table.capacity ?? 4}명</div>

      {order ? (
        <div className="text-sm text-gray-700 space-y-2">
          <div>주문시간: {new Date(order.created_at).toLocaleString()}</div>
          <div>식사시간(10분 단위): {roundedMinutes}분</div>
          <div className="pt-2">
            <div className="text-xs text-gray-500">주문메뉴</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {order.items && order.items.length > 0 ? order.items.map((it: OrderItem, i: number) => (
                <li key={i}>{it.qty} × {it.name_snapshot}</li>
              )) : <li className="text-gray-400">항목 없음</li>}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">현재 오픈된 주문이 없습니다</div>
      )}

      <div className="mt-4 flex justify-end">
        <Link href={`/tables/${table.id}`} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium">
          <span aria-hidden>🔍</span>
          <span>상세</span>
        </Link>
      </div>
    </div>
  )
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'seated': return 'bg-green-100 text-green-800'
    case 'dirty': return 'bg-yellow-100 text-yellow-800'
    case 'reserved': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'seated': return '사용중'
    case 'dirty': return '정리 필요'
    case 'reserved': return '예약됨'
    default: return '사용 가능'
  }
}
