"use client"
import React from 'react'
import MenuGrid from '@/components/MenuGridClient'

function getCategoryIdByName(categories: any[], names: string[]) {
  // 실제 데이터베이스의 category_id를 직접 사용
  const categoryMap: Record<string, string> = {
    '면류': '2c4d2466-fe19-40b7-8706-da93807e51a7',
    '볶음': '329d54d7-9fae-45e0-8d0e-a16820460e2c',
    '음료': 'd4306eec-af54-4c3e-b08d-ff01fae037cd',
    '주류': '7abf5bd3-a903-4939-bae1-01d653089e9b'
  };

  for (const name of names) {
    if (categoryMap[name]) {
      return categoryMap[name];
    }
  }

  return 'all';
}

function isActive(categories: any[], names: string[], activeCategory: string) {
  const id = getCategoryIdByName(categories, names)
  return activeCategory === id
}

function OrderHistoryModal({ cart, setCart, isOpen, onClose, tableId, onCompleted }: { cart: any[], setCart: React.Dispatch<React.SetStateAction<any[]>>, isOpen: boolean, onClose: () => void, tableId: string, onCompleted?: () => void }) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isCompleted, setIsCompleted] = React.useState(false)

  const handleOrder = async () => {
    if (isSubmitting || isCompleted || cart.length === 0) return

    console.log('OrderHistoryModal handleOrder:', { tableId, cart })

    // tableId가 undefined인 경우 처리
    if (!tableId) {
      alert('테이블 정보가 없습니다. 페이지를 새로고침해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      // cart 아이템 구조 변환: {id, quantity} -> {menuItemId, qty}
      const transformedItems = cart.map(item => ({
        menuItemId: item.id,
        qty: item.quantity
      }))

      console.log('Transformed items:', transformedItems)

      const response = await fetch('/api/order/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: transformedItems, tableId })
      })

      if (response.ok) {
        setIsCompleted(true)
        // 장바구니 비우기
        window.dispatchEvent(new CustomEvent('cart:update', { detail: [] }))
        // 성공 메시지
        alert('주문이 접수되었습니다!')
        try {
          // 세션 잠금: 이 탭에서는 QR 재스캔 전까지 재주문 불가
          sessionStorage.setItem(`order-locked:${tableId}`, '1')
        } catch {}
        if (onCompleted) onCompleted()
        onClose()
      } else {
        const errorText = await response.text()
        console.error('Order failed:', errorText)
        alert('주문 실패: ' + errorText)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">주문 내역</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">🍽️</div>
              <p className="text-gray-500">아직 선택한 메뉴가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item: any) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <button
                      onClick={() => {
                        if (isSubmitting) return
                        setCart((prev: any[]) => prev.filter(i => i.id !== item.id))
                      }}
                      className="ml-auto px-2 py-1 border rounded text-sm text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">총 금액</span>
                  <span className="font-bold text-blue-900 text-lg">
                    ₩{cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleOrder}
              disabled={isSubmitting || isCompleted}
              className={`w-full py-4 px-6 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                isCompleted
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : isSubmitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white active:scale-95'
              }`}
            >
              {isCompleted ? '✅ 주문완료' : isSubmitting ? '⏳ 주문 처리중...' : '🛒 주문하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientOrderPanel({ tableId, items, categories = [] }: any) {
  const [activeCategory, setActiveCategory] = React.useState<string>('all')
  const [cart, setCart] = React.useState<any[]>([])
  const [showOrderHistory, setShowOrderHistory] = React.useState<boolean>(false)
  const [locked, setLocked] = React.useState<boolean>(false)



  React.useEffect(() => {
    // 세션 잠금 상태 확인
    try {
      const v = sessionStorage.getItem(`order-locked:${tableId}`)
      setLocked(v === '1')
    } catch {}

    function handleToggleOrderHistory() {
      setShowOrderHistory(prev => !prev)
    }

    window.addEventListener('toggle-order-history', handleToggleOrderHistory)
    return () => window.removeEventListener('toggle-order-history', handleToggleOrderHistory)
  }, [])

  return (
  <>
      <div className="space-y-6 py-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">메뉴 선택</h3>
          <div className="flex gap-2">
            <button type="button" disabled={locked} onClick={() => setActiveCategory(getCategoryIdByName(categories, ['면류','볶음']))} className={`px-3 py-2 rounded-full border ${isActive(categories,['면류','볶음'], activeCategory) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>식사</button>
            <button type="button" disabled={locked} onClick={() => setActiveCategory(getCategoryIdByName(categories, ['볶음']))} className={`px-3 py-2 rounded-full border ${isActive(categories,['볶음'], activeCategory) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>안주</button>
            <button type="button" disabled={locked} onClick={() => setActiveCategory(getCategoryIdByName(categories, ['주류']))} className={`px-3 py-2 rounded-full border ${isActive(categories,['주류'], activeCategory) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>주류</button>
            <button type="button" disabled={locked} onClick={() => setActiveCategory(getCategoryIdByName(categories, ['음료']))} className={`px-3 py-2 rounded-full border ${isActive(categories,['음료'], activeCategory) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>음료</button>
            <button type="button" disabled={locked} onClick={() => setActiveCategory('all')} className={`px-3 py-2 rounded-full border ${activeCategory==='all' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>전체</button>
          </div>
        </div>
  <MenuGrid items={items} activeCategory={activeCategory} cart={cart} setCart={setCart} categories={categories} locked={locked} />
      {locked && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl">
          주문이 완료되었습니다. 다시 QR을 스캔하면 새 주문이 가능합니다.
        </div>
      )}
      </div>
      <OrderHistoryModal
        cart={cart}
        setCart={setCart}
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        tableId={tableId}
        onCompleted={() => setLocked(true)}
      />
    </>
  )
}
