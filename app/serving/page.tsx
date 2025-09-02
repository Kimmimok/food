// @ts-nocheck
import Link from 'next/link'
import { supabaseServer } from '../../lib/supabase-server'
import { requireRole } from '../../lib/auth'

const STATIONS = [
	{ id: 'main', name: '메인 키친', desc: '메인 요리 및 밥류', icon: '🍳' },
	{ id: 'bar', name: '바', desc: '음료 및 주류', icon: '🥤' },
	{ id: 'dessert', name: '디저트', desc: '후식 및 커피', icon: '🍰' },
]

export default async function ServingHome() {
	await requireRole(['manager','admin'])
	const supabase = await supabaseServer()

	// Get completed items that are ready for serving
	const { data: kq = [] } = await supabase
		.from('kitchen_queue')
		.select(`
			id, station, status, created_at, started_at, done_at,
			order_item:order_item_id ( id, name_snapshot, qty, status, order_ticket:order_id ( id, table_id ) )
		`)
		.eq('status', 'done')
		.order('done_at', { ascending: false })

	let stationCounts: Record<string, number> = { main: 0, bar: 0, dessert: 0 }
	let recent: any[] = []
	let tableLabelMap: Record<string,string> = {}

	if ((kq || []).length > 0) {
		// Count completed items by station
		for (const r of (kq || [])) {
			stationCounts[r.station] = (stationCounts[r.station]||0)+1
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
		// Fallback to order_item source
		const { data: items = [] } = await supabase
			.from('order_item')
			.select(`
				id, status, created_at,
				name_snapshot, qty,
				order_ticket:order_id ( id, table_id ),
				menu_item:menu_item_id ( id, station )
			`)
			.eq('status', 'done')
			.order('created_at', { ascending: false })

		for (const it of items || []) {
			const st = (it as any).menu_item?.station || 'main'
			stationCounts[st] = (stationCounts[st]||0)+1
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

	const totalCompleted = Object.values(stationCounts).reduce((sum, count) => sum + count, 0)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">서빙 관리 시스템</h1>
					<p className="text-gray-600 mt-1">완료된 식사들을 서빙하고 관리하세요</p>
				</div>
				<div className="flex items-center space-x-3">
					<div className="text-sm text-gray-500">
						서빙 준비 완료
					</div>
					<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{STATIONS.map(s => (
					<div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between mb-4">
							<div className="text-3xl">{s.icon}</div>
							<div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">
								준비완료
							</div>
						</div>

						<h3 className="text-xl font-bold text-gray-900 mb-2">{s.name}</h3>
						<p className="text-gray-600 text-sm mb-6">{s.desc}</p>

						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-500">
								서빙 대기: <span className="font-semibold text-green-600">{stationCounts[s.id] ?? 0}건</span>
							</div>
							<Link
								className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
								href={`/serving/${s.id}`}
							>
								서빙 관리
							</Link>
						</div>
					</div>
				))}
			</div>

			{/* 전체 서빙 현황 */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">전체 서빙 현황</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="text-center p-4 bg-green-50 rounded-lg">
						<div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
						<div className="text-sm text-gray-600">서빙 준비 완료</div>
					</div>
					<div className="text-center p-4 bg-blue-50 rounded-lg">
						<div className="text-2xl font-bold text-blue-600">-</div>
						<div className="text-sm text-gray-600">서빙 진행중</div>
					</div>
					<div className="text-center p-4 bg-purple-50 rounded-lg">
						<div className="text-2xl font-bold text-purple-600">-</div>
						<div className="text-sm text-gray-600">서빙 완료</div>
					</div>
					<div className="text-center p-4 bg-orange-50 rounded-lg">
						<div className="text-2xl font-bold text-orange-600">-</div>
						<div className="text-sm text-gray-600">평균 서빙시간</div>
					</div>
				</div>
			</div>
		</div>
	)
}
