"use client"
import { useState, useEffect, useRef } from 'react'
import { addWait } from '@/app/waitlist/actions'
import { supabase } from '@/lib/supabase-client'

export default function CustomerWaitlistForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [size, setSize] = useState(2)
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [waiters, setWaiters] = useState<Array<any>>([])
  const [myPosition, setMyPosition] = useState<number | null>(null)
  const [calledMsgShown, setCalledMsgShown] = useState(false)
  const prevMyStatus = useRef<string | null>(null)
  const [locked, setLocked] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (locked) {
      setError('이미 대기 신청이 완료되었습니다. 다시 QR을 스캔해 새로 신청해 주세요.')
      return
    }
    if (!name.trim()) {
      setError('고객명을 입력해 주세요')
      return
    }
    if (!size || Number(size) < 1) {
      setError('인원 수를 입력해 주세요')
      return
    }
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await addWait({ name: name.trim(), phone: phone.trim() || undefined, size: Number(size) || 1, note: note.trim() || undefined })
      setSuccess('대기 신청이 접수되었습니다. 잠시만 기다려 주세요.')
  try { sessionStorage.setItem('waitlist-locked', '1') } catch {}
  setLocked(true)
      setName('')
      setPhone('')
      setSize(2)
      setNote('')
    } catch (e: any) {
      setError(e?.message || '대기 신청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // reusable fetcher so we can trigger manual refresh
  async function fetchWaiters() {
    try {
      const client = supabase()
      const { data } = await client.from('waitlist').select('*').in('status', ['waiting','called']).order('created_at', { ascending: true })
      setWaiters(data || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let mounted = true
    const client = supabase()

    // 세션 잠금 상태 확인
    try {
      const v = sessionStorage.getItem('waitlist-locked')
      if (mounted) setLocked(v === '1')
    } catch {}

    async function load() {
      try {
        const { data } = await client.from('waitlist').select('*').in('status', ['waiting','called'])
        if (!mounted) return
        const rows = data || []
        // sort: called first, then waiting; within group sort by created_at asc
        rows.sort((a, b) => {
          if (a.status === b.status) return a.created_at.localeCompare(b.created_at)
          if (a.status === 'called') return -1
          if (b.status === 'called') return 1
          return a.created_at.localeCompare(b.created_at)
        })
        setWaiters(rows)
      } catch {
        // ignore
      }
    }

  load()

  // Fallback polling in case realtime events are not delivered reliably for guests
  const pollId = setInterval(load, 10000)

  // Realtime subscription to reflect inserts/updates/deletes immediately
    const ch = client
      .channel('waitlist_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, (payload) => {
        if (!mounted) return
        if (payload.eventType === 'INSERT') {
          const row = payload.new
          if (['waiting','called'].includes(row.status)) {
            setWaiters(prev => {
              const next = [...prev, row]
              next.sort((a, b) => {
                if (a.status === b.status) return a.created_at.localeCompare(b.created_at)
                if (a.status === 'called') return -1
                if (b.status === 'called') return 1
                return a.created_at.localeCompare(b.created_at)
              })
              return next
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new
          setWaiters(prev => {
            let next = prev.map(r => r.id === row.id ? row : r)
            next = next.filter(r => ['waiting','called'].includes(r.status))
            next.sort((a, b) => {
              if (a.status === b.status) return a.created_at.localeCompare(b.created_at)
              if (a.status === 'called') return -1
              if (b.status === 'called') return 1
              return a.created_at.localeCompare(b.created_at)
            })
            return next
          })
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old
          setWaiters(prev => prev.filter(r => r.id !== row.id))
        }
      })
      .subscribe()

  return () => { mounted = false; clearInterval(pollId); client.removeChannel(ch) }
  }, [])

  useEffect(() => {
    // if user just submitted, we can't identify them by auth; instead match by recent name+phone
    // compute approximate position if name matches last submitted name
    if (!waiters.length) {
      setMyPosition(null)
      return
    }
    const idx = waiters.findIndex(w => w.name === name && (phone ? (w.phone || '') === phone : true))
    setMyPosition(idx >= 0 ? idx + 1 : null)
  }, [waiters, name, phone])

  // show a visible notification if this guest's wait row becomes 'called'
  useEffect(() => {
    if (!waiters.length) return
    const my = waiters.find(w => w.name === name && (phone ? (w.phone || '') === phone : true))
    const status = my?.status ?? null
    if (status === 'called' && prevMyStatus.current !== 'called') {
      // show one-time alert (and banner is rendered below)
      try { window.alert('호출되었습니다: 매장으로 빠르게 와 주세요.'); } catch {}
      setCalledMsgShown(true)
    }
    prevMyStatus.current = status
  }, [waiters, name, phone])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {success && <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{success}</div>}
  {/* locked banner removed as requested */}
      {/* Called banner */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          {calledMsgShown && (
            <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-semibold">📢 매장 호출: 곧 입장해 주세요.</div>
          )}
        </div>
        {/* 새로고침 버튼 제거 - 상위 헤더에 이미 새로고침이 존재함 */}
      </div>
      {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1"><span className="mr-2">👤</span>고객명 *</label>
        <input
          type="text"
          value={name}
          onChange={e=>setName(e.target.value)}
          required
          placeholder="성함을 입력하세요"
          disabled={locked}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1"><span className="mr-2">📞</span>연락처</label>
        <input
          type="tel"
          value={phone}
          onChange={e=>setPhone(e.target.value)}
          placeholder="하이픈 없이 입력 (선택)"
          disabled={locked}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1"><span className="mr-2">👥</span>인원 *</label>
        <input
          type="number"
          min={1}
          max={32}
          value={size}
          onChange={e=>setSize(Number(e.target.value))}
          required
          disabled={locked}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1"><span className="mr-2">📝</span>요청사항</label>
        <textarea
          value={note}
          onChange={e=>setNote(e.target.value)}
          rows={3}
          placeholder="4명 이상 일때 자리분리 착석 가능 등"
          disabled={locked}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || locked}
        className="w-full py-3 rounded-md bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >{isSubmitting ? '신청 중...' : '대기 신청하기'}</button>
      
      {/* 현재 대기자 목록 & 본인 위치 */}
      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h4 className="text-sm font-semibold mb-2">현재 대기자</h4>
        {myPosition ? (
          <div className="mb-2 text-sm text-green-700">현재 귀하는 {myPosition}번째 대기중입니다.</div>
        ) : (
          <div className="mb-2 text-sm bg-yellow-100 text-black p-2 rounded">호출표시뒤 5분이내에 입장하지 않으시면 노쇼 처리하고 다음분에게 기회가 부여됩니다.</div>
        )}

        <div className="space-y-2 max-h-48 overflow-auto">
          {waiters.length === 0 && <div className="text-sm text-gray-500">현재 대기자가 없습니다.</div>}
          {waiters.map((w, i) => (
            <div key={w.id} className={`flex items-center justify-between text-sm border rounded p-2 ${w.status === 'called' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
              <div>
                <div className="font-medium">{i + 1}. {w.name} {w.status === 'called' && <span className="text-xs ml-2 px-2 py-0.5 bg-blue-600 text-white rounded-full">호출됨</span>}</div>
                <div className="text-xs text-gray-500">{w.size}명 · {w.phone || '-'}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date(w.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </form>
  )
}
