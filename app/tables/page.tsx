// @ts-nocheck
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { seatTableAndOpenOrder, markTableEmpty } from './actions'

async function supabaseServer() {
	const cookieStore = await cookies()
	const h = await headers()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: { get(name: string) { return cookieStore.get(name)?.value } },
			headers: { get(name: string) { return h.get(name) } }
		}
	)
}

export default async function TablesPage() {
	const supabase = await supabaseServer()
	const { data: tables = [] } = await supabase
		.from('dining_table')
		.select('*')
		.order('label', { ascending: true })

	const statusStats = tables.reduce((acc, table) => {
		acc[table.status] = (acc[table.status] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	return (
		<div className="space-y-6">
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
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
					{tables.map(t => (
						<div key={t.id} className={`rounded-lg border-2 p-4 flex flex-col ${getTableStyle(t.status)}`}>
							<div className="flex items-center justify-between mb-3">
								<div className="font-bold text-lg">{t.label}</div>
								<span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeStyle(t.status)}`}>
									{getStatusLabel(t.status)}
								</span>
							</div>
							
							<div className="text-sm text-gray-600 mb-4">
								최대 {t.capacity}명
							</div>
							
							<div className="flex gap-2 mt-auto">
								<Link 
									href={`/tables/${t.id}`} 
									className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
								>
									상세보기
								</Link>
								{t.status !== 'seated' ? (
									<SeatButton tableId={t.id} />
								) : (
									<EmptyButton tableId={t.id} />
								)}
							</div>
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

