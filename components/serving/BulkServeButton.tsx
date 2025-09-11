// @ts-nocheck
'use client'

import React from 'react'

export default function BulkServeButton({ station }: { station: string }){
  const [loading, setLoading] = React.useState(false)

  async function handleClick(){
    setLoading(true)
    try{
      const res = await fetch('/api/serving/bulk-serve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ station })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const ids: string[] = data.ids || []
      // dispatch client events for each id
      for (const id of ids) {
        window.dispatchEvent(new CustomEvent('serving:updated', { detail: { id, status: 'served' } }))
      }
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `서빙 ${ids.length}건 완료`, type: 'success' } }))
    }catch(err:any){
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: '일괄 서빙 실패: '+(err?.message||String(err)), type: 'error' } }))
    }finally{ setLoading(false) }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
      {loading? '처리중...' : '모두 완료'}
    </button>
  )
}
