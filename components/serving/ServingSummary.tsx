// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'

export default function ServingSummary({ initial = 0 }:{ initial:number }){
  const [count, setCount] = useState<number>(initial)
  const seen = useRef<Set<string>>(new Set())

  useEffect(()=>{
    function onUpdate(e:any){
      const { id, status } = e.detail || {}
      if (!id) return
      if (status !== 'served') return
      if (seen.current.has(id)) return
      seen.current.add(id)
      setCount(c => c + 1)
    }
    window.addEventListener('serving:updated', onUpdate)
    return () => window.removeEventListener('serving:updated', onUpdate)
  }, [])

  return (
    <div className="text-center">
      <div className="text-sm text-gray-500">서빙완료</div>
      <div className="text-2xl font-bold mt-2">{count}</div>
      <div className="text-sm text-gray-500 mt-2">서빙 완료된 항목은 목록에서 사라집니다</div>
    </div>
  )
}
