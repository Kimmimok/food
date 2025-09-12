// @ts-nocheck
'use client'

import { useState } from 'react'
import { payOrder } from '@/app/cashier/actions'

type Order = {
  id: string
  table_id: string
  total: number
  status: string
  dining_table?: { label: string }
  order_item?: Array<{
    id: string
    name_snapshot: string
    qty: number
    price?: number
    price_snapshot?: number
    status: string
    menu_item?: { name: string; price: number }
  }>
  created_at?: string
}

export default function CashierPanel({ orders }: { orders: Order[] }) {
  const safeOrders = orders || []
  // 총합이 0인 주문은 표시하지 않음
  // DB의 o.total이 없으면 order_item에서 합계를 계산하여 판단
  const visibleOrders = safeOrders.filter(o => {
    const itemsList = o.order_item || o.items || []
    const calculated = itemsList.reduce((sum: number, item: any) => {
      const unitPrice = Number(item.price ?? item.price_snapshot ?? item.unit_price ?? item.menu_item?.price ?? 0) || 0
      const qty = Number(item.qty ?? item.quantity ?? 0) || 0
      return sum + unitPrice * qty
    }, 0)
    const total = Number(o.total ?? calculated) || 0
    return total > 0
  })
  const [method, setMethod] = useState<'cash' | 'card'>('card')
  const [amount, setAmount] = useState('')
  // 기본적으로 모든 주문의 세부 내역을 펼쳐서 표시합니다
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(() => new Set((visibleOrders || []).map((o: any) => o.id)))

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const handlePay = async (orderId: string, total: number) => {
    const amt = Number(amount || total)
    if (isNaN(amt) || amt <= 0) {
      alert('결제 금액을 입력하세요.')
      return
    }
    await payOrder({ orderId, method, amount: amt })
    alert('결제 완료!')
  }

  return (
    <div>
      {visibleOrders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleOrders.map(o => {
        const isExpanded = expandedOrders.has(o.id)
        // 계산된 합계: DB의 o.total이 없으면 order_item 또는 items에서 합계 계산
        const itemsList = o.order_item || o.items || []
        const calculatedTotal = itemsList.reduce((sum: number, item: any) => {
          const unitPrice = Number(item.price ?? item.price_snapshot ?? item.unit_price ?? item.menu_item?.price ?? 0) || 0
          const qty = Number(item.qty ?? item.quantity ?? 0) || 0
          return sum + unitPrice * qty
        }, 0)
        const totalAmount = Number(o.total ?? calculatedTotal)
        
        return (
            <div key={o.id} className="border rounded-xl p-4 bg-white">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">테이블 {o.dining_table?.label ?? ''}</div>
                  <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{o.status}</div>
                </div>
                <div className="text-sm text-gray-600">
                  주문 시간: {new Date(o.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">₩ {totalAmount.toLocaleString()}</div>
                <div className="text-sm text-gray-500">합계 금액</div>
              </div>
            </div>

            {/* 세부 내역 토글 버튼 */}
            <div className="mb-3">
              <button
                onClick={() => toggleExpanded(o.id)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {isExpanded ? '▼' : '▶'} 세부 내역 {o.order_item?.length ?? 0}개 항목
              </button>
            </div>

            {/* 세부 내역 */}
            {isExpanded && (o.order_item || o.items) && (o.order_item || o.items).length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                    {(o.order_item || o.items).map(item => {
                      const unitPrice = Number(item.price ?? item.price_snapshot ?? item.unit_price ?? item.menu_item?.price ?? 0) || 0
                      const qty = Number(item.qty ?? item.quantity ?? 0) || 0
                      return (
                        <div key={item.id ?? item.name_snapshot} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <span className="font-medium">{item.name_snapshot ?? item.name}</span>
                            <span className="text-gray-500 ml-2">× {qty}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">₩ {(unitPrice * qty).toLocaleString()}</span>
                            <span className="text-gray-500 ml-2">(₩ {unitPrice.toLocaleString()} × {qty})</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
                <div className="border-t mt-3 pt-2 flex justify-between font-semibold">
                  <span>총 합계</span>
                  <span>₩ {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* 결제 영역 */}
            <div className="flex flex-wrap gap-3 items-center pt-3 border-t">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">결제 방식:</label>
                <select 
                  value={method} 
                  onChange={e => setMethod(e.target.value as any)} 
                  className="border rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="cash">현금</option>
                  <option value="card">카드</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">결제 금액:</label>
                <input
                  value={amount || totalAmount.toString()}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="금액"
                  inputMode="decimal"
                  className="border rounded px-3 py-2 text-sm w-32"
                />
                <span className="text-sm text-gray-500">원</span>
              </div>
              
              <button
                onClick={() => handlePay(o.id, totalAmount)}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                결제 완료
              </button>
            </div>
            </div>
          )
        })}
        </div>
  ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">💳</div>
          <p className="text-gray-500">결제 대기중인 주문이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
