"use client"
import QrCode from './QrCode'

export default function QrClient({ url, size = 180 }: { url: string; size?: number }) {
  return (
    <div className="p-2">
      {url ? (
        <QrCode value={url} size={size} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 border rounded px-4 py-6">숨김</div>
      )}
    </div>
  )
}
