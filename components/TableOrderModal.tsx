"use client"
import { useState, useEffect } from 'react'
import OrderBuilder from './orders/OrderBuilder'
import OrderItemsPanel from './orders/OrderItemsPanel'

export default function TableOrderModal({ tableId, label }: { tableId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/tables/${encodeURIComponent(tableId)}/admin-data`).then(r => r.json()).then(d => {
      setData(d)
    }).catch(() => setData(null)).finally(()=>setLoading(false))
  }, [open, tableId])

  return (
    <div className="flex justify-end">
      <button onClick={()=>{ setOpen(true) }} className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base font-medium">
        주문
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden text-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div className="text-2xl font-extrabold">{(() => { const n = String(label || ''); return /^\d+$/.test(n) ? `${n}번 테이블` : n })()}</div>
                </div>
              </div>
              <div>
                <button onClick={()=>setOpen(false)} className="text-gray-500">닫기</button>
              </div>
            </div>

            <div className="h-[70vh] overflow-hidden">
              {loading && <div className="p-6 text-center">로딩 중...</div>}
              {!loading && data && (
                // Desktop: 3-column layout where OrderItemsPanel takes 1 column and OrderBuilder takes 2 columns
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                  <div className="h-full overflow-auto col-span-1">
                    <OrderItemsPanel orderId={data.orderId} />
                  </div>
                  <div className="h-full overflow-auto col-span-2">
                    <OrderBuilder orderId={data.orderId} categories={data.categories} items={data.items} />
                  </div>
                </div>
              )}
              {!loading && !data && <div className="p-6 text-center text-red-600">데이터를 불러올 수 없습니다.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
