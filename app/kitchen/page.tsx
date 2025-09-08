import Link from 'next/link'
import { supabaseServer } from '../../lib/supabase-server'
import { requireRole } from '../../lib/auth'
import { RealtimeSync } from '../../components/RealtimeSync'

const STATIONS = [
	{ id: 'main', name: '메인 키친', desc: '메인 요리 및 밥류', icon: '🍳' },
	{ id: 'dessert', name: '디저트', desc: '후식 및 커피', icon: '🍰' },
]

export default async function KitchenHome() {
	await requireRole(['manager','admin'])
	const supabase = await supabaseServer()

	// Prefer kitchen_queue if it has rows (admin/kitchen inserts or triggers)
	const { data: kq = [] } = await supabase
		.from('kitchen_queue')
		.select(`
			id, station, status, created_at, started_at, done_at,
			order_item:order_item_id ( id, name_snapshot, qty, status, order_ticket:order_id ( id, table_id ) )
		`)
		.order('created_at', { ascending: false })

	let stationCounts: Record<string, number> = { main: 0, dessert: 0 }
	const totals = { queued: 0, in_progress: 0, done: 0 }
	let recent: any[] = []
	let tableLabelMap: Record<string,string> = {}

	if ((kq || []).length > 0) {
		// use kitchen_queue rows
		for (const r of (kq || [])) {
			// normalize order_item (select may return array)
			const oi = Array.isArray(r.order_item) ? r.order_item[0] : r.order_item
			const st = oi?.status ?? r.status
			// beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
			const effectiveStation = r.station === 'bar' ? 'beverages' : r.station
			// 완료된 항목들은 카운트하지 않음 (서빙 페이지로 이동)
			if (st === 'queued' || st === 'in_progress') {
				stationCounts[effectiveStation] = (stationCounts[effectiveStation]||0)+1
			}
			if (st in totals) (totals as any)[st]++
		}
		recent = (kq || []).slice(0,10)
		const tableIds = Array.from(new Set(recent.map((q:any)=>q.order_item?.order_ticket?.table_id).filter(Boolean)))
		if (tableIds.length) {
			const { data: tables = [] } = await supabase
				.from('dining_table')
				.select('id,label')
				.in('id', tableIds)
			tableLabelMap = Object.fromEntries((tables||[]).map((t:any)=>[t.id, t.label]))
		}
	} else {
		// fallback to order_item source
		const { data: items = [] } = await supabase
			.from('order_item')
			.select(`
				id, status, created_at,
				name_snapshot, qty,
				order_ticket:order_id ( id, table_id ),
				menu_item:menu_item_id ( id, station )
			`)
			.order('created_at', { ascending: false })
		for (const it of items || []) {
			const st = (it as any).menu_item?.station || 'main'
			// beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
			const effectiveStation = st === 'bar' ? 'beverages' : st
			// 완료된 항목들은 카운트하지 않음 (서빙 페이지로 이동)
			if (it.status === 'queued' || it.status === 'in_progress') {
				stationCounts[effectiveStation] = (stationCounts[effectiveStation]||0)+1
			}
			if (it.status in totals) (totals as any)[it.status]++
		}
		recent = (items || []).slice(0, 10).map((it: any) => ({
			id: it.id,
			status: it.status,
			order_item: {
				id: it.id,
				name_snapshot: it.name_snapshot,
				qty: it.qty,
				order_ticket: it.order_ticket
			}
		}))
		const tableIds = Array.from(new Set(recent.map((q:any)=>q.order_item?.order_ticket?.table_id).filter(Boolean)))
		if (tableIds.length) {
			const { data: tables = [] } = await supabase
				.from('dining_table')
				.select('id,label')
				.in('id', tableIds)
			tableLabelMap = Object.fromEntries((tables||[]).map((t:any)=>[t.id, t.label]))
		}
	}

	// average processing time (done_at - started_at) in seconds when kitchen_queue present
	let avgSeconds: number | null = null
	if ((kq || []).length > 0) {
		const times: number[] = []
		for (const r of kq || []) {
			if (r.started_at && r.done_at) {
				const s = new Date(r.started_at).getTime()
				const d = new Date(r.done_at).getTime()
				if (!isNaN(s) && !isNaN(d) && d > s) times.push((d - s) / 1000)
			}
		}
		if (times.length) avgSeconds = Math.round(times.reduce((a,b)=>a+b,0)/times.length)
	}

	return (
		<div className="space-y-4">
			<RealtimeSync />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">주방 디스플레이 시스템</h1>
					<p className="text-sm text-gray-600 mt-1">스테이션별로 주문 현황을 확인하고 관리하세요</p>
				</div>
				<div className="flex items-center space-x-2">
					<div className="text-xs text-gray-500">
						주방 스테이션 선택
					</div>
					<div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
				</div>
			</div>
			
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{STATIONS.map(s => (
					<div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between mb-3">
							<div className="text-3xl">{s.icon}</div>
							<div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
								활성
							</div>
						</div>
						
						<h3 className="text-lg font-bold text-gray-900 mb-2">{s.name}</h3>
						<p className="text-xs text-gray-600 mb-4">{s.desc}</p>
						
						<div className="flex items-center justify-between">
							<div className="text-base text-gray-500">
								대기 주문: <span className="font-bold text-orange-600 text-lg">{stationCounts[s.id] ?? 0}건</span>
							</div>
							<Link 
								className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs" 
								href={`/kitchen/${s.id}`}
							>
								스테이션 열기
							</Link>
						</div>
					</div>
				))}
			</div>
			
			{/* 전체 주문 요약 */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<h3 className="text-base font-semibold text-gray-900 mb-3">전체 주방 현황</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="text-center p-3 bg-orange-50 rounded-lg">
						<div className="text-xl font-bold text-orange-600">{totals.queued}</div>
						<div className="text-xs text-gray-600 mt-1">대기중</div>
					</div>
					<div className="text-center p-3 bg-blue-50 rounded-lg">
						<div className="text-xl font-bold text-blue-600">{totals.in_progress}</div>
						<div className="text-xs text-gray-600 mt-1">준비중</div>
					</div>
					<div className="text-center p-3 bg-green-50 rounded-lg">
						<div className="text-xl font-bold text-green-600">{totals.done}</div>
						<div className="text-xs text-gray-600 mt-1">완료</div>
					</div>
					<div className="text-center p-3 bg-purple-50 rounded-lg">
						<div className="text-xl font-bold text-purple-600">-</div>
						<div className="text-xs text-gray-600 mt-1">평균 처리시간</div>
					</div>
				</div>
			</div>
		</div>
	)
}
