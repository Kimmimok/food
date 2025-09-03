// @ts-nocheck
"use server"
import { supabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { ensureAllTableTokens } from '@/app/order/actions'

export async function upsertRestaurantSettings(payload: {
  name?: string
  business_number?: string
  phone?: string
  address?: string
  email?: string
  table_count?: number
  default_table_capacity?: number
  table_capacities?: number[]
  enable_new_order_sound?: boolean
  enable_new_order_popup?: boolean
}) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const row = {
    id: 1,
    name: payload.name ?? null,
    business_number: payload.business_number ?? null,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    email: payload.email ?? null,
  table_count: typeof payload.table_count !== 'undefined' ? payload.table_count : null,
  default_table_capacity: typeof payload.default_table_capacity !== 'undefined' ? payload.default_table_capacity : null,
  table_capacities: payload.table_capacities ? payload.table_capacities : null,
    enable_new_order_sound: typeof payload.enable_new_order_sound === 'boolean' ? payload.enable_new_order_sound : null,
    enable_new_order_popup: typeof payload.enable_new_order_popup === 'boolean' ? payload.enable_new_order_popup : null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('restaurant_settings').upsert(row)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

async function syncDiningTablesFromCount(desiredCount: number, defaultCapacity: number, capacities: number[] = []) {
  const supabase = await supabaseServer()

  // fetch existing tables ordered by label (assume numeric labels if possible)
  const { data: existing = [] } = await supabase.from('dining_table').select('id,label,capacity,status').order('label', { ascending: true })

  // convert labels to numbers when possible to identify next labels
  const numericLabels = existing.map((r:any) => ({ id: r.id, label: r.label, num: Number(r.label) || null }))

  // update capacities for first min(existing, desired) tables
  const updates: Array<any> = []

  for (let i = 0; i < Math.min(existing.length, desiredCount); i++) {
    const row = existing[i]
    const cap = (capacities[i] ?? defaultCapacity) || defaultCapacity
    if (row.capacity !== cap) updates.push({ id: row.id, capacity: cap })
    // ensure status is active
    if (row.status !== 'available' && row.status !== 'seated') updates.push({ id: row.id, status: 'available' })
  }

  // if desiredCount > existing.length, create the missing ones
  const toCreate: Array<any> = []
  if (desiredCount > existing.length) {
    const start = existing.length + 1
    for (let i = start; i <= desiredCount; i++) {
      const cap = (capacities[i-1] ?? defaultCapacity) || defaultCapacity
      toCreate.push({ label: String(i), capacity: cap, status: 'available' })
    }
  }

  // if desiredCount < existing.length, mark extras as removed
  const toRemove: Array<any> = []
  if (desiredCount < existing.length) {
    for (let i = desiredCount; i < existing.length; i++) {
      const row = existing[i]
      toRemove.push(row.id)
    }
  }

  // perform updates
  for (const u of updates) {
    await supabase.from('dining_table').update({ capacity: u.capacity, status: u.status ?? undefined }).eq('id', u.id)
  }

  if (toCreate.length) {
    await supabase.from('dining_table').insert(toCreate)
  }

  if (toRemove.length) {
    // mark removed so we don't delete historical orders; status 'removed'
    await supabase.from('dining_table').update({ status: 'removed' }).in('id', toRemove)
  }
}

export async function updateTableConfiguration(payload: { table_count: number; default_table_capacity?: number; table_capacities?: number[] }) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const desired = payload.table_count ?? 0
  const caps = Array.isArray(payload.table_capacities) ? payload.table_capacities : []
  const defaultCap = typeof payload.default_table_capacity === 'number' ? payload.default_table_capacity : 4
  await syncDiningTablesFromCount(desired, defaultCap, caps)
  // ensure all tables have tokens for QR generation
  try {
    await ensureAllTableTokens()
  } catch (e:any) {
    // non-fatal: token generation should not block table config updates
    console.error('ensureAllTableTokens failed', e?.message ?? e)
  }
  revalidatePath('/tables')
}
