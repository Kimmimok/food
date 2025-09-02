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
    <div className="space-y-3">
      <div className="text-sm font-medium">카트</div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">아직 담긴 항목이 없습니다</div>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.menuItemId} className="flex items-center justify-between border rounded p-2">
              <div>
                <div className="text-sm">{it.name}</div>
                <div className="text-xs text-gray-500">수량: <input type="number" value={String(it.qty)} onChange={(e:any)=>updateQty(it.menuItemId, Number(e.target.value)||1)} className="w-16 inline-block border rounded px-1 py-0.5 text-xs" /></div>
              </div>
              <div className="flex items-center space-x-2">
                <button type="button" onClick={()=>remove(it.menuItemId)} className="text-xs px-2 py-1 border rounded">삭제</button>
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  )
}
