// @ts-nocheck
import { addToTableOrder, getOrCreateOpenOrder } from '../actions'
import CartClientScript from '@/components/CartClientScript'
import ClientCart from '@/components/ClientCart'
import { supabaseServer } from '@/lib/supabase-server'

export default async function OrderQrPage({ params }: any) {
  const tableId = params.tableId
  const supabase = await supabaseServer()

  const { data: table } = await supabase
    .from('dining_table')
    .select('id,label')
    .eq('id', tableId)
    .single()

  // If table row is missing (e.g., QR contains a numeric id not present in dining_table),
  // we still show the menu and allow ordering by using a fallback label.
  const tableLabel = table?.label ?? `테이블 ${tableId}`
  const isValidTable = !!table

  // 카테고리/메뉴 조회(판매중만)
  const { data: categories = [] } = await supabase
    .from('menu_category')
    .select('id,name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: items = [] } = await supabase
    .from('menu_item')
    .select('id,name,price,category_id,is_sold_out,image_url')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order', { ascending: true })

  await getOrCreateOpenOrder(tableId, 'qr')

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">{tableLabel} 주문</h1>
        <p className="text-sm opacity-70">원하는 메뉴를 선택해 담아주세요</p>
        {!isValidTable && (
          <div className="text-xs text-yellow-600">테이블 정보가 등록되어 있지 않습니다. 임시 주문으로 처리됩니다.</div>
        )}
      </div>

      <ClientOrderPanel tableId={tableId} categories={categories} items={items} />

      {/* Cart and submit form */}
      <div>
        <form action={async (formData: FormData) => {
          'use server'
          const raw = String(formData.get('cart') || '[]')
          let parsed = []
          try { parsed = JSON.parse(raw) } catch {}
          await import('../actions').then(m=>m.addMultipleToTableOrder({ tableId, items: parsed }))
        }} className="space-y-3">
          {/* Client-side cart renders and CartClientScript syncs hidden input */}
          <ClientCart initialItems={[]} tableId={tableId} />
          <input type="hidden" name="cart" value="[]" />
          <button type="submit" className="w-full px-3 py-2 bg-green-600 text-white rounded">주문 제출</button>
        </form>
        <CartClientScript />
      </div>
    </div>
  )
}

function ClientOrderPanel({ tableId, categories, items }: any) {
  return (
    <div className="space-y-4">
      <CategoryTabs categories={categories} />
      <MenuGrid items={items} />
    </div>
  )
}

function CategoryTabs({ categories }: any) {
  // 간단 표시(필터는 생략 - MVP)
  return (
    <div className="flex gap-2 overflow-x-auto">
      {categories.map((c: any) => (
        <span key={c.id} className="px-3 py-1 rounded-full border text-sm whitespace-nowrap">{c.name}</span>
      ))}
    </div>
  )
}

import MenuGrid from '@/components/MenuGridClient'
