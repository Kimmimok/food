// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import OrderBuilder from '@/components/orders/OrderBuilder'
import OrderItemsPanel from '@/components/orders/OrderItemsPanel'
import { seatTableAndOpenOrder } from '../actions'

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

export default async function TableDetailPage({ params }: { params: { tableId: string } }) {
  const supabase = supabaseServer()

  // 테이블 정보
  const { data: table } = await supabase
    .from('dining_table')
    .select('*')
    .eq('id', params.tableId)
    .single()

  if (!table) {
    return <div className="text-sm text-red-600">테이블을 찾을 수 없습니다.</div>
  }

  // 열린 주문 보장(없으면 서버 액션으로 생성)
  const { data: openOrder } = await supabase
    .from('order_ticket')
    .select('*')
    .eq('table_id', params.tableId)
    .eq('status', 'open')
    .single()

  if (!openOrder) {
    await seatTableAndOpenOrder(params.tableId)
  }

  // 메뉴/카테고리 로드
  const { data: categories = [] } = await supabase
    .from('menu_category')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: items = [] } = await supabase
    .from('menu_item')
    .select('*')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order', { ascending: true })

  // 다시 열린 주문 조회(방금 만들었을 수 있음)
  const { data: order } = await supabase
    .from('order_ticket')
    .select('*')
    .eq('table_id', params.tableId)
    .in('status', ['open', 'sent_to_kitchen']) // 열린 상태들
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!order) {
    return <div className="text-sm text-red-600">주문을 열 수 없습니다.</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-70">테이블</div>
          <h2 className="text-xl font-semibold">{table.label}</h2>
        </div>
        <div className="text-sm opacity-70">주문 상태: {order.status}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrderItemsPanel orderId={order.id} />
        <OrderBuilder orderId={order.id} categories={categories} items={items} />
      </div>
    </div>
  )
}
