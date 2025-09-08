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
export async function setKitchenStatus(orderItemId: string, next: KStatus) {
  const supabase = await sb()
  const map: Record<KStatus, string> = {
    queued: 'queued',
    in_progress: 'in_progress',
    done: 'done',
    served: 'served',
  }
  const { error } = await supabase
    .from('order_item')
    .update({ status: map[next] })
    .eq('id', orderItemId)
  if (error) throw new Error(error.message)
  
  // Also update kitchen_queue if it exists for this order_item
  const { error: kqError } = await supabase
    .from('kitchen_queue')
    .update({ status: map[next] })
    .eq('order_item_id', orderItemId)
  // Ignore error if kitchen_queue row doesn't exist
  
  revalidatePath('/kitchen')
  revalidatePath('/kitchen/[station]', 'page')
  revalidatePath('/serving')
  revalidatePath('/serving/[station]', 'page')
  revalidatePath('/cashier')
}

/** 스테이션의 미완료 티켓을 일괄 완료 처리 */
export async function bulkMarkDone(station: string) {
  const supabase = await sb()

  // find order_items by station
  const { data: items = [], error: e } = await supabase
    .from('order_item')
    .select('id, menu_item:menu_item_id(id, station), status')
  if (e) throw new Error(e.message)
  const ids = items.filter((it:any)=> {
    const itemStation = it.menu_item?.station || 'main'
    // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
    const effectiveStation = itemStation === 'bar' ? 'beverages' : itemStation
    return effectiveStation === station && ['queued','in_progress'].includes(it.status)
  }).map((it:any)=>it.id)
  if (ids.length) {
    await supabase.from('order_item').update({ status: 'done' }).in('id', ids)
    // Also update kitchen_queue
    await supabase.from('kitchen_queue').update({ status: 'done' }).in('order_item_id', ids)
  }
  revalidatePath(`/kitchen/${station}`)
  revalidatePath(`/serving/${station}`)
  revalidatePath('/kitchen')
  revalidatePath('/serving')
  revalidatePath('/cashier')
  revalidatePath('/tables')
}

/** 완료된 것을 서빙완료 처리 */
export async function bulkMarkServed(station: string) {
  const supabase = await sb()

  const { data: items = [], error: e } = await supabase
    .from('order_item')
    .select('id, menu_item:menu_item_id(id, station), status')
  if (e) throw new Error(e.message)
  const ids = items.filter((it:any)=> {
    const itemStation = it.menu_item?.station || 'main'
    // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
    const effectiveStation = itemStation === 'bar' ? 'beverages' : itemStation
    return effectiveStation === station && it.status === 'done'
  }).map((it:any)=>it.id)
  if (ids.length) {
    await supabase.from('order_item').update({ status: 'served' }).in('id', ids)
    // Also update kitchen_queue
    await supabase.from('kitchen_queue').update({ status: 'served' }).in('order_item_id', ids)
  }
  revalidatePath(`/kitchen/${station}`)
  revalidatePath(`/serving/${station}`)
  revalidatePath('/kitchen')
  revalidatePath('/serving')
  revalidatePath('/cashier')
  revalidatePath('/tables')
}
