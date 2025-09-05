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
      headers: { get(n:string){ return h.get(n) } }
    }
  )
}

type KStatus = 'queued' | 'in_progress' | 'done' | 'served'

/** 주방 상태 전이 + order_item.status 동기화 */
export async function setKitchenStatus(queueId: string, next: KStatus) {
  const supabase = await sb()

  const now = new Date().toISOString()
  const patch: any = { status: next }
  if (next === 'in_progress') patch.started_at = now
  if (next === 'done') patch.done_at = now

  const { data: q, error: e1 } = await supabase
    .from('kitchen_queue')
    .update(patch)
    .eq('id', queueId)
    .select('order_item_id')
    .single()
  if (e1) throw new Error(e1.message)

  // order_item 상태도 동기화
  const map: Record<KStatus, string> = {
    queued: 'queued',
    in_progress: 'in_progress',
    done: 'done',
    served: 'served',
  }
  const { error: e2 } = await supabase
    .from('order_item')
    .update({ status: map[next] })
    .eq('id', q.order_item_id)
  if (e2) throw new Error(e2.message)

  revalidatePath('/kitchen')
}

/** 스테이션의 미완료 티켓을 일괄 완료 처리 */
export async function bulkMarkDone(station: string) {
  const supabase = await sb()
  const now = new Date().toISOString()
  const { data: rows, error: e1 } = await supabase
    .from('kitchen_queue')
    .update({ status: 'done', done_at: now })
    .eq('station', station)
    .in('status', ['queued', 'in_progress'])
    .select('order_item_id')
  if (e1) throw new Error(e1.message)

  if (rows?.length) {
    const ids = rows.map(r => r.order_item_id)
    const { error: e2 } = await supabase
      .from('order_item')
      .update({ status: 'done' })
      .in('id', ids)
    if (e2) throw new Error(e2.message)
  }

  revalidatePath(`/kitchen/${station}`)
}

/** 완료된 것을 서빙완료 처리 */
export async function bulkMarkServed(station: string) {
  const supabase = await sb()
  const { data: rows, error: e1 } = await supabase
    .from('kitchen_queue')
    .update({ status: 'served' })
    .eq('station', station)
    .eq('status', 'done')
    .select('order_item_id')
  if (e1) throw new Error(e1.message)

  if (rows?.length) {
    const ids = rows.map(r => r.order_item_id)
    const { error: e2 } = await supabase
      .from('order_item')
      .update({ status: 'served' })
      .in('id', ids)
    if (e2) throw new Error(e2.message)
  }

  revalidatePath(`/kitchen/${station}`)
}
