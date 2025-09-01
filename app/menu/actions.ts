// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

function supabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } },
      headers: { get(name: string) { return headers().get(name) } }
    }
  )
}

export async function toggleSoldOut(id: string, isSoldOut: boolean) {
  const supabase = supabaseServer()
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
  const supabase = supabaseServer()
  const row = {
    id: payload.id,
    name: payload.name,
    price: payload.price,
    category_id: payload.category_id ?? null,
    is_active: payload.is_active ?? true,
  }
  const { error } = await supabase.from('menu_item').upsert(row as any, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}

export async function deleteMenuItem(id: string) {
  const supabase = supabaseServer()
  const { error } = await supabase.from('menu_item').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}

export async function reorderMenuItems(order: { id: string; sort_order: number }[]) {
  const supabase = supabaseServer()
  const updates = order.map(o => ({
    id: o.id,
    sort_order: o.sort_order,
  }))
  const { error } = await supabase.from('menu_item').upsert(updates as any)
  if (error) throw new Error(error.message)
  revalidatePath('/menu')
}
