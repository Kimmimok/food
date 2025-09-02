// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import CashierPanel from '@/components/CashierPanel'
import { requireRole } from '@/lib/auth'

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

	// 열린 주문 불러오기
	const { data: orders = [] } = await supabase
		.from('order_ticket')
		.select(`
			id, table_id, total, status, created_at,
			dining_table ( label )
		`)
		.in('status', ['open', 'sent_to_kitchen'])

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">계산대</h1>
					<p className="text-gray-600 mt-1">주문 결제를 처리하고 테이블을 정리하세요</p>
				</div>
				<div className="flex items-center space-x-4">
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
