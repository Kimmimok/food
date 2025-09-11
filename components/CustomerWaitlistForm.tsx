"use client"
import { useState, useTransition } from 'react'
import { addWait } from '@/app/waitlist/actions'

export default function CustomerWaitlistForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [size, setSize] = useState(2)
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!name.trim()) {
      setError('고객명을 입력해 주세요')
      return
    }
    startTransition(async () => {
      try {
        await addWait({ name: name.trim(), phone: phone.trim() || undefined, size: Number(size) || 1, note: note.trim() || undefined })
        setSuccess('대기 신청이 접수되었습니다. 잠시만 기다려 주세요.')
        setName('')
        setPhone('')
        setSize(2)
        setNote('')
      } catch (e: any) {
        setError(e?.message || '대기 신청 중 오류가 발생했습니다')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {success && <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{success}</div>}
      {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">고객명 *</label>
        <input
          type="text"
          value={name}
          onChange={e=>setName(e.target.value)}
          required
          placeholder="성함을 입력하세요"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
        <input
          type="tel"
          value={phone}
          onChange={e=>setPhone(e.target.value)}
          placeholder="하이픈 없이 입력 (선택)"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">인원</label>
        <input
          type="number"
          min={1}
          max={32}
          value={size}
          onChange={e=>setSize(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">요청사항</label>
        <textarea
          value={note}
          onChange={e=>setNote(e.target.value)}
          rows={3}
          placeholder="유아의자, 창가자리 등"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-md bg-blue-600 text-white font-semibold disabled:opacity-50"
      >{isPending ? '신청 중...' : '대기 신청하기'}</button>
    </form>
  )
}
