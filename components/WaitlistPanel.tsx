// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { addWait, callWait, seatWait, cancelWait, noShowWait, expireCalled5 } from '@/app/waitlist/actions'

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

  const availableTablesList = useMemo(() => tables.filter(t => t.status !== 'seated' && t.status !== 'dirty'), [tables])

  return (
    <div className="space-y-6">
      {/* 등록 폼 */}
      <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 대기 등록</h3>
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
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="grid gap-4 sm:grid-cols-5"
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
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

  {/* 상단 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-orange-600">대기중</p>
      <p className="text-2xl font-bold text-orange-900 mt-1">{waiting.length}팀</p>
            </div>
            <div className="text-2xl">⏰</div>
          </div>
        </div>
        
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-blue-600">호출됨</p>
      <p className="text-2xl font-bold text-blue-900 mt-1">{called.length}팀</p>
            </div>
            <div className="text-2xl">📢</div>
          </div>
        </div>
        
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
      <p className="text-sm font-medium text-green-600">테이블</p>
      <p className="text-2xl font-bold text-green-900 mt-2">{availableTablesList.length === 0 ? '—' : availableTablesList.slice(0,4).map(t=>t.label).join(' · ')}{availableTablesList.length > 4 ? ' 등' : ''}</p>
            </div>
            <div className="text-2xl">🪑</div>
          </div>
        </div>
        
        { (userRole === 'manager' || userRole === 'admin') && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <form action={expireCalled5}>
              <button className="w-full h-full px-3 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                호출 만료 처리
                <br />
                <span className="text-xs">(5분 기준)</span>
              </button>
            </form>
          </div>
        )}
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-700 mb-2">테이블 배정</div>
      <div className="flex gap-3">
        <select 
          value={tableId} 
          onChange={e=>setTableId(e.target.value)} 
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">테이블 선택</option>
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
      {availableTables.length === 0 && (
        <p className="text-sm text-orange-600 mt-2">⚠️ 현재 사용 가능한 테이블이 없습니다.</p>
      )}
    </div>
  )
}
