// @ts-nocheck
"use client"

import { useState } from 'react'
import NextImage from 'next/image'
import { setMenuItemImage } from '@/app/menu/actions'

type Category = { id: string; name: string }
type Item = {
  id: string
  name: string
  price: number
  category_id: string | null
  is_sold_out: boolean
  image_url?: string | null
}

export default function ItemCard({
  item,
  categories,
  onToggleSoldOut,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: Item
  categories: Category[]
  onToggleSoldOut: (id: string, next: boolean) => Promise<void> | void
  onSave: (form: { id: string; name: string; price: number; category_id?: string | null }) => Promise<void> | void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [categoryId, setCategoryId] = useState(item.category_id ?? '')
  const [img, setImg] = useState<string | null>(item.image_url ?? null)

  const removeImage = async () => {
    try {
      await setMenuItemImage(item.id, null)
      setImg(null)
    } catch (e:any) {
      alert('이미지 제거 실패: ' + e.message)
    }
  }

  const applyImageUrl = async () => {
    try {
      // img may be null or string; if empty string treat as null
      const url = img && img.trim() !== '' ? img : null
      await setMenuItemImage(item.id, url)
      setImg(url)
      alert('이미지 경로가 저장되었습니다.')
    } catch (e:any) {
      console.error('applyImageUrl failed', e)
      alert('이미지 저장 실패: ' + (e?.message ?? String(e)))
    }
  }

  const commit = async () => {
    const priceNum = Number(price)
    if (!name || Number.isNaN(priceNum)) return alert('이름/가격을 확인하세요.')
    await onSave({ id: item.id, name, price: priceNum, category_id: categoryId || null, image_url: img ?? null } as any)
    setEditing(false)
  }

  return (
    <div className={`rounded-xl border p-3 h-full flex flex-col ${item.is_sold_out ? 'opacity-60' : ''}`}>
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm opacity-70">
                ₩ {item.price.toLocaleString()} · {categories.find(c=>c.id===item.category_id)?.name ?? '무카테고리'}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${item.is_sold_out ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600'}`}>
              {item.is_sold_out ? '품절' : '판매중'}
            </span>
          </div>

          {img && (
            <div className="mt-2 relative w-full h-36">
              <NextImage src={img} alt={item.name} fill className="object-cover rounded" sizes="(max-width: 768px) 100vw, 33vw" priority />
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => onToggleSoldOut(item.id, !item.is_sold_out)} className="px-3 py-2 rounded border text-sm hover:bg-muted">
              {item.is_sold_out ? '품절 해제' : '품절 처리'}
            </button>
            <button onClick={() => setEditing(true)} className="px-3 py-2 rounded border text-sm hover:bg-muted">
              수정
            </button>
            <button onClick={onMoveUp} className="px-3 py-2 rounded border text-sm hover:bg-muted">위로</button>
            <button onClick={onMoveDown} className="px-3 py-2 rounded border text-sm hover:bg-muted">아래로</button>
            <button onClick={onDelete} className="px-3 py-2 rounded border text-sm text-red-600 hover:bg-red-50 border-red-200 col-span-2">
              삭제
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            <input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal" className="w-full border rounded px-3 py-2 text-sm" />
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">무카테고리</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {img && (
              <div className="relative w-full h-36">
                <NextImage src={img} alt="preview" fill className="object-cover rounded" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                value={img ?? ''}
                onChange={e => setImg(e.target.value || null)}
                placeholder="이미지 경로 (예: /images/menu1.png)"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <button type="button" onClick={applyImageUrl} className="px-3 py-2 rounded border text-sm">적용</button>
              {img && <button type="button" onClick={removeImage} className="px-3 py-2 rounded border text-sm">사진 제거</button>}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={commit} className="px-3 py-2 rounded bg-black text-white text-sm">저장</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded border text-sm">취소</button>
          </div>
        </>
      )}
    </div>
  )
}
