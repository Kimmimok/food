// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

/** 테이블 착석 & 오픈 주문 생성(없으면) */
export async function seatTableAndOpenOrder(tableId: string) {
  const supabase = await supabaseServer()
  // 1) 테이블 상태 seated
  const { error: e1 } = await supabase
    .from('dining_table')
    .update({ status: 'seated' })
    .eq('id', tableId)
  if (e1) throw new Error(e1.message)

  // 2) 열려있는 주문 확인
  const { data: openOrders, error: e2 } = await supabase
    .from('order_ticket')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .limit(1)
  if (e2) throw new Error(e2.message)

  if (!openOrders || openOrders.length === 0) {
    const { error: e3 } = await supabase
      .from('order_ticket')
      .insert({ table_id: tableId, status: 'open', channel: 'dine_in' })
    if (e3) throw new Error(e3.message)
  }
  revalidatePath('/tables')
  revalidatePath(`/tables/${tableId}`)
}

/** 빈 테이블로 정리 & 오더 닫기(미결계면 open 유지) */
export async function markTableEmpty(tableId: string) {
  const supabase = await supabaseServer()

  // 먼저 해당 테이블의 오픈된 주문을 찾아서 completed로 변경
  const { data: openOrders, error: orderError } = await supabase
    .from('order_ticket')
    .select('id')
    .eq('table_id', tableId)
    .in('status', ['open', 'sent_to_kitchen'])
    .limit(1)

  if (orderError) {
    console.error('Error finding open orders:', orderError.message)
  } else if (openOrders && openOrders.length > 0) {
    // 오픈된 주문이 있으면 completed로 변경
    const { error: updateError } = await supabase
      .from('order_ticket')
      .update({ status: 'completed' })
      .eq('id', openOrders[0].id)

    if (updateError) {
      console.error('Error updating order status:', updateError.message)
    }
  }

  // 테이블 상태를 empty로 변경
  const { error } = await supabase
    .from('dining_table')
    .update({ status: 'empty' })
    .eq('id', tableId)
  if (error) throw new Error(error.message)

  revalidatePath('/tables')
  revalidatePath(`/tables/${tableId}`)
  revalidatePath('/kitchen')
  revalidatePath('/serving')
  revalidatePath('/cashier')
}

/** 테이블 정리완료 처리 (dirty -> empty) */
export async function markTableClean(tableId: string) {
  const supabase = await supabaseServer()

  // 테이블 상태를 empty로 변경 (정리 완료)
  const { error } = await supabase
    .from('dining_table')
  .update({ status: 'empty' })
  .eq('id', tableId)
  if (error) throw new Error(error.message)

  revalidatePath('/tables')
  revalidatePath(`/tables/${tableId}`)
}

/** 모든 정리 필요 테이블을 사용 가능으로 변경 */
export async function markAllTablesClean() {
  const supabase = await supabaseServer()

  // 정리 필요(결제/완료된 오더가 있는) 테이블들의 id를 먼저 조회한 뒤 표를 비웁니다.
  const { data: tablesWithDoneOrders, error: qErr } = await supabase
    .from('order_ticket')
    .select('table_id')
    .in('status', ['completed', 'paid'])

  if (qErr) throw new Error(qErr.message)

  const tableIds = Array.isArray(tablesWithDoneOrders) ? Array.from(new Set(tablesWithDoneOrders.map((r: any) => r.table_id))) : []

  if (tableIds.length === 0) return revalidatePath('/tables')

  const { error } = await supabase
    .from('dining_table')
    .update({ status: 'empty' })
    .in('id', tableIds)

  if (error) throw new Error(error.message)

  revalidatePath('/tables')
}

/** 메뉴를 주문 항목으로 추가 */
export async function addOrderItem(params: {
  orderId: string
  menuItemId: string
  qty: number
  note?: string
}) {
  const supabase = await supabaseServer()
  // 메뉴 스냅샷을 위해 현재 이름/가격 조회
  const { data: mi, error: e1 } = await supabase
    .from('menu_item')
    .select('name, price, station')
    .eq('id', params.menuItemId)
    .single()
  if (e1) throw new Error(e1.message)

  const row = {
    order_id: params.orderId,
    menu_item_id: params.menuItemId,
    name_snapshot: mi?.name ?? '메뉴',
    price_snapshot: mi?.price ?? 0,
    qty: params.qty,
    note: params.note ?? null,
    status: 'queued' as const,
  }
  const { data: inserted, error: e2 } = await supabase
    .from('order_item')
    .insert(row)
    .select('id')
    .single()
  if (e2) throw new Error(e2.message)

  // 주문이 처음 추가되면 sent_to_kitchen 으로 전환(주방 전송)
  const { error: e3 } = await supabase
    .from('order_ticket')
    .update({ status: 'sent_to_kitchen' })
    .eq('id', params.orderId)
    .in('status', ['open']) // open일 때만
  if (e3) throw new Error(e3.message)

  // KDS 큐 등록(스테이션별)
  try {
    const station = (mi as any)?.station || 'main'
    if (inserted?.id) {
      const { error: qe } = await supabase
        .from('kitchen_queue')
        .insert({ order_item_id: inserted.id, station, status: 'queued' })
      if (qe) console.error('enqueue kitchen failed', qe.message)
    }
  } catch (err) {
    console.error('enqueue kitchen exception', (err as any)?.message || err)
  }

  revalidatePath(`/tables`)
  revalidatePath(`/tables/[tableId]`)
  revalidatePath('/kitchen')
  revalidatePath('/serving')
  revalidatePath('/cashier')
}

/** 항목을 KDS 큐에 올리기(선택적) */
export async function enqueueToKitchen(orderItemId: string, station = 'main') {
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('kitchen_queue')
    .insert({ order_item_id: orderItemId, station, status: 'queued' })
  if (error) throw new Error(error.message)
}

/** 항목 삭제 */
export async function removeOrderItem(orderItemId: string) {
  const supabase = await supabaseServer()
  const { error } = await supabase.from('order_item').delete().eq('id', orderItemId)
  if (error) throw new Error(error.message)
}

/** 수량 변경 */
export async function updateQty(orderItemId: string, qty: number) {
  const supabase = await supabaseServer()
  const { error } = await supabase.from('order_item').update({ qty }).eq('id', orderItemId)
  if (error) throw new Error(error.message)
}
