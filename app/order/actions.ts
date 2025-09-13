// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'
import { headers } from 'next/headers'

export async function getOrCreateOpenOrder(tableId: string, channel: 'qr' | 'dine_in' = 'qr') {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await supabaseServer()

  // Resolve tableId to a UUID in dining_table.id.
  // Prefer matching by table_token (secure token). If not found, fall back to id or label.
  let tableUuid: string | null = null

  // try token match first
  if (tableId) {
    const { data: byToken } = await supabase
      .from('dining_table')
      .select('id')
      .eq('table_token', tableId)
      .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
      .maybeSingle()
    if (byToken) tableUuid = byToken.id
  }

  // try UUID id
  if (!tableUuid) {
    const isUuid = typeof tableId === 'string' && /^[0-9a-fA-F-]{36}$/.test(tableId)
    if (isUuid) {
      const { data: tbl } = await supabase
        .from('dining_table')
        .select('id')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
        .maybeSingle()
      if (tbl) tableUuid = tbl.id
    }
  }

  // try label
  if (!tableUuid) {
    const { data: byLabel } = await supabase
      .from('dining_table')
      .select('id')
      .eq('label', tableId)
      .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
      .maybeSingle()
    if (byLabel) tableUuid = byLabel.id
  }

  // create new dining_table row if still not found (for backward compatibility)
  if (!tableUuid) {
    const { data: created, error: creErr } = await supabase
      .from('dining_table')
      .insert({
        label: tableId,
        status: 'seated',
        restaurant_id: restaurantId // restaurant_id 추가
      })
      .select('id')
      .maybeSingle()
    if (creErr) throw new Error(creErr.message)
    tableUuid = created?.id ?? null
  }

  // Search for existing open order for the resolved table UUID
  // 주문시간 초기화를 위해 completed/paid 상태의 주문이 있으면 새로운 주문을 생성
  const { data: recentOrders, error: e1 } = await supabase
    .from('order_ticket')
    .select('*')
    .eq('table_id', tableUuid)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .in('status', ['open', 'sent_to_kitchen', 'completed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
  if (e1) throw new Error(e1.message)

  // 최근 주문이 있고, 그 주문이 완료된 상태라면 새로운 주문을 생성
  if (recentOrders && recentOrders.length > 0) {
    const latestOrder = recentOrders[0]
    if (latestOrder.status === 'completed' || latestOrder.status === 'paid') {
      // 완료된 주문이 있으면 새로운 주문을 생성
      const { data, error: e2 } = await supabase
        .from('order_ticket')
        .insert({
          table_id: tableUuid,
          status: 'open',
          channel,
          restaurant_id: restaurantId // restaurant_id 추가
        })
        .select('*')
        .single()
      if (e2) throw new Error(e2.message)

      // 테이블 상태도 사용중으로 전환
      if (tableUuid) await supabase
        .from('dining_table')
        .update({ status: 'seated' })
        .eq('id', tableUuid)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가

      return data
    } else if (latestOrder.status === 'open' || latestOrder.status === 'sent_to_kitchen') {
      // 진행중인 주문이 있으면 기존 주문 반환
      return latestOrder
    }
  }

  // 오픈된 주문이 없으면 새로 생성
  const { data, error: e2 } = await supabase
    .from('order_ticket')
    .insert({
      table_id: tableUuid,
      status: 'open',
      channel,
      restaurant_id: restaurantId // restaurant_id 추가
    })
    .select('*')
    .single()
  if (e2) throw new Error(e2.message)

  // 테이블 상태도 사용중으로 전환(선택)
  if (tableUuid) await supabase
    .from('dining_table')
    .update({ status: 'seated' })
    .eq('id', tableUuid)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가

  return data
}

export async function addToTableOrder(params: { tableId: string; menuItemId: string; qty: number; note?: string }) {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await supabaseServer()
  const order = await getOrCreateOpenOrder(params.tableId, 'qr')

  // 메뉴 스냅샷 조회
  const { data: mi, error: e1 } = await supabase
    .from('menu_item')
    .select('name, price, station')
    .eq('id', params.menuItemId)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .single()
  if (e1) throw new Error(e1.message)

  const row = {
    order_id: order.id,
    menu_item_id: params.menuItemId,
    name_snapshot: mi?.name ?? '메뉴',
    price_snapshot: mi?.price ?? 0,
    qty: params.qty,
    note: params.note ?? null,
    status: 'queued' as const,
    restaurant_id: restaurantId, // restaurant_id 추가
  }
  const { data: inserted, error: e2 } = await supabase
    .from('order_item')
    .insert(row)
    .select('id')
    .single()
  if (e2) throw new Error(e2.message)

  // enqueue to kitchen_queue based on menu_item.station
  try {
    let station = (mi as any)?.station || 'main'
    // bar 스테이션은 beverages로 변경
    station = station === 'bar' ? 'beverages' : station

    // 음료/주류 메뉴(바 스테이션)는 kitchen_queue에 넣지 않고 바로 서빙 준비 상태로 설정
    if (station === 'beverages') {
      await supabase
        .from('order_item')
        .update({ status: 'done' })
        .eq('id', inserted.id)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    } else {
      if (inserted?.id) {
        // idempotent insert: only insert if not exists
        const { data: exists } = await supabase
          .from('kitchen_queue')
          .select('id')
          .eq('order_item_id', inserted.id)
          .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
          .maybeSingle()
        if (!exists) {
          const { error: qe } = await supabase
            .from('kitchen_queue')
            .insert({
              order_item_id: inserted.id,
              station,
              status: 'queued',
              restaurant_id: restaurantId // restaurant_id 추가
            })
          if (qe) console.error('enqueue kitchen failed', qe.message)
        }
      }
    }
  } catch (err) {
    console.error('enqueue kitchen exception', (err as any)?.message || err)
  }

  // 첫 추가 시 주방으로 전송 상태로 전환
  const { error: e3 } = await supabase
    .from('order_ticket')
    .update({ status: 'sent_to_kitchen' })
    .eq('id', order.id)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .in('status', ['open'])
  if (e3) throw new Error(e3.message)

  revalidatePath(`/order/${params.tableId}`)
  return { ok: true }
}

export async function addMultipleToTableOrder(params: { tableId: string; items: Array<{ menuItemId: string; qty: number; note?: string }> }) {
  console.log('addMultipleToTableOrder called with:', params)
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await supabaseServer()
  const order = await getOrCreateOpenOrder(params.tableId, 'qr')

  // fetch menu snapshots for all item ids
  const ids = params.items.map(i => i.menuItemId)
  const { data: menuItems = [], error: e1 } = await supabase
    .from('menu_item')
    .select('id, name, price')
    .in('id', ids)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
  if (e1) throw new Error(e1.message)

  const miMap: Record<string, any> = {}
  for (const m of menuItems) miMap[m.id] = m

  const rows = params.items.map(it => ({
    order_id: order.id,
    menu_item_id: it.menuItemId,
    name_snapshot: miMap[it.menuItemId]?.name ?? '메뉴',
    price_snapshot: miMap[it.menuItemId]?.price ?? 0,
    qty: it.qty,
    note: it.note ?? null,
    status: 'queued' as const,
    restaurant_id: restaurantId, // restaurant_id 추가
  }))

  const { data: insertedItems = [], error: e2 } = await supabase
    .from('order_item')
    .insert(rows)
    .select('id, menu_item_id')
  if (e2) throw new Error(e2.message)

  // mark ticket as sent_to_kitchen if it was open
  const { error: e3 } = await supabase
    .from('order_ticket')
    .update({ status: 'sent_to_kitchen' })
    .eq('id', order.id)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .in('status', ['open'])
  if (e3) throw new Error(e3.message)

  // enqueue items into kitchen_queue per station
  try {
    const { data: enrichedMenu = [] } = await supabase
      .from('menu_item')
      .select('id, station')
      .in('id', ids)
      .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    const stationMap: Record<string, string> = {}
    for (const em of enrichedMenu) {
      const station = em.station || 'main'
      // bar 스테이션은 beverages로 변경
      stationMap[em.id] = station === 'bar' ? 'beverages' : station
    }

    // 음료/주류 메뉴(바 스테이션)는 kitchen_queue에 넣지 않고 바로 서빙 준비 상태로 설정
    const kitchenInserts = insertedItems
      .filter((oi: any) => stationMap[oi.menu_item_id] !== 'beverages')
      .map((oi: any) => ({
        order_item_id: oi.id,
        station: stationMap[oi.menu_item_id] || 'main',
        status: 'queued',
        restaurant_id: restaurantId, // restaurant_id 추가
      }))

    // 음료/주류 메뉴는 바로 done 상태로 설정 (서빙 준비 완료)
    const beverageItems = insertedItems
      .filter((oi: any) => stationMap[oi.menu_item_id] === 'beverages')
      .map((oi: any) => oi.id)

    if (beverageItems.length > 0) {
      await supabase
        .from('order_item')
        .update({ status: 'done' })
        .in('id', beverageItems)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    }

    if (kitchenInserts.length) {
      // use upsert-like logic: insert only those order_item_id not present
      const ids = kitchenInserts.map((q:any)=>q.order_item_id)
      const { data: existing = [] } = await supabase
        .from('kitchen_queue')
        .select('order_item_id')
        .in('order_item_id', ids)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
      const existingIds = new Set((existing||[]).map((e:any)=>e.order_item_id))
      const toInsert = kitchenInserts.filter((q:any)=>!existingIds.has(q.order_item_id))
      if (toInsert.length) {
        const { data: kdata, error: kerr } = await supabase
          .from('kitchen_queue')
          .insert(toInsert)
          .select('id, order_item_id, station, status')
        if (kerr) console.error('kitchen_queue insert error', kerr.message)
        else console.debug('kitchen_queue inserted', kdata)
      }
    }
  } catch (e) {
    console.error('enqueue kitchen_queue failed', e)
  }

  revalidatePath(`/order/${params.tableId}`)
  return { ok: true }
}

export async function ensureTableToken(tableId: string) {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await supabaseServer()
  // resolve to table UUID first (reuse logic)
  // try to find by id
  const { data: tblById } = await supabase
    .from('dining_table')
    .select('id, table_token')
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .maybeSingle()
  let idToUse = tblById?.id ?? null
  if (!idToUse) {
    const { data: byLabel } = await supabase
      .from('dining_table')
      .select('id, table_token')
      .eq('label', tableId)
      .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
      .maybeSingle()
    idToUse = byLabel?.id ?? null
  }
  if (!idToUse) throw new Error('테이블을 찾을 수 없습니다')

  // if token exists return it
  const { data: existing } = await supabase
    .from('dining_table')
    .select('table_token')
    .eq('id', idToUse)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
    .maybeSingle()
  if (existing?.table_token) return existing.table_token

  // otherwise generate and store using server-side UUID
  const token = randomUUID()
  const { error } = await supabase
    .from('dining_table')
    .update({ table_token: token })
    .eq('id', idToUse)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
  if (error) throw new Error(error.message)
  return token
}

export async function ensureAllTableTokens() {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const supabase = await supabaseServer()
  // find tables missing tokens
  const { data: rows = [], error } = await supabase
    .from('dining_table')
    .select('id')
    .is('table_token', null)
    .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return { created: 0 }

  let created = 0
  for (const r of rows) {
    try {
      const token = randomUUID()
      const { error: upErr } = await supabase
        .from('dining_table')
        .update({ table_token: token })
        .eq('id', r.id)
        .eq('restaurant_id', restaurantId) // restaurant_id 필터 추가
      if (upErr) {
        // continue on per-row errors
        console.error('failed to set token for', r.id, upErr.message)
        continue
      }
      created++
    } catch (e:any) {
      console.error('ensureAllTableTokens error', e?.message ?? e)
    }
  }
  return { created }
}
