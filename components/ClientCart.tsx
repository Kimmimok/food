"use client"
import { useEffect, useState } from 'react'

export default function ClientCart({ initialItems = [], tableId }: { initialItems?: Array<any>, tableId: string }) {
  const [items, setItems] = useState<Array<{ menuItemId: string; name: string; qty: number }>>(initialItems)

  useEffect(() => {
    function onUpdate(e: any) {
      setItems(Array.isArray(e.detail) ? e.detail : [])
    }
    window.addEventListener('cart:update', onUpdate as EventListener)
    return () => window.removeEventListener('cart:update', onUpdate as EventListener)
  }, [])

  function updateQty(menuItemId: string, qty: number) {
    setItems(prev => prev.map(p => p.menuItemId === menuItemId ? { ...p, qty } : p))
  }

  function remove(menuItemId: string) {
    setItems(prev => prev.filter(p => p.menuItemId !== menuItemId))
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🛒 주문 내역
        </h3>
        {items.length > 0 && (
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
            {items.length}개 항목
          </span>
        )}
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🍽️</div>
          <p className="text-gray-500">아직 선택한 메뉴가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">위에서 메뉴를 선택해주세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <div key={it.menuItemId} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-base">{it.name}</h4>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm text-gray-600 px-3 py-1">수량</label>
                      <input 
                        type="number" 
                        value={String(it.qty)} 
                        onChange={(e:any)=>updateQty(it.menuItemId, Math.max(1, Number(e.target.value)||1))} 
                        className="w-16 bg-transparent border-none outline-none px-2 py-1 text-center font-medium" 
                        min="1"
                        max="10"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={()=>remove(it.menuItemId)} 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors duration-200 text-sm font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Total Summary */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-medium">총 {items.reduce((sum, item) => sum + item.qty, 0)}개 항목</span>
              <span className="text-blue-900 text-sm">주문 준비 완료</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
