"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OrderTestClient() {
  const router = useRouter()
  const [id, setId] = useState('1')

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={id} onChange={e=>setId(e.target.value)} className="flex-1 border rounded px-3 py-2" />
        <button onClick={()=>router.push(`/order/${encodeURIComponent(id)}`)} className="px-4 py-2 bg-blue-600 text-white rounded">열기</button>
      </div>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={()=>router.push(`/order/${n}`)} className="px-3 py-2 border rounded">{`테이블 ${n}`}</button>
        ))}
      </div>
    </div>
  )
}
