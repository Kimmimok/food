// @ts-nocheck
import { getOrCreateOpenOrder } from '@/app/order/actions'
import CartClientScript from '@/components/CartClientScript'
import ClientCart from '@/components/ClientCart'
import { supabaseServer } from '@/lib/supabase-server'
import ClientOrderPanel from '@/components/ClientOrderPanel'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const tableId = params.tableId
  
  return {
    title: `Welcome Food - 테이블 ${tableId}`,
    description: '맛있는 음식을 주문하세요',
  }
}

export default async function OrderQrPage({ params }: any) {
  const tableId = params.tableId
  const supabase = await supabaseServer()

  const { data: table } = await supabase
    .from('dining_table')
    .select('id,label')
    .eq('id', tableId)
    .single()

  const tableLabel = table?.label ?? `테이블 ${tableId}`
  const isValidTable = !!table

  let restaurantName = 'Restaurant'
  try {
    const { data: rs } = await supabase
      .from('restaurant_settings')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
    restaurantName = rs?.name ?? restaurantName
  } catch (e) {}

  const { data: items = [] } = await supabase
    .from('menu_item')
    .select('id,name,price,category_id,is_sold_out,image_url')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order', { ascending: true })

  const { data: categories = [] } = await supabase
    .from('menu_category')
    .select('id,name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  await getOrCreateOpenOrder(tableId, 'qr')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{restaurantName} ({tableLabel})</h1>
            <p className="text-base text-gray-600">메뉴를 선택하고 주문해보세요</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-sm mx-auto px-4 pb-32">
  <ClientOrderPanel tableId={tableId} items={items} categories={categories} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-screen-sm mx-auto p-4">
          <form data-cart-form="true" data-table-id={tableId} className="space-y-4">
            <div className="hidden">
              <ClientCart initialItems={[]} tableId={tableId} />
            </div>
            <input type="hidden" name="cart" value="[]" />

            <div className="flex gap-3">
              <button
                type="button"
                data-action="toggle-order-history"
                className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95 text-base border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📋 주문내역
              </button>
            </div>
          </form>
          <CartClientScript />
        </div>
      </div>
    </div>
  )
}

