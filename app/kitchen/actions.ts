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
  try {
    const h = await headers()
    const restaurantId = h.get('x-restaurant-id')

    console.log('setKitchenStatus called:', { orderItemId, next, restaurantId })

    if (!restaurantId) {
      console.error('Restaurant ID not found in headers')
      throw new Error('Restaurant ID not found')
    }

    const supabase = await sb()
    const map: Record<KStatus, string> = {
      queued: 'queued',
      in_progress: 'in_progress',
      done: 'done',
      served: 'served',
    }

    console.log('Updating order_item:', { orderItemId, status: map[next], restaurantId })

    const { error } = await supabase
      .from('order_item')
      .update({ status: map[next] })
      .eq('id', orderItemId)
      .eq('restaurant_id', restaurantId)

    if (error) {
      console.error('order_item update error:', error)
      throw new Error(`Failed to update order_item: ${error.message}`)
    }

    // Also update kitchen_queue if it exists for this order_item
    const { error: kqError } = await supabase
      .from('kitchen_queue')
      .update({ status: map[next] })
      .eq('order_item_id', orderItemId)
      .eq('restaurant_id', restaurantId)

    if (kqError) {
      console.warn('kitchen_queue update warning (non-critical):', kqError)
      // Don't throw error for kitchen_queue updates
    }

    console.log('setKitchenStatus completed successfully')

    revalidatePath('/kitchen')
    revalidatePath('/kitchen/[station]', 'page')
    revalidatePath('/serving')
    revalidatePath('/serving/[station]', 'page')
    revalidatePath('/cashier')

  } catch (error: any) {
    console.error('setKitchenStatus failed:', error)
    throw new Error(`조리 상태 변경 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

/** 스테이션의 미완료 티켓을 일괄 완료 처리 */
export async function bulkMarkDone(station: string) {
  try {
    const h = await headers()
    const restaurantId = h.get('x-restaurant-id')

    console.log('bulkMarkDone called:', { station, restaurantId })

    if (!restaurantId) {
      console.error('Restaurant ID not found in headers')
      throw new Error('Restaurant ID not found')
    }

    const supabase = await sb()

    // find order_items by station
    const { data: items = [], error: e } = await supabase
      .from('order_item')
      .select('id, menu_item:menu_item_id(id, station), status')
      .eq('restaurant_id', restaurantId)

    if (e) {
      console.error('bulkMarkDone query error:', e)
      throw new Error(`Failed to fetch order items: ${e.message}`)
    }

    const ids = items.filter((it:any)=> {
      const itemStation = it.menu_item?.station || 'main'
      // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
      const effectiveStation = itemStation === 'bar' ? 'beverages' : itemStation
      return effectiveStation === station && ['queued','in_progress'].includes(it.status)
    }).map((it:any)=>it.id)

    console.log('bulkMarkDone found items:', { station, itemCount: ids.length, ids })

    if (ids.length) {
      const { error: updateError } = await supabase
        .from('order_item')
        .update({ status: 'done' })
        .in('id', ids)
        .eq('restaurant_id', restaurantId)

      if (updateError) {
        console.error('bulkMarkDone order_item update error:', updateError)
        throw new Error(`Failed to update order items: ${updateError.message}`)
      }

      // Also update kitchen_queue
      const { error: kqError } = await supabase
        .from('kitchen_queue')
        .update({ status: 'done' })
        .in('order_item_id', ids)
        .eq('restaurant_id', restaurantId)

      if (kqError) {
        console.warn('bulkMarkDone kitchen_queue update warning:', kqError)
      }
    }

    console.log('bulkMarkDone completed successfully')

    revalidatePath(`/kitchen/${station}`)
    revalidatePath(`/serving/${station}`)
    revalidatePath('/kitchen')
    revalidatePath('/serving')
    revalidatePath('/cashier')
    revalidatePath('/tables')

  } catch (error: any) {
    console.error('bulkMarkDone failed:', error)
    throw new Error(`일괄 완료 처리 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

/** 완료된 것을 서빙완료 처리 */
export async function bulkMarkServed(station: string) {
  try {
    const h = await headers()
    const restaurantId = h.get('x-restaurant-id')

    console.log('bulkMarkServed called:', { station, restaurantId })

    if (!restaurantId) {
      console.error('Restaurant ID not found in headers')
      throw new Error('Restaurant ID not found')
    }

    const supabase = await sb()

    const { data: items = [], error: e } = await supabase
      .from('order_item')
      .select('id, menu_item:menu_item_id(id, station), status')
      .eq('restaurant_id', restaurantId)

    if (e) {
      console.error('bulkMarkServed query error:', e)
      throw new Error(`Failed to fetch order items: ${e.message}`)
    }

    const ids = items.filter((it:any)=> {
      const itemStation = it.menu_item?.station || 'main'
      // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
      const effectiveStation = itemStation === 'bar' ? 'beverages' : itemStation
      return effectiveStation === station && it.status === 'done'
    }).map((it:any)=>it.id)

    console.log('bulkMarkServed found items:', { station, itemCount: ids.length, ids })

    if (ids.length) {
      const { error: updateError } = await supabase
        .from('order_item')
        .update({ status: 'served' })
        .in('id', ids)
        .eq('restaurant_id', restaurantId)

      if (updateError) {
        console.error('bulkMarkServed order_item update error:', updateError)
        throw new Error(`Failed to update order items: ${updateError.message}`)
      }

      // Also update kitchen_queue
      const { error: kqError } = await supabase
        .from('kitchen_queue')
        .update({ status: 'served' })
        .in('order_item_id', ids)
        .eq('restaurant_id', restaurantId)

      if (kqError) {
        console.warn('bulkMarkServed kitchen_queue update warning:', kqError)
      }
    }

    console.log('bulkMarkServed completed successfully')

    revalidatePath(`/kitchen/${station}`)
    revalidatePath(`/serving/${station}`)
    revalidatePath('/kitchen')
    revalidatePath('/serving')
    revalidatePath('/cashier')
    revalidatePath('/tables')
    return ids

  } catch (error: any) {
    console.error('bulkMarkServed failed:', error)
    throw new Error(`서빙완료 처리 실패: ${error.message || '알 수 없는 오류'}`)
  }
}
