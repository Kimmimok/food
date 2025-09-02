"use client"
import React, { useState } from 'react'
import ImageModal from '@/components/ImageModal'

export default function MenuGridClient({ items, activeCategory, cart, setCart }: any) {
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const filtered = items
    .filter((m: any) => m.name.toLowerCase().includes(query.toLowerCase()))
    .filter((m: any) => activeCategory === 'all' || m.category_id === activeCategory)

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
      {/* Search Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">메뉴 선택</h3>
        <div className="relative">
          <input 
            placeholder="메뉴 검색..." 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="p-4">
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
                      data-menu-id={m.id} 
                      defaultValue={1} 
                      className="qty-select bg-transparent border-none outline-none px-3 py-2 text-base font-medium"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button 
                    type="button" 
                    data-menu-id={m.id} 
                    data-menu-name={m.name} 
                    onClick={() => {
                      const qtySelect = document.querySelector(`[data-menu-id="${m.id}"].qty-select`) as HTMLSelectElement
                      const quantity = parseInt(qtySelect?.value || '1')
                      addToCart(m, quantity)
                    }}
                    className="add-to-cart flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 text-base"
                  >
                    🛒 담기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ImageModal src={preview} onClose={()=>setPreview(null)} />
    </div>
  )
}
