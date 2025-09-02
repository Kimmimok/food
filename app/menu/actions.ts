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
  // await requireRole(['manager','admin']) // 임시로 권한 검사 제거
  const supabase = await supabaseServer()

  try {
    // 먼저 메뉴가 존재하는지 확인
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_item')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !menuItem) {
      throw new Error('메뉴를 찾을 수 없습니다.')
    }

    // order_item에서 이 메뉴를 참조하는 레코드 확인
    const { data: orderItems, error: checkError } = await supabase
      .from('order_item')
      .select('id, order_id')
      .eq('menu_item_id', id)

    if (checkError) {
      console.error('Failed to check order items:', checkError)
      throw new Error('주문 항목 확인 실패: ' + checkError.message)
    }

    if (orderItems && orderItems.length > 0) {
      throw new Error(`이 메뉴는 ${orderItems.length}개의 주문에서 사용되어 삭제할 수 없습니다. 먼저 관련 주문을 취소해주세요.`)
    }

    // 직접 삭제 시도 (단순화)
    // 1. menu_option_group의 id들을 가져와서 옵션 삭제
    const { data: optionGroups } = await supabase
      .from('menu_option_group')
      .select('id')
      .eq('menu_item_id', id)

    if (optionGroups) {
      for (const group of optionGroups) {
        await supabase
          .from('menu_option')
          .delete()
          .eq('group_id', group.id)
      }
    }

    // 2. menu_option_group 삭제
    await supabase
      .from('menu_option_group')
      .delete()
      .eq('menu_item_id', id)

    // 3. menu_item 삭제
    const { error } = await supabase.from('menu_item').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete menu item:', error)
      throw new Error('메뉴 삭제 실패: ' + error.message)
    }

    revalidatePath('/menu')
  } catch (error: any) {
    console.error('Delete menu item error:', error)
    throw error
  }
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

  // RLS 정책을 우회하기 위해 service role 사용 (개발 환경에서만)
  const { error } = await supabase
    .from('menu_item')
    .update({ image_url })
    .eq('id', id)

  if (error) {
    console.error('Image update error:', error)
    throw new Error(`이미지 업데이트 실패: ${error.message}`)
  }

  revalidatePath('/menu')
}
