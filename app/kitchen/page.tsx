import StationPage from './[station]/page'
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
				
				{/* header right side cleaned (station selector removed) */}
			</div>
			
			{/* 전체 주문 요약 (최상단으로 이동) */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<h3 className="text-lg font-semibold text-gray-900 mb-3">전체 주방 현황</h3>
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
					<div className="text-center p-3 bg-orange-50 rounded-lg">
						<div className="text-base text-gray-700">메인 : <span className="text-2xl font-bold text-orange-600">{stationCounts.main ?? 0}</span></div>
					</div>
					<div className="text-center p-3 bg-blue-50 rounded-lg">
						<div className="text-base text-gray-700">디저트 : <span className="text-2xl font-bold text-blue-600">{stationCounts.dessert ?? 0}</span></div>
					</div>
					<div className="text-center p-3 bg-yellow-50 rounded-lg">
						<div className="text-base text-gray-700">대기중 : <span className="text-2xl font-bold text-yellow-600">{totals.queued}</span></div>
					</div>
					<div className="text-center p-3 bg-blue-50 rounded-lg">
						<div className="text-base text-gray-700">준비중 : <span className="text-2xl font-bold text-blue-600">{totals.in_progress}</span></div>
					</div>
					<div className="text-center p-3 bg-green-50 rounded-lg">
						<div className="text-base text-gray-700">완료 : <span className="text-2xl font-bold text-green-600">{totals.done}</span></div>
					</div>
				</div>
			</div>
			
			{/* 각 스테이션의 페이지를 통합 표시 (개별 스테이션 페이지 컴포넌트를 임포트하여 렌더) */}
			<div className="space-y-6">
				{STATIONS.map(s => (
					<div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
						{/* StationPage expects params as a Promise; pass resolved promise */}
						<StationPage params={Promise.resolve({ station: s.id })} />
					</div>
				))}
			</div>
		</div>
	)
}
