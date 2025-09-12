// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import CashierPanel from '@/components/CashierPanel'
import { requireRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase-server'
import { formatCurrency } from '@/lib/utils'
import { PaymentForm } from '@/components/PaymentForm'
import { RefreshButton } from '@/components/RefreshButton'
import { RealtimeSync } from '@/components/RealtimeSync'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome Food - 계산 관리',
  description: '주문 결제를 처리하세요',
}

async function sb() {
	const c = await cookies()
	const h = await headers()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: { get(n: string){ return c.get(n)?.value } },
			headers: { get(n: string){ return h.get(n) } }
		}
	)
}

export default async function CashierPage() {
	await requireRole(['manager','admin'])
	const supabase = await sb()

	// 열린 주문 불러오기 (세부 항목 포함)
	const { data: ordersData, error } = await supabase
		.from('order_ticket')
		.select(`
			id, table_id, total, status, created_at,
			dining_table ( label ),
			order_item (
				id, name_snapshot, qty, price_snapshot, status,
				menu_item ( name, price )
			)
		`)
		.in('status', ['open', 'sent_to_kitchen'])

	console.log('Cashier page - orders query result:', ordersData?.length || 0, 'orders')
	console.log('Cashier page - orders data:', ordersData)
	console.log('Cashier page - query error:', error)

	// 디버깅: 전체 order_ticket 데이터 확인
	const { data: allOrders, error: allError } = await supabase
		.from('order_ticket')
		.select('id, status, total, created_at')
		.limit(10)

	console.log('Cashier page - all order tickets:', allOrders)
	console.log('Cashier page - all orders error:', allError)

	// 디버깅: order_item 데이터 확인
	const { data: allItems, error: itemsError } = await supabase
		.from('order_item')
		.select('id, status, order_id')
		.limit(10)

	console.log('Cashier page - all order items:', allItems)
	console.log('Cashier page - order items error:', itemsError)

	// 디버깅: order_ticket의 모든 상태 확인
	const { data: statusCheck, error: statusError } = await supabase
		.from('order_ticket')
		.select('status')
		.limit(20)

	console.log('Cashier page - status distribution:', statusCheck?.reduce((acc, item) => {
		acc[item.status] = (acc[item.status] || 0) + 1
		return acc
	}, {}))
	console.log('Cashier page - status check error:', statusError)

	// 더 넓은 범위의 상태로 쿼리 시도 (결제 완료된 것만 제외)
	const { data: broaderQuery, error: broaderError } = await supabase
		.from('order_ticket')
		.select(`
			id, table_id, total, status, created_at,
			dining_table ( label ),
			order_item (
				id, name_snapshot, qty, price_snapshot, status,
				menu_item ( name, price )
			)
		`)
		.not('status', 'eq', 'paid')
		.limit(10)

	console.log('Cashier page - broader query result:', broaderQuery?.length || 0, 'orders')
	console.log('Cashier page - broader query data:', broaderQuery)
	console.log('Cashier page - broader query error:', broaderError)

	// 최적의 쿼리 선택: broaderQuery가 더 많은 데이터를 반환하면 그것을 사용
	let finalOrders = ordersData
	if (broaderQuery && broaderQuery.length > (ordersData?.length || 0)) {
		console.log('Using broader query results (more data available)')
		finalOrders = broaderQuery
	}

	const orders = finalOrders || []

	return (
		<div className="space-y-6">
			<RealtimeSync />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">계산대</h1>
					<p className="text-gray-600 mt-1">주문 결제를 처리하고 테이블을 정리하세요</p>
				</div>
				<div className="flex items-center space-x-4">
					<RefreshButton
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
					>
						새로고침
					</RefreshButton>
					<div className="text-sm text-gray-500">
						대기중인 주문: {orders.length}건
					</div>
					<div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
						결제 시스템 활성
					</div>
				</div>
			</div>
			
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<CashierPanel orders={orders as any[]} />
			</div>
		</div>
	)
}
