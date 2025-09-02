"use client"
import React from 'react'
import MenuGrid from '@/components/MenuGridClient'

function CategoryTabs({ categories, activeCategory, onCategoryChange }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">카테고리</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors duration-200 active:scale-95 ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
          }`}
        >
          전체
        </button>
        {categories.map((c: any) => (
          <button
            key={c.id}
            onClick={() => onCategoryChange(c.id)}
            className={`px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors duration-200 active:scale-95 ${
              activeCategory === c.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderHistoryModal({ cart, isOpen, onClose }: { cart: any[], isOpen: boolean, onClose: () => void }) {
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
      </div>
    </div>
  )
}

export default function ClientOrderPanel({ tableId, categories, items }: any) {
  const [activeCategory, setActiveCategory] = React.useState<string>('all')
  const [cart, setCart] = React.useState<any[]>([])
  const [showOrderHistory, setShowOrderHistory] = React.useState<boolean>(false)

  React.useEffect(() => {
    function handleToggleOrderHistory() {
      setShowOrderHistory(prev => !prev)
    }

    window.addEventListener('toggle-order-history', handleToggleOrderHistory)
    return () => window.removeEventListener('toggle-order-history', handleToggleOrderHistory)
  }, [])

  return (
    <>
      <div className="space-y-6 py-6">
        <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        <MenuGrid items={items} activeCategory={activeCategory} cart={cart} setCart={setCart} />
      </div>

      <OrderHistoryModal
        cart={cart}
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
      />
    </>
  )
}
