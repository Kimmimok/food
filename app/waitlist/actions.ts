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
  const { error } = await supabase
    .from('waitlist')
    .insert({ name, phone: phone ?? null, size, note: note ?? null, status: 'waiting' })
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
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
}: { waitId: string; tableId: string }) {
  const supabase = await sb()
  // 1) 테이블 상태 업데이트
  const { error: e1 } = await supabase
    .from('dining_table')
    .update({ status: 'seated' })
    .eq('id', tableId)
  if (e1) throw new Error(e1.message)

  // 2) 대기 seated 처리
  const { error: e2 } = await supabase
    .from('waitlist')
    .update({ status: 'seated', seated_table_id: tableId })
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
  const { error } = await supabase.rpc('fn_waitlist_expire_called', { p_minutes: minutes })
  if (error) throw new Error(error.message)
  revalidatePath('/waitlist')
}

// Small server-action wrapper for client components (pre-bound 5 minutes)
export async function expireCalled5() {
  return await expireCalledOlderThan(5)
}
