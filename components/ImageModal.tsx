"use client"
import { useEffect } from 'react'

export default function ImageModal({ src, onClose }: { src?: string | null, onClose: ()=>void }) {
  useEffect(()=>{
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!src) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
      <img src={src} alt="preview" className="max-w-full max-h-full rounded" />
    </div>
  )
}
