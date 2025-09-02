// @ts-nocheck
"use server"

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function toggleSoldOut(id: string, isSoldOut: boolean) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('menu_item')
    .update({ is_sold_out: isSoldOut })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}

export async function upsertMenuItem(payload: {
  id?: string
  name: string
  price: number
  category_id?: string | null
  is_active?: boolean
}) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const row = {
    name: payload.name,
    price: payload.price,
    category_id: payload.category_id ?? null,
    is_active: payload.is_active ?? true,
  } as any

  // insert or update and return id
  let id: string | null = null
  if (payload.id) {
    const { data, error } = await supabase
      .from('menu_item')
      .update(row)
      .eq('id', payload.id)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    id = data?.id ?? payload.id
  } else {
    const { data, error } = await supabase
      .from('menu_item')
      .insert(row)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    id = data?.id ?? null
  }

  revalidatePath('/menu')
  return { id }
}

export async function deleteMenuItem(id: string) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const { error } = await supabase.from('menu_item').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}

export async function reorderMenuItems(order: { id: string; sort_order: number }[]) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const updates = order.map(o => ({
    id: o.id,
    sort_order: o.sort_order,
  }))
  const { error } = await supabase.from('menu_item').upsert(updates as any)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}

// 이미지 URL 저장/초기화
export async function setMenuItemImage(id: string, image_url: string | null) {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('menu_item')
    .update({ image_url })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}
