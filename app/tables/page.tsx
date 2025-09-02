// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import TableCard from '@/components/TableCard'
import { seatTableAndOpenOrder, markTableEmpty } from './actions'
import { RealtimeSync } from '@/components/RealtimeSync'

 

export default async function TablesPage() {
	const supabase = await supabaseServer()
		const { data: tablesRaw = [] } = await supabase
			.from('dining_table')
			.select('*')
			.order('label', { ascending: true })

		// if no physical table rows, fall back to configured table_count
		let tables = tablesRaw || []
			if ((!tables || tables.length === 0)) {
				const { data: settings } = await supabase.from('restaurant_settings').select('table_count').eq('id', 1).maybeSingle()
						const count = settings?.table_count ?? 0
						const cap = settings?.default_table_capacity ?? 4
						const caps = Array.isArray(settings?.table_capacities) ? settings.table_capacities : []
						if (count > 0) {
							tables = Array.from({ length: count }, (_, i) => ({
								id: String(i + 1),
								label: String(i + 1),
								capacity: Number(caps[i] ?? cap),
								status: 'empty'
							}))
						}
			}

			// fetch latest order for the tables (모든 상태 포함)
			const tableIds = tables.map((t: any) => t.id)
			let ordersMap: Record<string, any> = {}
			const resp = await supabase
				.from('order_ticket')
				.select('id, table_id, status, created_at, items:order_item(name_snapshot, qty)')
				.in('table_id', tableIds)
				.in('status', ['open', 'sent_to_kitchen', 'completed', 'paid'])
				.order('created_at', { ascending: false })

			const orders = Array.isArray(resp.data) ? resp.data : []

			// map to latest per table (오픈된 주문 우선, 없으면 최근 완료된 주문)
			for (const o of orders) {
				if (!ordersMap[o.table_id]) {
					// 오픈된 주문이 있으면 그것을 사용
					if (o.status === 'open' || o.status === 'sent_to_kitchen') {
						ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
					}
					// 오픈된 주문이 없으면 최근 완료된 주문을 표시 (시간 초기화 확인용)
					else if (o.status === 'completed' || o.status === 'paid') {
						ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
					}
				} else {
					// 이미 오픈된 주문이 매핑되어 있으면 오픈된 주문만 유지
					const existing = ordersMap[o.table_id]
					if (existing.status === 'open' || existing.status === 'sent_to_kitchen') {
						continue
					}
					// 기존이 완료된 주문이면 더 최근의 완료된 주문으로 교체
					if ((o.status === 'completed' || o.status === 'paid') &&
						new Date(o.created_at) > new Date(existing.created_at)) {
						ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
					}
				}
			}

	const statusStats = tables.reduce((acc, table) => {
		acc[table.status] = (acc[table.status] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	return (
		<div className="space-y-6">
			<RealtimeSync />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">테이블 관리</h1>
					<p className="text-gray-600 mt-1">테이블 상태를 확인하고 주문을 관리하세요</p>
				</div>
				<div className="flex items-center space-x-4">
					<div className="text-sm text-gray-500">
						총 {tables.length}개 테이블
					</div>
				</div>
			</div>

			{/* 테이블 상태 요약 */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatusSummaryCard 
					title="사용중" 
					count={statusStats.seated || 0} 
					color="green" 
					icon="🟢" 
				/>
				<StatusSummaryCard 
					title="정리 필요" 
					count={statusStats.dirty || 0} 
					color="yellow" 
					icon="🟡" 
				/>
				<StatusSummaryCard 
					title="예약됨" 
					count={statusStats.reserved || 0} 
					color="blue" 
					icon="🔵" 
				/>
				<StatusSummaryCard 
					title="사용 가능" 
					count={statusStats.empty || 0} 
					color="gray" 
					icon="⚪" 
				/>
			</div>

			{/* 테이블 그리드 */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{tables.map((t: any) => (
						<div key={t.id}>
							<TableCard table={t} order={ordersMap[String(t.id)]} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function StatusSummaryCard({ title, count, color, icon }: {
	title: string;
	count: number;
	color: string;
	icon: string;
}) {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-gray-600">{title}</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
				</div>
				<div className="text-2xl">{icon}</div>
			</div>
		</div>
	);
}

function getTableStyle(status: string) {
	switch (status) {
		case 'seated': return 'border-green-300 bg-green-50 hover:bg-green-100'
		case 'dirty': return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
		case 'reserved': return 'border-blue-300 bg-blue-50 hover:bg-blue-100'
		default: return 'border-gray-300 bg-white hover:bg-gray-50'
	}
}

function getStatusBadgeStyle(status: string) {
	switch (status) {
		case 'seated': return 'bg-green-100 text-green-800'
		case 'dirty': return 'bg-yellow-100 text-yellow-800'
		case 'reserved': return 'bg-blue-100 text-blue-800'
		default: return 'bg-gray-100 text-gray-800'
	}
}

function getStatusLabel(status: string) {
	switch (status) {
		case 'seated': return '사용중'
		case 'dirty': return '정리 필요'
		case 'reserved': return '예약됨'
		default: return '사용 가능'
	}
}

function SeatButton({ tableId }: { tableId: string }) {
	const Seat = async () => { 'use server'; await seatTableAndOpenOrder(tableId) }
	return (
		<form action={Seat} className="flex-1">
			<button className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
				착석
			</button>
		</form>
	)
}

function EmptyButton({ tableId }: { tableId: string }) {
	const Empty = async () => { 'use server'; await markTableEmpty(tableId) }
	return (
		<form action={Empty} className="flex-1">
			<button className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
				비우기
			</button>
		</form>
	)
}

