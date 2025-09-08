"use client"

import { useEffect, useState } from 'react'

export default function Toasts() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: string }>>([])

  useEffect(() => {
    function onNotify(e: any) {
      const id = Date.now()
      setToasts(t => [...t, { id, message: e.detail?.message || '알림', type: e.detail?.type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }
    window.addEventListener('notify', onNotify as EventListener)
    return () => window.removeEventListener('notify', onNotify as EventListener)
  }, [])

  return (
    <div className="fixed right-4 bottom-4 space-y-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className={`px-3 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
