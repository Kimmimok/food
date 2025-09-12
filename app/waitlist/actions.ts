// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

async function sb() {
  const c = await cookies()
  const h = await headers()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(n: string){ return c.get(n)?.value } },
      headers: { get(n: string){ return h.get(n) as any } }
    }
  )
}

export async function addWait({
  name, phone, size, note
}: { name: string; phone?: string; size: number; note?: string }) {
  const supabase = await sb()
  const { data, error } = await supabase
    .from('waitlist')
    .insert({ name, phone: phone ?? null, size, note: note ?? null, status: 'waiting' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
  return data
}

export async function callWait(id: string) {
  const supabase = await sb()
  const { error } = await supabase
    .from('waitlist')
    .update({ status: 'called', called_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}

/** 좌석 배정: 대기 → 테이블 상태 seated, 대기 seated 처리 */
export async function seatWait({
  waitId, tableId
}: { waitId: string; tableId?: string }) {
  const supabase = await sb()

  // 테이블이 선택된 경우에만 테이블 상태 업데이트
  if (tableId) {
    const { error: e1 } = await supabase
      .from('dining_table')
      .update({ status: 'seated' })
      .eq('id', tableId)
    if (e1) throw new Error(e1.message)
  }

  // 2) 대기 seated 처리 (테이블 선택 여부와 관계없이)
  const { error: e2 } = await supabase
    .from('waitlist')
    .update({
      status: 'seated',
      seated_table_id: tableId || null
    })
    .eq('id', waitId)
  if (e2) throw new Error(e2.message)

  revalidatePath('/waitlist')
  revalidatePath('/tables')
}

export async function cancelWait(id: string) {
  const supabase = await sb()
  const { error } = await supabase
    .from('waitlist')
    .update({ status: 'canceled' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}

export async function noShowWait(id: string) {
  const supabase = await sb()
  const { error } = await supabase
    .from('waitlist')
    .update({ status: 'no_show' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}

/** 자동 만료(호출 후 5분 지나면 waiting으로 되돌리거나 no_show로 표기하고 싶다면) */
export async function expireCalledOlderThan(minutes = 5) {
  const supabase = await sb()
  try {
    const { error } = await supabase.rpc('fn_waitlist_expire_called', { p_minutes: minutes })
    if (error) throw error
  } catch (err) {
    // If RPC does not exist or fails, fallback to a direct update:
    // Set status back to 'waiting' for rows in 'called' older than minutes.
    try {
      const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()
      const { error: e2 } = await supabase
        .from('waitlist')
        .update({ status: 'waiting' })
        .lt('called_at', cutoff)
        .eq('status', 'called')
      if (e2) throw e2
    } catch (e) {
      // If even fallback fails, surface the original error
      throw new Error(err?.message || e?.message || 'expireCalledOlderThan failed')
    }
  }
  revalidatePath('/waitlist')
}

// Small server-action wrapper for client components (pre-bound 5 minutes)
export async function expireCalled5() {
  return await expireCalledOlderThan(5)
}

// 예약 등록
export async function addReservation({
  name, phone, size, reservationTime, duration = 120, specialRequest, depositAmount = 0
}: {
  name: string;
  phone?: string;
  size: number;
  reservationTime: string;
  duration?: number;
  specialRequest?: string;
  depositAmount?: number;
}) {
  const supabase = await sb()
  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      name,
      phone: phone ?? null,
      size,
      status: 'waiting',
      is_reservation: true,
      reservation_time: reservationTime,
      reservation_duration: duration,
      special_request: specialRequest ?? null,
      deposit_amount: depositAmount,
      note: `예약: ${new Date(reservationTime).toLocaleString('ko-KR')} (${duration}분) ${specialRequest ? '- ' + specialRequest : ''}`
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
  return data
}

// 예약 확인/도착 처리
export async function confirmReservation(id: string) {
  const supabase = await sb()
  const { error } = await supabase
    .from('waitlist')
    .update({
      status: 'waiting',
      is_reservation: false,
      reservation_time: null,
      called_at: new Date().toISOString()
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}

// 예약 취소
export async function cancelReservation(id: string) {
  const supabase = await sb()
  const { error } = await supabase
    .from('waitlist')
    .update({
      status: 'canceled',
      is_reservation: false,
      reservation_time: null
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}
