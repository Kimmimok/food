"use client"
import React, { useState } from 'react'
import ImageModal from '@/components/ImageModal'

export default function MenuGridClient({ items }: any) {
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const filtered = items.filter((m: any) => m.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <div className="mb-3">
        <input placeholder="메뉴 검색" value={query} onChange={e=>setQuery(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {filtered.map((m: any) => (
          <li key={m.id} className="rounded-lg border p-2 flex flex-col">
            {m.image_url && (
              <img src={m.image_url} alt={m.name} className="w-full h-28 object-cover rounded cursor-pointer" onClick={()=>setPreview(m.image_url)} />
            )}
            <div className="mt-2 text-sm font-medium">{m.name}</div>
            <div className="text-xs opacity-70 mb-2">₩ {m.price.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-auto">
              <select data-menu-id={m.id} defaultValue={1} className="qty-select border rounded px-2 py-1 text-sm">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button type="button" data-menu-id={m.id} data-menu-name={m.name} className="add-to-cart flex-1 px-2 py-1 rounded bg-black text-white text-sm">담기</button>
            </div>
          </li>
        ))}
      </ul>
      <ImageModal src={preview} onClose={()=>setPreview(null)} />
    </div>
  )
}
