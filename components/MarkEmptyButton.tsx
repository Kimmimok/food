"use client"

import { useState } from 'react'

export default function MarkEmptyButton({ tableId, onSuccess }: { tableId: string, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/tables/mark-empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      })
      const j = await res.json()
      if (j?.success) {
        onSuccess?.()
        // optimistic UI: refresh the page to ensure SSR paths are refreshed
        window.location.reload()
      } else {
        alert('정리 완료 실패: ' + (j?.error ?? '알 수 없음'))
      }
    } catch (err: any) {
      alert('정리 완료 중 오류: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? '진행중...' : '정리완료'}
    </button>
  )
}
