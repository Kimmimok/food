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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{tableLabel}</h1>
            <p className="text-base text-gray-600">메뉴를 선택하고 주문해보세요</p>
            {!isValidTable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">⚠️ 테이블 정보가 등록되어 있지 않습니다. 임시 주문으로 처리됩니다.</p>
              </div>
            )}
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
          <form action={async (formData: FormData) => {
            'use server'
            const raw = String(formData.get('cart') || '[]')
            let parsed = []
            try { parsed = JSON.parse(raw) } catch {}
            await import('../actions').then(m=>m.addMultipleToTableOrder({ tableId, items: parsed }))
          }} className="space-y-4">
            {/* Client-side cart renders and CartClientScript syncs hidden input */}
            <ClientCart initialItems={[]} tableId={tableId} />
            <input type="hidden" name="cart" value="[]" />
            <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95">
              🛒 주문하기
            </button>
          </form>
          <CartClientScript />
        </div>
      </div>
    </div>
  )
}

function ClientOrderPanel({ tableId, categories, items }: any) {
  return (
    <div className="space-y-6 py-6">
      <CategoryTabs categories={categories} />
      <MenuGrid items={items} />
    </div>
  )
}

function CategoryTabs({ categories }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">카테고리</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {categories.map((c: any) => (
          <button
            key={c.id}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 text-sm font-medium whitespace-nowrap transition-colors duration-200 active:scale-95"
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

import MenuGrid from '@/components/MenuGridClient'
