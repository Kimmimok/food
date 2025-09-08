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

  try {
    // 먼저 메뉴가 존재하는지 확인
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_item')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch menu item:', fetchError)
      throw new Error('메뉴를 찾을 수 없습니다: ' + fetchError.message)
    }

    if (!menuItem) {
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

    // 간단하게 menu_item만 삭제 시도 (외래 키 제약 조건에 따라 자동으로 관련 데이터 삭제)
    const { error: deleteError } = await supabase
      .from('menu_item')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete menu item:', deleteError)

      // 더 구체적인 에러 메시지 제공
      if (deleteError.message.includes('foreign key')) {
        throw new Error('이 메뉴는 다른 데이터에서 참조되어 삭제할 수 없습니다. 관련 데이터를 먼저 삭제해주세요.')
      } else if (deleteError.message.includes('permission')) {
        throw new Error('메뉴 삭제 권한이 없습니다.')
      } else {
        throw new Error('메뉴 삭제 실패: ' + deleteError.message)
      }
    }

    revalidatePath('/menu')
    return { success: true, message: '메뉴가 성공적으로 삭제되었습니다.' }

  } catch (error: any) {
    console.error('Delete menu item error:', error)

    // 이미 우리가 만든 에러인 경우 그대로 전달
    if (error.message.includes('메뉴를 찾을 수 없습니다') ||
        error.message.includes('주문에서 사용되어') ||
        error.message.includes('참조되어 삭제할 수 없습니다') ||
        error.message.includes('삭제 권한이 없습니다') ||
        error.message.includes('메뉴 삭제 실패')) {
      throw error
    }

    // 기타 예기치 않은 에러
    throw new Error('메뉴 삭제 중 알 수 없는 오류가 발생했습니다: ' + (error.message || 'Unknown error'))
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
