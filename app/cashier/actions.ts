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
      headers: { get(n: string){ return h.get(n) } }
    }
  )
}

export async function payOrder({
  orderId,
  method,
  amount,
}: {
  orderId: string
  method: string
  amount: number
}) {
  const h = await headers()
  const restaurantId = h.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await sb()
  // 1) 결제 저장
  const { error: e1 } = await supabase.from('payment').insert({
    order_id: orderId,
    method,
    amount,
    restaurant_id: restaurantId, // restaurant_id 추가
  })
  if (e1) throw new Error(e1.message)

  // 2) 주문 상태 업데이트
  const { error: e2 } = await supabase
    .from('order_ticket')
    .update({ status: 'paid', closed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
  if (e2) throw new Error(e2.message)

  // 3) 테이블 상태 dirty
  const { data: order } = await supabase
    .from('order_ticket')
    .select('table_id')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .single()
  if (order?.table_id) {
    await supabase
      .from('dining_table')
      .update({ status: 'dirty' })
      .eq('id', order.table_id)
      .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
  }

  revalidatePath('/cashier')
  revalidatePath('/tables')
  revalidatePath('/kitchen')
  revalidatePath('/serving')
}
