"use client"
import QrCode from './QrCode'

export default function QrClient({ url, size = 180 }: { url: string; size?: number }) {
  return (
    <div className="p-2">
      <QrCode value={url} size={size} />
    </div>
  )
}
