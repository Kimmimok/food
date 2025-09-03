// @ts-nocheck
'use client'

import { useEffect, useMemo, useOptimistic, useState, startTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { toggleSoldOut, upsertMenuItem, deleteMenuItem, reorderMenuItems, setMenuItemImage } from '@/app/menu/actions'
import ItemCard from '@/components/ItemCard'
import { supabase } from '@/lib/supabase-client'

type Category = { id: string; name: string; sort_order: number }
type Item = {
  id: string
  name: string
  price: number
  category_id: string | null
  is_sold_out: boolean
  sort_order: number
  image_url?: string | null
}

export default function MenuList({
  categories,
  initialItems
}: {
  categories: Category[]
  initialItems: Item[]
}) {
  const [role, setRole] = useState<'guest'|'member'|'manager'|'admin'>('guest')
  useEffect(() => {
    const client = supabase()
    client.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null
      if (!user) return setRole('guest')
      // fetch profile role (if exists)
      client.from('user_profile').select('role').eq('id', user.id).maybeSingle().then(({ data: p }) => {
        setRole((p?.role as any) ?? 'member')
      }).catch(() => setRole('member'))
    })
  }, [])
  const params = useSearchParams()
  const currentCat = params.get('cat') ?? 'all'

  // Realtime & 낙관적 상태
  const [items, setItems] = useState<Item[]>(initialItems)
  const [optimisticItems, setOptimisticItems] = useOptimistic(items)

  // 검색어
  const [q, setQ] = useState('')

  // Realtime: menu_item 변경 구독
  useEffect(() => {
    const client = supabase()
    const channel = client
      .channel('menu_item_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_item' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            const next = [payload.new as Item, ...prev]
            return next.sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          })
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(it => it.id === (payload.new as Item).id ? (payload.new as Item) : it))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(it => it.id !== (payload.old as Item).id))
        }
      })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [])

  // 카테고리/검색 필터
  const filtered = useMemo(() => {
    let rows = (optimisticItems ?? items)
    if (currentCat !== 'all') rows = rows.filter(r => r.category_id === currentCat)
    if (q.trim()) {
      const qq = q.toLowerCase()
      rows = rows.filter(r => r.name.toLowerCase().includes(qq))
    }
    return rows.sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [optimisticItems, items, currentCat, q])

  // 품절 토글(낙관적)
  const onToggle = async (id: string, next: boolean) => {
    // Capture the previous snapshot so we can roll back exactly if needed
    const prevSnapshot = (optimisticItems ?? items).map(i => ({ ...i }))

    // Optimistic update (immediate UI feedback)
    setOptimisticItems(prev => prev.map(i => i.id === id ? { ...i, is_sold_out: next } : i))

    try {
      await toggleSoldOut(id, next)
      // On success, update the canonical items list to keep both sources in sync
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_sold_out: next } : i))
      setOptimisticItems(prev => prev.map(i => i.id === id ? { ...i, is_sold_out: next } : i))
    } catch (err: any) {
      console.error('toggleSoldOut failed', err)
      // rollback to the captured snapshot for both optimistic and canonical lists
      setOptimisticItems(prevSnapshot)
      setItems(prevSnapshot)
      alert('품절 상태 변경 실패: ' + (err?.message ?? String(err)))
    }
  }

  // 신규/수정 저장
  const onSave = async (form: { id?: string; name: string; price: number; category_id?: string | null }) => {
    const res = await upsertMenuItem(form as any).catch(e => { alert(e.message); return null })
    return res
  }

  const onDelete = async (id: string) => {
    if (!confirm('이 메뉴를 삭제할까요?')) return

    // Capture previous snapshot to allow exact rollback
    const prevSnapshot = (optimisticItems ?? items).map(i => ({ ...i }))
    const filtered = prevSnapshot.filter(i => i.id !== id)

    // Optimistically remove from UI
    startTransition(() => {
      setOptimisticItems(filtered)
    })

    try {
      await deleteMenuItem(id)
      // On success, keep canonical items in sync
      setItems(filtered)
      setOptimisticItems(filtered)
    } catch (error: any) {
      console.error('deleteMenuItem failed', error)
      alert('삭제 실패: ' + (error?.message ?? String(error)))
      // Rollback both optimistic and canonical lists
      startTransition(() => {
        setOptimisticItems(prevSnapshot)
      })
      setItems(prevSnapshot)
    }
  }

  // 간단 정렬(위/아래)
  const move = (id: string, dir: -1 | 1) => {
    const arr = [...(optimisticItems ?? items)].sort((a,b)=> (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const idx = arr.findIndex(x => x.id === id)
    if (idx < 0) return
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= arr.length) return
    const a = arr[idx], b = arr[swapIdx]
    ;[a.sort_order, b.sort_order] = [b.sort_order ?? 0, a.sort_order ?? 0]
    setOptimisticItems(arr)
  }

  const persistOrder = async () => {
    const ordered = (optimisticItems ?? items)
      .map((it, i) => ({ id: it.id, sort_order: i }))
    await reorderMenuItems(ordered).catch(() => alert('정렬 저장 실패'))
  }

  // 신규 생성용 폼
  const [draft, setDraft] = useState<{ name: string; price: string; category_id: string | ''; image_url?: string | null }>(
    { name: '', price: '', category_id: '', image_url: null }
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="메뉴 검색"
            className="border rounded px-3 py-2 text-sm"
          />
          <button onClick={persistOrder} className="px-3 py-2 border rounded text-sm hover:bg-muted">
            정렬 저장
          </button>
        </div>

  { (role === 'manager' || role === 'admin') && (
  <form
          onSubmit={async (e) => {
            e.preventDefault()
            const priceNum = Number(draft.price)
            if (!draft.name || Number.isNaN(priceNum)) return alert('이름/가격을 확인하세요.')
            const result = await onSave({
              name: draft.name,
              price: priceNum,
              category_id: draft.category_id || null,
            })
            // 새 항목 생성 직후 image_url이 제공되면 바로 DB에 저장
            if (result?.id && draft.image_url) {
              try {
                await setMenuItemImage(result.id, draft.image_url)
              } catch (e:any) {
                alert('이미지 저장 실패: ' + e.message)
              }
            }
            setDraft({ name: '', price: '', category_id: '', file: null })
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={draft.name}
            onChange={e => setDraft(s => ({ ...s, name: e.target.value }))}
            placeholder="새 메뉴명"
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            value={draft.price}
            onChange={e => setDraft(s => ({ ...s, price: e.target.value }))}
            placeholder="가격"
            inputMode="decimal"
            className="border rounded px-3 py-2 text-sm w-28"
          />
          <select
            value={draft.category_id}
            onChange={e => setDraft(s => ({ ...s, category_id: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">카테고리(선택)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            value={draft.image_url ?? ''}
            onChange={e => setDraft(s => ({ ...s, image_url: e.target.value }))}
            placeholder="이미지 경로 (예: /images/menu1.png)"
            className="border rounded px-3 py-2 text-sm w-full"
          />
          <button className="px-3 py-2 rounded bg-black text-white text-sm">추가</button>
  </form>
  )}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(item => (
          <li key={item.id}>
            <ItemCard
              item={item}
              categories={categories}
              onToggleSoldOut={onToggle}
              onSave={async (form) => {
                const res = await onSave(form)
                return res
              }}
              onDelete={() => onDelete(item.id)}
              onMoveUp={() => move(item.id, -1)}
              onMoveDown={() => move(item.id, +1)}
            />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="text-sm opacity-70">표시할 메뉴가 없습니다.</p>
      )}
    </div>
  )
}
