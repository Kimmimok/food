// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import SalesChart from '@/components/reports/SalesChart'

async function sb() {
	const c = await cookies()
	const h = await headers()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: { get(n: string) { return c.get(n)?.value } },
			headers: { get(n: string) { return h.get(n) as any } },
		}
	)
}

type Row = {
	sales_date: string
	total_sales: number
	orders: number
}

export default async function SalesReportsPage() {
	const supabase = await sb()

	// 1) 일별 매출 (v_sales_daily 뷰)
	const { data: daily = [], error: e1 } = await supabase
		.from('v_sales_daily')
		.select('*')
		.order('sales_date', { ascending: true })
	if (e1) throw new Error(e1.message)

	// 2) 결제수단별 합계 (직접 집계)
	const { data: byMethod = [], error: e2 } = await supabase
		.from('payment')
		.select('method, amount, paid_at')
	if (e2) throw new Error(e2.message)

	const methodMap: Record<string, number> = {}
	for (const r of byMethod as { method: string; amount: number }[]) {
		methodMap[r.method] = (methodMap[r.method] ?? 0) + (Number(r.amount) || 0)
	}
	const byMethodRows = Object.entries(methodMap).map(([method, total]) => ({ method, total }))

	const totalSales = (daily as Row[]).reduce((s, r) => s + Number(r.total_sales || 0), 0)
	const totalOrders = (daily as Row[]).reduce((s, r) => s + Number(r.orders || 0), 0)
	const avgOrder = totalOrders ? Math.round(totalSales / totalOrders) : 0

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">매출 리포트</h1>
					<p className="text-gray-600 mt-1">일별 매출 현황과 결제 수단별 분석을 확인하세요</p>
				</div>
				<div className="flex items-center space-x-4">
					<button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						📥 CSV 다운로드
					</button>
					<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						📊 상세 분석
					</button>
				</div>
			</div>

			{/* 요약 통계 카드 */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-blue-100 text-sm font-medium">총 매출</p>
							<p className="text-3xl font-bold mt-2">₩ {totalSales.toLocaleString()}</p>
						</div>
						<div className="text-3xl opacity-80">💰</div>
					</div>
					<div className="mt-4 text-sm text-blue-100">
						전체 누적 매출
					</div>
				</div>

				<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-green-100 text-sm font-medium">총 주문수</p>
							<p className="text-3xl font-bold mt-2">{totalOrders.toLocaleString()} 건</p>
						</div>
						<div className="text-3xl opacity-80">📋</div>
					</div>
					<div className="mt-4 text-sm text-green-100">
						누적 처리 주문
					</div>
				</div>

				<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-purple-100 text-sm font-medium">주문당 평균</p>
							<p className="text-3xl font-bold mt-2">₩ {avgOrder.toLocaleString()}</p>
						</div>
						<div className="text-3xl opacity-80">🎯</div>
					</div>
					<div className="mt-4 text-sm text-purple-100">
						평균 주문 금액
					</div>
				</div>
			</div>

			{/* 차트 섹션 */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg font-semibold text-gray-900">일별 매출 추이</h2>
					<div className="flex items-center space-x-2">
						<button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">7일</button>
						<button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">30일</button>
						<button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">90일</button>
					</div>
				</div>
				<SalesChart rows={(daily as Row[]).map(r => ({
					date: r.sales_date,
					sales: Number(r.total_sales || 0),
					orders: Number(r.orders || 0)
				}))} />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 결제수단별 분석 */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">결제수단별 합계</h3>
					<div className="space-y-3">
						{byMethodRows.length > 0 ? byMethodRows.map((r, index) => (
							<div key={r.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
								<div className="flex items-center space-x-3">
									<div className={`w-3 h-3 rounded-full ${['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'][index % 4]}`}></div>
									<span className="font-medium text-gray-900 capitalize">{r.method}</span>
								</div>
								<span className="font-bold text-gray-900">₩ {r.total.toLocaleString()}</span>
							</div>
						)) : (
							<div className="text-center py-8 text-gray-500">
								<div className="text-4xl mb-2">📊</div>
								<p>결제 데이터가 없습니다.</p>
							</div>
						)}
					</div>
				</div>

				{/* 일자별 상세 */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">일자별 상세</h3>
					<div className="space-y-2 max-h-80 overflow-y-auto">
						{(daily as Row[]).length > 0 ? (daily as Row[]).map(r => (
							<div key={r.sales_date} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
								<div>
									<p className="font-medium text-gray-900">
										{new Date(r.sales_date).toLocaleDateString('ko-KR', { 
											month: 'short', 
											day: 'numeric',
											weekday: 'short'
										})}
									</p>
									<p className="text-sm text-gray-500">{Number(r.orders || 0).toLocaleString()}건</p>
								</div>
								<div className="text-right">
									<p className="font-bold text-gray-900">₩ {Number(r.total_sales || 0).toLocaleString()}</p>
									<p className="text-sm text-gray-500">
										평균 ₩ {r.orders ? Math.round(Number(r.total_sales) / Number(r.orders)).toLocaleString() : '0'}
									</p>
								</div>
							</div>
						)) : (
							<div className="text-center py-8 text-gray-500">
								<div className="text-4xl mb-2">📅</div>
								<p>매출 데이터가 없습니다.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border p-3 min-w-[180px]">
			<div className="text-xs opacity-70">{label}</div>
			<div className="text-lg font-semibold">{value}</div>
		</div>
	)
}

