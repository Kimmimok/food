"use client"
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    QRCode.toDataURL(value, { width: size })
      .then(url => { if (mounted) setSrc(url) })
      .catch(() => { if (mounted) setSrc(null) })
    return () => { mounted = false }
  }, [value, size])

  if (!src) return <div className="w-full h-full grid place-items-center">QR 생성중...</div>
  return <img src={src} alt="qr" width={size} height={size} className="block" />
}
