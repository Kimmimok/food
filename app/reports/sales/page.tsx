// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
// charts removed — using summary cards instead
import { requireRole } from '@/lib/auth'

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
	await requireRole(['admin'])
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

	// Compute the most recent day's paid-order totals (align with dashboard)
	let dailyStat = { sales: 0, orders: 0, label: '-' }
	if ((daily as Row[]).length) {
		const rows = daily as Row[]
		const last = rows[rows.length - 1]
		try {
			const d = new Date(last.sales_date)
			const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
			const end = new Date(start)
			end.setDate(end.getDate() + 1)
			const { data: todays = [], error: e3 } = await supabase
				.from('order_ticket')
				.select('total')
				.eq('status', 'paid')
				.gte('created_at', start.toISOString())
				.lt('created_at', end.toISOString())
			if (e3) throw new Error(e3.message)
			const sales = (todays as any[]).reduce((s, r) => s + (r.total || 0), 0)
			const orders = (todays as any[]).length
			dailyStat = { sales, orders, label: new Date(last.sales_date).toLocaleDateString('ko-KR') }
		} catch (err) {
			dailyStat = { sales: Number(last.total_sales || 0), orders: Number(last.orders || 0), label: new Date(last.sales_date).toLocaleDateString('ko-KR') }
		}
	}

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

			{/* 요약 기간별 카드 (일별/주별/월별/전체) */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{(() => {
					const rows = daily as Row[]
					const parseDate = (s: string) => {
						const d = new Date(s)
						return new Date(d.getFullYear(), d.getMonth(), d.getDate())
					}

					const today = new Date()
					const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate())

					const sumRange = (days: number) => {
						if (!rows || rows.length === 0) return { sales: 0, orders: 0 }
						const cutoff = new Date(todayKey)
						cutoff.setDate(cutoff.getDate() - (days - 1))
						let sales = 0
						let orders = 0
						for (const r of rows) {
							const d = parseDate(r.sales_date)
							if (d >= cutoff && d <= todayKey) {
								sales += Number(r.total_sales || 0)
								orders += Number(r.orders || 0)
							}
						}
						return { sales, orders }
					}

                    

					const week = sumRange(7)
					const month = sumRange(30)
					const overall = { sales: totalSales, orders: totalOrders }

					const cards = [
						{ title: '일별', subtitle: dailyStat.label, sales: dailyStat.sales, orders: dailyStat.orders, color: 'from-blue-100 to-blue-200', emoji: '📅' },
						{ title: '주별 (7일)', subtitle: '최근 7일', sales: week.sales, orders: week.orders, color: 'from-green-100 to-green-200', emoji: '🗓️' },
						{ title: '월별 (30일)', subtitle: '최근 30일', sales: month.sales, orders: month.orders, color: 'from-purple-100 to-purple-200', emoji: '📈' },
						{ title: '전체', subtitle: '누적', sales: overall.sales, orders: overall.orders, color: 'from-orange-100 to-orange-200', emoji: '💰' }
					]

					return cards.map(c => {
						const avgOrder = c.orders > 0 ? Math.round(c.sales / c.orders) : 0
						return (
							<div key={c.title} className={`bg-gradient-to-r ${c.color} rounded-xl p-6 text-gray-900 border border-gray-200`}>
								<div className="flex items-center justify-between mb-4">
									<div>
										<p className="text-gray-900 text-lg font-medium">{c.title} <span className="opacity-70 text-base">{c.subtitle}</span></p>
									</div>
									<div className="text-3xl opacity-60">{c.emoji}</div>
								</div>

								<div className="space-y-3">
									<div>
										<p className="text-base opacity-70">매출</p>
										<p className="text-2xl font-bold text-gray-800">₩ {Number(c.sales || 0).toLocaleString()}</p>
									</div>
									<div>
										<p className="text-base opacity-70">주문수</p>
										<p className="text-2xl font-bold text-gray-800">{Number(c.orders || 0).toLocaleString()} 건</p>
									</div>
									<div>
										<p className="text-base opacity-70">주문당 평균</p>
										<p className="text-2xl font-bold text-gray-800">₩ {avgOrder.toLocaleString()}</p>
									</div>
								</div>
							</div>
						)
					})
				})()}
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

