// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

export async function getOrCreateOpenOrder(tableId: string, channel: 'qr' | 'dine_in' = 'qr') {
  const supabase = await supabaseServer()
  // Resolve tableId to a UUID in dining_table.id.
  // Prefer matching by table_token (secure token). If not found, fall back to id or label.
  let tableUuid: string | null = null

  // try token match first
  if (tableId) {
    const { data: byToken } = await supabase.from('dining_table').select('id').eq('table_token', tableId).maybeSingle()
    if (byToken) tableUuid = byToken.id
  }

  // try UUID id
  if (!tableUuid) {
    const isUuid = typeof tableId === 'string' && /^[0-9a-fA-F-]{36}$/.test(tableId)
    if (isUuid) {
      const { data: tbl } = await supabase.from('dining_table').select('id').eq('id', tableId).maybeSingle()
      if (tbl) tableUuid = tbl.id
    }
  }

  // try label
  if (!tableUuid) {
    const { data: byLabel } = await supabase.from('dining_table').select('id').eq('label', tableId).maybeSingle()
    if (byLabel) tableUuid = byLabel.id
  }

  // create new dining_table row if still not found (for backward compatibility)
  if (!tableUuid) {
    const { data: created, error: creErr } = await supabase.from('dining_table').insert({ label: tableId, status: 'seated' }).select('id').maybeSingle()
    if (creErr) throw new Error(creErr.message)
    tableUuid = created?.id ?? null
  }

  // Search for existing open order for the resolved table UUID
  const { data: open, error: e1 } = await supabase
    .from('order_ticket')
    .select('*')
    .eq('table_id', tableUuid)
    .in('status', ['open', 'sent_to_kitchen'])
    .order('created_at', { ascending: false })
    .limit(1)
  if (e1) throw new Error(e1.message)

  if (open && open.length > 0) return open[0]

  const { data, error: e2 } = await supabase
    .from('order_ticket')
    .insert({ table_id: tableUuid, status: 'open', channel })
    .select('*')
    .single()
  if (e2) throw new Error(e2.message)

  // 테이블 상태도 사용중으로 전환(선택)
  if (tableUuid) await supabase.from('dining_table').update({ status: 'seated' }).eq('id', tableUuid)

  return data
}

export async function addToTableOrder(params: { tableId: string; menuItemId: string; qty: number; note?: string }) {
  const supabase = await supabaseServer()
  const order = await getOrCreateOpenOrder(params.tableId, 'qr')

  // 메뉴 스냅샷 조회
  const { data: mi, error: e1 } = await supabase
    .from('menu_item')
    .select('name, price')
    .eq('id', params.menuItemId)
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
  }
  const { error: e2 } = await supabase.from('order_item').insert(row)
  if (e2) throw new Error(e2.message)

  // 첫 추가 시 주방으로 전송 상태로 전환
  const { error: e3 } = await supabase
    .from('order_ticket')
    .update({ status: 'sent_to_kitchen' })
    .eq('id', order.id)
    .in('status', ['open'])
  if (e3) throw new Error(e3.message)

  revalidatePath(`/order/${params.tableId}`)
  return { ok: true }
}

export async function addMultipleToTableOrder(params: { tableId: string; items: Array<{ menuItemId: string; qty: number; note?: string }> }) {
  const supabase = await supabaseServer()
  const order = await getOrCreateOpenOrder(params.tableId, 'qr')

  // fetch menu snapshots for all item ids
  const ids = params.items.map(i => i.menuItemId)
  const { data: menuItems = [], error: e1 } = await supabase
    .from('menu_item')
    .select('id, name, price')
    .in('id', ids)
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
  }))

  const { error: e2 } = await supabase.from('order_item').insert(rows)
  if (e2) throw new Error(e2.message)

  // mark ticket as sent_to_kitchen if it was open
  const { error: e3 } = await supabase
    .from('order_ticket')
    .update({ status: 'sent_to_kitchen' })
    .eq('id', order.id)
    .in('status', ['open'])
  if (e3) throw new Error(e3.message)

  revalidatePath(`/order/${params.tableId}`)
  return { ok: true }
}

export async function ensureTableToken(tableId: string) {
  const supabase = await supabaseServer()
  // resolve to table UUID first (reuse logic)
  // try to find by id
  const { data: tblById } = await supabase.from('dining_table').select('id, table_token').eq('id', tableId).maybeSingle()
  let idToUse = tblById?.id ?? null
  if (!idToUse) {
    const { data: byLabel } = await supabase.from('dining_table').select('id, table_token').eq('label', tableId).maybeSingle()
    idToUse = byLabel?.id ?? null
  }
  if (!idToUse) throw new Error('테이블을 찾을 수 없습니다')

  // if token exists return it
  const { data: existing } = await supabase.from('dining_table').select('table_token').eq('id', idToUse).maybeSingle()
  if (existing?.table_token) return existing.table_token

  // otherwise generate and store using server-side UUID
  const token = randomUUID()
  const { error } = await supabase.from('dining_table').update({ table_token: token }).eq('id', idToUse)
  if (error) throw new Error(error.message)
  return token
}

export async function ensureAllTableTokens() {
  const supabase = await supabaseServer()
  // find tables missing tokens
  const { data: rows = [], error } = await supabase.from('dining_table').select('id').is('table_token', null)
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return { created: 0 }

  let created = 0
  for (const r of rows) {
    try {
      const token = randomUUID()
      const { error: upErr } = await supabase.from('dining_table').update({ table_token: token }).eq('id', r.id)
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
