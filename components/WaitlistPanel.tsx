// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { addWait, callWait, seatWait, cancelWait, noShowWait, expireCalled5, addReservation, confirmReservation, cancelReservation } from '@/app/waitlist/actions'

type Wait = {
  id: string
  name: string
  phone: string | null
  size: number
  status: 'waiting' | 'called' | 'seated' | 'canceled' | 'no_show'
  note: string | null
  created_at: string
  called_at: string | null
  seated_table_id: string | null
}
type Table = { id: string; label: string; capacity: number; status: string }

export default function WaitlistPanel({ initialRows, tables }: { initialRows: Wait[]; tables: Table[] }) {
  const [rows, setRows] = useState<Wait[]>(initialRows)
  const [draft, setDraft] = useState({ name: '', phone: '', size: '2', note: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState<'guest'|'member'|'manager'|'admin'>('guest')
  const tableMap = useMemo(() => Object.fromEntries(tables.map(t => [t.id, t.label])), [tables])
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [reservationDraft, setReservationDraft] = useState({
    name: '',
    phone: '',
    size: '2',
    reservationTime: '',
    duration: '120',
    specialRequest: '',
    depositAmount: '0'
  })

  const setPendingFlag = (id: string, v: boolean) => setPending((p) => ({ ...p, [id]: v }))

  // 즉시 반영용 재조회 함수 (실패/롤백 시 사용)
  const refetchWaitlist = async () => {
    try {
      const client = supabase()
      const { data } = await client
        .from('waitlist')
        .select('*')
        .in('status', ['waiting','called'])
        .order('created_at', { ascending: true })
      if (Array.isArray(data)) setRows(data as any)
    } catch (e) {
      console.error('refetchWaitlist error:', e)
    }
  }

  // Realtime: waitlist 변경
  useEffect(() => {
    const client = supabase()
    const ch = client
      .channel('waitlist_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Wait
          if (['waiting','called'].includes(row.status)) {
            setRows(prev => [...prev, row].sort((a,b)=> a.created_at.localeCompare(b.created_at)))
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Wait
          setRows(prev => {
            let next = prev.map(r => r.id === row.id ? row : r)
            // 목록 유지 규칙: waiting/called만 표시
            next = next.filter(r => ['waiting','called'].includes(r.status))
            return next.sort((a,b)=> a.created_at.localeCompare(b.created_at))
          })
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as Wait
          setRows(prev => prev.filter(r => r.id !== row.id))
        }
      })
      .subscribe()
    return () => { client.removeChannel(ch) }
  }, [])

  // 사용자 역할 확인 (매니저/어드민 여부)
  useEffect(() => {
    const client = supabase()
    client.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null
      if (!user) return setUserRole('guest')
      client.from('user_profile').select('role').eq('id', user.id).maybeSingle().then(({ data: p }) => {
        setUserRole((p?.role as any) ?? 'member')
      }).catch(() => setUserRole('member'))
    })
  }, [])

  const waiting = rows.filter(r => r.status === 'waiting')
  const called = rows.filter(r => r.status === 'called')
  const reservations = rows.filter(r => (r as any).is_reservation === true)

  const availableTablesList = useMemo(() => tables.filter(t => t.status !== 'seated' && t.status !== 'dirty'), [tables])

  // 예약 처리 함수
  const handleReservationAction = async (reservationId: string, action: 'confirm' | 'cancel') => {
    if (pending[reservationId]) return
    setPendingFlag(reservationId, true)
    
    try {
      if (action === 'confirm') {
        await confirmReservation(reservationId)
      } else if (action === 'cancel') {
        // optimistic: 목록에서 제거
        setRows(prev => prev.filter(r => r.id !== reservationId))
        await cancelReservation(reservationId)
      }
    } catch (err) {
      console.error(`${action}Reservation failed, refetching...`, err)
      await refetchWaitlist()
    } finally {
      setPendingFlag(reservationId, false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 새 대기 등록 버튼과 호출 만료 처리 버튼 */}
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold text-gray-900">대기 관리</div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            ➕ 새 대기 등록
          </button>
          <button
            onClick={() => setShowReservationModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            📅 예약 등록
          </button>
          {(userRole === 'manager' || userRole === 'admin') && (
            <form action={expireCalled5}>
              <button className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
                호출 만료 처리 (5분)
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 대기 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 대기 등록</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (isSubmitting) return
                const size = Number(draft.size)
                if (!draft.name || !size) return alert('이름/인원수를 확인하세요.')
                try {
                  setIsSubmitting(true)
                  const created = await addWait({ name: draft.name, phone: draft.phone || undefined, size, note: draft.note || undefined })
                  // optimistic: 방금 추가된 항목이 실시간 이벤트 도착 전에도 보이도록 즉시 추가
                  if (created && (created.status === 'waiting' || created.status === 'called')) {
                    setRows(prev => {
                      // 중복 방지(실시간과 겹칠 수 있음)
                      if (prev.some(r => r.id === created.id)) return prev
                      return [...prev, created as any].sort((a,b)=> a.created_at.localeCompare(b.created_at))
                    })
                  }
                  setDraft({ name: '', phone: '', size: '2', note: '' })
                  setShowAddModal(false) // 등록 완료 후 모달 닫기
                } finally {
                  setIsSubmitting(false)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객명 *</label>
                <input
                  placeholder="이름"
                  value={draft.name}
                  onChange={e=>setDraft(s=>({...s, name:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  placeholder="010-0000-0000"
                  value={draft.phone}
                  onChange={e=>setDraft(s=>({...s, phone:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인원수 *</label>
                <input
                  placeholder="2"
                  value={draft.size}
                  onChange={e=>setDraft(s=>({...s, size:e.target.value}))}
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <input
                  placeholder="특별 요청사항"
                  value={draft.note}
                  onChange={e=>setDraft(s=>({...s, note:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 예약 등록 모달 */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">예약 등록</h3>
              <button
                onClick={() => setShowReservationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (isSubmitting) return
                const size = Number(reservationDraft.size)
                const duration = Number(reservationDraft.duration)
                const depositAmount = Number(reservationDraft.depositAmount)
                if (!reservationDraft.name || !size || !reservationDraft.reservationTime) return alert('필수 정보를 모두 입력하세요.')
                try {
                  setIsSubmitting(true)
                  const created = await addReservation({
                    name: reservationDraft.name,
                    phone: reservationDraft.phone || undefined,
                    size,
                    reservationTime: reservationDraft.reservationTime,
                    duration,
                    specialRequest: reservationDraft.specialRequest || undefined,
                    depositAmount
                  })
                  // optimistic: 방금 추가된 항목이 실시간 이벤트 도착 전에도 보이도록 즉시 추가
                  if (created && (created.status === 'waiting' || created.status === 'called')) {
                    setRows(prev => {
                      // 중복 방지(실시간과 겹칠 수 있음)
                      if (prev.some(r => r.id === created.id)) return prev
                      return [...prev, created as any].sort((a,b)=> a.created_at.localeCompare(b.created_at))
                    })
                  }
                  setReservationDraft({
                    name: '',
                    phone: '',
                    size: '2',
                    reservationTime: '',
                    duration: '120',
                    specialRequest: '',
                    depositAmount: '0'
                  })
                  setShowReservationModal(false) // 등록 완료 후 모달 닫기
                } finally {
                  setIsSubmitting(false)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객명 *</label>
                <input
                  placeholder="이름"
                  value={reservationDraft.name}
                  onChange={e=>setReservationDraft(s=>({...s, name:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  placeholder="010-0000-0000"
                  value={reservationDraft.phone}
                  onChange={e=>setReservationDraft(s=>({...s, phone:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인원수 *</label>
                <input
                  placeholder="2"
                  value={reservationDraft.size}
                  onChange={e=>setReservationDraft(s=>({...s, size:e.target.value}))}
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예약 시간 *</label>
                <input
                  type="datetime-local"
                  value={reservationDraft.reservationTime}
                  onChange={e=>setReservationDraft(s=>({...s, reservationTime:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예약 시간 (분)</label>
                <input
                  placeholder="120"
                  value={reservationDraft.duration}
                  onChange={e=>setReservationDraft(s=>({...s, duration:e.target.value}))}
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">특별 요청</label>
                <input
                  placeholder="특별 요청사항"
                  value={reservationDraft.specialRequest}
                  onChange={e=>setReservationDraft(s=>({...s, specialRequest:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예약금</label>
                <input
                  placeholder="0"
                  value={reservationDraft.depositAmount}
                  onChange={e=>setReservationDraft(s=>({...s, depositAmount:e.target.value}))}
                  inputMode="decimal"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '등록 중...' : '예약 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  {/* 상단 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-orange-600">대기중</p>
      <p className="text-2xl font-bold text-orange-900 mt-1">{waiting.length}팀</p>
            </div>
            <div className="text-2xl">⏰</div>
          </div>
        </div>
        
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-blue-600">호출됨</p>
      <p className="text-2xl font-bold text-blue-900 mt-1">{called.length}팀</p>
            </div>
            <div className="text-2xl">📢</div>
          </div>
        </div>

    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-purple-600">예약</p>
      <p className="text-2xl font-bold text-purple-900 mt-1">{reservations.length}팀</p>
            </div>
            <div className="text-2xl">📅</div>
          </div>
        </div>
        
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
      <p className="text-sm font-medium text-green-600">사용 가능한 테이블</p>
      <p className="text-lg font-bold text-green-900 mt-2 break-words">
        {availableTablesList.length === 0 
          ? '—' 
          : availableTablesList.map(t=>t.label).join(' · ')
        }
      </p>
            </div>
            <div className="text-2xl ml-2">🪑</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 대기열 */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">대기열</h3>
            <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {waiting.length}팀 대기중
            </div>
          </div>
          
          <div className="space-y-3">
            {waiting.map((w, index) => (
              <div key={w.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{w.name}</div>
                      <div className="text-sm text-gray-500">{w.size}명 · {new Date(w.created_at).toLocaleTimeString()}</div>
                      {(w as any).is_reservation && (w as any).reservation_time && (
                        <div className="text-xs text-blue-600 font-medium">
                          📅 예약: {new Date((w as any).reservation_time).toLocaleString('ko-KR')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{w.phone || '-'}</div>
                </div>
                
                {w.note && (
                  <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                    💬 {w.note}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {(w as any).is_reservation ? (
                    // 예약 항목인 경우
                    <>
                      <button 
                        onClick={async () => {
                          if (pending[w.id]) return
                          setPendingFlag(w.id, true)
                          try {
                            await confirmReservation(w.id)
                          } catch (err) {
                            console.error('confirmReservation failed, refetching...', err)
                            await refetchWaitlist()
                          } finally {
                            setPendingFlag(w.id, false)
                          }
                        }} 
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        disabled={!!pending[w.id]}
                      >
                        ✅ 예약 확인
                      </button>
                      <button 
                        onClick={async () => {
                          if (pending[w.id]) return
                          setPendingFlag(w.id, true)
                          // optimistic: 목록에서 제거
                          setRows(prev => prev.filter(r => r.id !== w.id))
                          try {
                            await cancelReservation(w.id)
                          } catch (err) {
                            console.error('cancelReservation failed, refetching...', err)
                            await refetchWaitlist()
                          } finally {
                            setPendingFlag(w.id, false)
                          }
                        }} 
                        className="px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 transition-colors"
                        disabled={!!pending[w.id]}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    // 일반 대기 항목인 경우
                    <>
                      <button 
                        onClick={async () => {
                          if (pending[w.id]) return
                          setPendingFlag(w.id, true)
                          // optimistic: waiting -> called
                          setRows(prev => prev.map(r => r.id === w.id ? { ...r, status: 'called', called_at: new Date().toISOString() } as any : r))
                          try {
                            await callWait(w.id)
                          } catch (err) {
                            console.error('callWait failed, refetching...', err)
                            await refetchWaitlist()
                          } finally {
                            setPendingFlag(w.id, false)
                          }
                        }} 
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        disabled={!!pending[w.id]}
                      >
                        📢 호출
                      </button>
                      {(userRole === 'manager' || userRole === 'admin') && (
                        <>
                          <button 
                            onClick={async () => {
                              if (pending[w.id]) return
                              setPendingFlag(w.id, true)
                              // optimistic: 목록에서 제거 (waiting/called만 보이므로)
                              setRows(prev => prev.filter(r => r.id !== w.id))
                              try {
                                await cancelWait(w.id)
                              } catch (err) {
                                console.error('cancelWait failed, refetching...', err)
                                await refetchWaitlist()
                              } finally {
                                setPendingFlag(w.id, false)
                              }
                            }} 
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                            disabled={!!pending[w.id]}
                          >
                            취소
                          </button>
                          <button 
                            onClick={async () => {
                              if (pending[w.id]) return
                              setPendingFlag(w.id, true)
                              // optimistic: 목록에서 제거
                              setRows(prev => prev.filter(r => r.id !== w.id))
                              try {
                                await noShowWait(w.id)
                              } catch (err) {
                                console.error('noShowWait failed, refetching...', err)
                                await refetchWaitlist()
                              } finally {
                                setPendingFlag(w.id, false)
                              }
                            }} 
                            className="px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 transition-colors"
                            disabled={!!pending[w.id]}
                          >
                            노쇼
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {waiting.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎉</div>
                <p>현재 대기중인 고객이 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 호출됨 */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">호출됨</h3>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {called.length}팀 호출됨
            </div>
          </div>
          
          <div className="space-y-3">
            {called.map(w => (
              <div key={w.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                      📢
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{w.name}</div>
                      <div className="text-sm text-gray-600">
                        {w.size}명 · 호출 {w.called_at ? new Date(w.called_at).toLocaleTimeString() : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{w.phone || '-'}</div>
                </div>

                <div className="mb-3">
                  <SeatPicker 
                    waitId={w.id} 
                    tables={tables} 
                    onAssigned={(id: string) => {
                      // 좌석 배정 성공 시 목록에서 제거 (server action 성공 후 SeatPicker에서 호출)
                      setRows(prev => prev.filter(r => r.id !== id))
                    }}
                  />
                </div>
                
                <div className="flex gap-2">
                  {(userRole === 'manager' || userRole === 'admin') && (
                    <>
                      <button 
                        onClick={async () => {
                          if (pending[w.id]) return
                          setPendingFlag(w.id, true)
                          setRows(prev => prev.filter(r => r.id !== w.id))
                          try {
                            await cancelWait(w.id)
                          } catch (err) {
                            console.error('cancelWait failed, refetching...', err)
                            await refetchWaitlist()
                          } finally {
                            setPendingFlag(w.id, false)
                          }
                        }} 
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        disabled={!!pending[w.id]}
                      >
                        취소
                      </button>
                      <button 
                        onClick={async () => {
                          if (pending[w.id]) return
                          setPendingFlag(w.id, true)
                          setRows(prev => prev.filter(r => r.id !== w.id))
                          try {
                            await noShowWait(w.id)
                          } catch (err) {
                            console.error('noShowWait failed, refetching...', err)
                            await refetchWaitlist()
                          } finally {
                            setPendingFlag(w.id, false)
                          }
                        }} 
                        className="flex-1 px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 transition-colors"
                        disabled={!!pending[w.id]}
                      >
                        노쇼 처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {called.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📢</div>
                <p>호출된 고객이 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 예약 카드 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📅</span>
            예약 ({reservations.length})
          </h3>
          <button
            onClick={() => setShowReservationModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            + 예약 등록
          </button>
        </div>
        
        {reservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-purple-900">{reservation.name}</h4>
                    <p className="text-sm text-purple-700">{reservation.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReservationAction(reservation.id, 'confirm')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      disabled={!!pending[reservation.id]}
                    >
                      확인
                    </button>
                    <button
                      onClick={() => handleReservationAction(reservation.id, 'cancel')}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      disabled={!!pending[reservation.id]}
                    >
                      취소
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-purple-700">
                    <span className="mr-2">👥</span>
                    {reservation.size}명
                  </div>
                  <div className="flex items-center text-purple-700">
                    <span className="mr-2">📅</span>
                    {(reservation as any).reservation_time ? new Date((reservation as any).reservation_time).toLocaleString('ko-KR') : '시간 미정'}
                  </div>
                  {reservation.note && (
                    <div className="flex items-start text-purple-700">
                      <span className="mr-2 mt-0.5">📝</span>
                      <span className="flex-1">{reservation.note}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📅</div>
            <p>등록된 예약이 없습니다.</p>
            <p className="text-sm mt-1">예약 등록 버튼을 눌러 새 예약을 추가하세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SeatPicker({ waitId, tables, onAssigned }: { waitId: string; tables: Table[]; onAssigned?: (waitId: string) => void }) {
  const [tableId, setTableId] = useState('')
  const [localTables, setLocalTables] = useState<Table[]>(tables)

  // keep localTables in sync if parent prop changes
  useEffect(() => setLocalTables(tables), [tables])

  // subscribe to dining_table realtime updates so availableTables reflect changes
  useEffect(() => {
    const client = supabase()
    const ch = client
      .channel('dining_table_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_table' }, (payload) => {
        const ev = payload.eventType
        if (ev === 'INSERT') {
          setLocalTables(prev => [...prev, payload.new])
        } else if (ev === 'UPDATE') {
          setLocalTables(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
        } else if (ev === 'DELETE') {
          setLocalTables(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { client.removeChannel(ch) }
  }, [])

  const availableTables = useMemo(
    // treat any table that is not currently seated or dirty as available
    () => localTables.filter(t => t.status !== 'seated' && t.status !== 'dirty'),
    [localTables]
  )

  const assign = async () => {
    if (!tableId) return alert('테이블을 선택하세요.')
    try {
      await seatWait({ waitId, tableId })
  // 부모에 즉시 반영 요청
  onAssigned?.(waitId)
      // refetch local tables to reflect exact server state after assignment
      const client = supabase()
      const { data } = await client.from('dining_table').select('id,label,capacity,status').order('label', { ascending: true })
      if (data) setLocalTables(data as Table[])
    } finally {
      setTableId('')
    }
  }

  const assignWithoutTable = async () => {
    try {
      await seatWait({ waitId })
      // 부모에 즉시 반영 요청
      onAssigned?.(waitId)
    } catch (error) {
      console.error('테이블 없이 배정 실패:', error)
      alert('배정에 실패했습니다.')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-700 mb-2">테이블 배정</div>
      <div className="space-y-3">
        <div className="flex gap-3">
          <select
            value={tableId}
            onChange={e=>setTableId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">테이블 선택 (선택사항)</option>
        {availableTables.map(t => (
              <option key={t.id} value={t.id}>
          {t.label} ({t.capacity}명) - {t.status === 'reserved' ? '예약됨' : '사용가능'}
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!tableId}
          >
            🪑 배정
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600">
            또는 테이블 없이 바로 배정
          </div>
          <button
            onClick={assignWithoutTable}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            ⚡ 바로 배정
          </button>
        </div>
      </div>

      {availableTables.length === 0 && (
        <p className="text-sm text-orange-600 mt-2">⚠️ 현재 사용 가능한 테이블이 없습니다.</p>
      )}
    </div>
  )
}
