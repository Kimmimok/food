// @ts-nocheck
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo } from 'react'

type Cat = { id: string; name: string }

export default function CategoryTabs({ categories }: { categories: Cat[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get('cat') ?? 'all'

  const tabs = useMemo(() => [{ id: 'all', name: '전체' }, ...categories], [categories])

  const go = (id: string) => {
    const sp = new URLSearchParams(params as any)
    if (id === 'all') sp.delete('cat')
    else sp.set('cat', id)
    router.push(`/menu?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => go(t.id)}
          className={`px-3 py-1 rounded-full border text-sm ${current === t.id ? 'bg-black text-white border-black' : 'hover:bg-muted'}`}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
