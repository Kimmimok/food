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
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative max-w-full max-h-full">
        <img src={src} alt="메뉴 이미지" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
          <p className="text-center font-medium">이미지를 확대하여 보고 있습니다</p>
          <p className="text-center text-sm opacity-75 mt-1">탭하여 닫기</p>
        </div>
      </div>
    </div>
  )
}
