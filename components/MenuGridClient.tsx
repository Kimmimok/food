"use client"
import React, { useMemo, useState } from 'react'
import ImageModal from '@/components/ImageModal'

export default function MenuGridClient({ items, activeCategory, cart, setCart, categories, locked = false }: any) {
  const [preview, setPreview] = useState<string | null>(null)
  const filtered = items
    .filter((m: any) => activeCategory === 'all' || (m.category_id ? String(m.category_id) : 'uncat') === String(activeCategory))

  // 카테고리별 그룹핑 (activeCategory === 'all' 일 때 사용)
  const grouped = useMemo(() => {
    const map: Record<string, { id: string; name: string; items: any[] }> = {}
    const catNameById: Record<string, string> = (categories ?? []).reduce((acc: any, c: any) => {
      acc[String(c.id)] = c.name
      return acc
    }, {})
    for (const it of filtered) {
      const catId = it.category_id ? String(it.category_id) : 'uncat'
      const catName = catNameById[catId] || '기타'
      if (!map[catId]) map[catId] = { id: catId, name: catName, items: [] }
      map[catId].items.push(it)
    }
    // 카테고리 순서: 전달받은 categories 순서 우선, 그 외(기타/미분류)는 마지막
    const ordered: Array<{ id: string; name: string; items: any[] }> = []
  const catIdsInOrder = (categories ?? []).map((c: any) => String(c.id))
    for (const cid of catIdsInOrder) {
      if (map[cid]) ordered.push(map[cid])
    }
    // 나머지(없음/미분류)
    for (const [cid, group] of Object.entries(map)) {
      if (!catIdsInOrder.includes(cid)) ordered.push(group)
    }
    return ordered
  }, [filtered, categories])

  const addToCart = (menuItem: any, quantity: number) => {
    const existingItem = cart.find((item: any) => item.id === menuItem.id)
    if (existingItem) {
      setCart(cart.map((item: any) => 
        item.id === menuItem.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
    } else {
      setCart([...cart, { ...menuItem, quantity }])
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">메뉴 선택</h3>
      </div>

      {/* Menu Grid (카테고리 구분 표시) */}
      <div className="p-4">
        {activeCategory === 'all' ? (
          <div className="space-y-8">
            {grouped.map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-lg font-bold text-gray-900">{group.name}</h4>
                  <span className="text-xs text-gray-500">{group.items.length}개</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map((m: any) => (
                    <div key={m.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      {m.image_url && (
                        <div className="relative h-40 bg-gray-200">
                          <img 
                            src={m.image_url} 
                            alt={m.name} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200" 
                            onClick={()=>setPreview(m.image_url)} 
                          />
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base leading-tight">{m.name}</h4>
                          <p className="text-xl font-bold text-blue-600 mt-1">₩{m.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white rounded-lg border border-gray-200">
                            <label className="text-sm text-gray-600 px-3 py-2">수량</label>
                            <select 
                              disabled={locked}
                              data-menu-id={m.id} 
                              defaultValue={1} 
                              className="qty-select bg-transparent border-none outline-none px-3 py-2 text-base font-medium"
                            >
                              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <button 
                            type="button" 
                            disabled={locked}
                            data-menu-id={m.id} 
                            data-menu-name={m.name} 
                            onClick={() => {
                              const qtySelect = document.querySelector(`[data-menu-id="${m.id}"].qty-select`) as HTMLSelectElement
                              const quantity = parseInt(qtySelect?.value || '1')
                              addToCart(m, quantity)
                            }}
                            className={`add-to-cart flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 text-base ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            🛒 담기
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((m: any) => (
              <div key={m.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200">
                {m.image_url && (
                  <div className="relative h-40 bg-gray-200">
                    <img 
                      src={m.image_url} 
                      alt={m.name} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200" 
                      onClick={()=>setPreview(m.image_url)} 
                    />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base leading-tight">{m.name}</h4>
                    <p className="text-xl font-bold text-blue-600 mt-1">₩{m.price.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border border-gray-200">
                      <label className="text-sm text-gray-600 px-3 py-2">수량</label>
                      <select 
                        disabled={locked}
                        data-menu-id={m.id} 
                        defaultValue={1} 
                        className="qty-select bg-transparent border-none outline-none px-3 py-2 text-base font-medium"
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <button 
                      type="button" 
                      disabled={locked}
                      data-menu-id={m.id} 
                      data-menu-name={m.name} 
                      onClick={() => {
                        const qtySelect = document.querySelector(`[data-menu-id="${m.id}"].qty-select`) as HTMLSelectElement
                        const quantity = parseInt(qtySelect?.value || '1')
                        addToCart(m, quantity)
                      }}
                      className={`add-to-cart flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 text-base ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      🛒 담기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ImageModal src={preview} onClose={()=>setPreview(null)} />
    </div>
  )
}
