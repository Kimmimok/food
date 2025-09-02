// @ts-nocheck
import { addToTableOrder, getOrCreateOpenOrder } from '../actions'
import CartClientScript from '@/components/CartClientScript'
import ClientCart from '@/components/ClientCart'
import { supabaseServer } from '@/lib/supabase-server'
import ClientOrderPanel from '@/components/ClientOrderPanel'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{tableLabel}</h1>
            <p className="text-base text-gray-600">메뉴를 선택하고 주문해보세요</p>
            {/* 테이블 미등록 경고 제거 (디자인 정리) */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-sm mx-auto px-4 pb-32">
        <ClientOrderPanel tableId={tableId} categories={categories} items={items} />
      </div>

      {/* Cart and submit form - Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-screen-sm mx-auto p-4">
          <form data-cart-form="true" data-table-id={tableId} action={async (formData: FormData) => {
            'use server'
            const raw = String(formData.get('cart') || '[]')
            let parsed = []
            try { parsed = JSON.parse(raw) } catch {}
            await import('../actions').then(m=>m.addMultipleToTableOrder({ tableId, items: parsed }))
          }} className="space-y-4">
            {/* Client-side cart renders and CartClientScript syncs hidden input */}
            <ClientCart initialItems={[]} tableId={tableId} />
            <input type="hidden" name="cart" value="[]" />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                data-action="toggle-order-history"
                className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95 text-base border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={false} // 장바구니 상태에 따라 활성화/비활성화할 수 있음
              >
                📋 주문내역
              </button>
              <button type="submit" disabled className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95">
                🛒 주문하기
              </button>
            </div>
          </form>
          <CartClientScript />
        </div>
      </div>
    </div>
  )
}

import MenuGrid from '@/components/MenuGridClient'
