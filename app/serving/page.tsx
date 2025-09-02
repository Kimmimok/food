// @ts-nocheck
import Link from 'next/link'
import { supabaseServer } from '../../lib/supabase-server'
import { requireRole } from '../../lib/auth'

const STATIONS = [
	{ id: 'main', name: '메인 키친', desc: '메인 요리 및 밥류', icon: '🍳' },
	{ id: 'beverages', name: '음료/주류', desc: '음료 및 주류 서빙', icon: '🥤' },
	{ id: 'dessert', name: '디저트', desc: '후식 및 커피', icon: '🍰' },
]

export default async function ServingHome() {
	await requireRole(['manager','admin'])
	const supabase = await supabaseServer()

	// Get completed items that are ready for serving
	// 음료/주류는 kitchen_queue에 없으므로 order_item에서 직접 가져옴
	let items: any[] = []
	let queryError = null

	try {
		const { data, error } = await supabase
			.from('order_item')
			.select(`
				id, status,
				name_snapshot, qty,
				order_id,
				menu_item_id,
				order_ticket:order_id (
					id, created_at, table_id
				)
			`)
			.eq('status', 'done')

		if (error) {
			console.error('Serving page - main query error:', error)
			console.error('Error details:', {
				message: error.message,
				details: error.details,
				hint: error.hint,
				code: error.code
			})
			queryError = error
		} else {
			// 데이터를 created_at 기준으로 정렬
			items = (data || []).sort((a, b) => {
				const aTime = a.order_ticket?.created_at ? new Date(a.order_ticket.created_at).getTime() : 0
				const bTime = b.order_ticket?.created_at ? new Date(b.order_ticket.created_at).getTime() : 0
				return bTime - aTime // 최신순
			})
		}
	} catch (err) {
		console.error('Serving page - query exception:', err)
		console.error('Exception details:', {
			message: err?.message,
			stack: err?.stack,
			name: err?.name
		})
		queryError = err
	}

	if (queryError) {
		// 에러가 발생하면 빈 배열로 처리하되, 더 자세한 정보 표시
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">서빙 관리 시스템</h1>
						<p className="text-gray-600 mt-1">완료된 식사들을 서빙하고 관리하세요</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<div className="text-center">
						<h3 className="text-lg font-semibold text-red-800 mb-2">데이터베이스 오류</h3>
						<p className="text-red-600 mb-2">서빙 데이터를 불러오는 중 오류가 발생했습니다.</p>
						<p className="text-sm text-red-500 mb-4">잠시 후 다시 시도해주세요.</p>
						<div className="text-xs text-red-400 bg-red-100 p-3 rounded">
							<p><strong>오류 유형:</strong> {queryError?.name || 'Unknown Error'}</p>
							<p><strong>오류 메시지:</strong> {queryError?.message || '알 수 없는 오류'}</p>
							{queryError?.code && <p><strong>오류 코드:</strong> {queryError.code}</p>}
							{queryError?.details && <p><strong>상세 정보:</strong> {queryError.details}</p>}
							{queryError?.hint && <p><strong>힌트:</strong> {queryError.hint}</p>}
							<div className="mt-2 pt-2 border-t border-red-300">
								<p className="mt-2">💡 <strong>해결 방법:</strong></p>
								<ul className="text-left list-disc list-inside mt-1">
									<li>데이터베이스 연결 상태를 확인하세요</li>
									<li>필요한 테이블이 존재하는지 확인하세요</li>
									<li>네트워크 연결을 확인하세요</li>
									<li>브라우저 콘솔에서 자세한 오류 로그를 확인하세요</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	console.log('Serving page - items found:', items?.length || 0)
	console.log('Serving page - items data:', items)

	// 안전하게 데이터 처리
	const safeItems = Array.isArray(items) ? items : []
	let stationCounts: Record<string, number> = { main: 0, beverages: 0, dessert: 0 }
	let recent: any[] = []

	// order_item에서 완료된 항목들로 station 카운트 계산
	for (const it of safeItems) {
		// menu_item_id로 메뉴 정보를 가져와서 station 확인
		if (it.menu_item_id) {
			try {
				const { data: menuItem, error: menuError } = await supabase
					.from('menu_item')
					.select('station')
					.eq('id', it.menu_item_id)
					.maybeSingle()

				if (menuError) {
					console.warn(`Menu item ${it.menu_item_id} query error:`, menuError)
					stationCounts.main = (stationCounts.main || 0) + 1
				} else {
					const st = menuItem?.station || 'main'
					// beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
					const effectiveStation = st === 'bar' ? 'beverages' : st
					stationCounts[effectiveStation] = (stationCounts[effectiveStation] || 0) + 1
				}
			} catch (err) {
				console.warn(`Failed to get menu item ${it.menu_item_id}:`, err)
				stationCounts.main = (stationCounts.main || 0) + 1
			}
		} else {
			stationCounts.main = (stationCounts.main || 0) + 1
		}
	}

	// 최근 항목들 설정
	recent = safeItems.slice(0, 10).map((it: any) => ({
		id: it.id,
		status: it.status,
		order_item: {
			id: it.id,
			name_snapshot: it.name_snapshot,
			qty: it.qty,
			order_ticket: it.order_ticket || { id: it.order_id, table_id: null } // 이미 order_ticket 정보가 있음
		}
	}))

	// 테이블 정보 가져오기 (이미 order_ticket에 table_id가 있으므로 간소화)
	const tableIds = safeItems
		.map(it => it.order_ticket?.table_id)
		.filter(Boolean)
		.filter((id, index, arr) => arr.indexOf(id) === index) // 중복 제거

	let tableLabelMap: Record<string,string> = {}
	if (tableIds.length) {
		try {
			const { data: tables = [], error: tableError } = await supabase
				.from('dining_table')
				.select('id, label')
				.in('id', tableIds)

			if (tableError) {
				console.warn('Dining table query error:', tableError)
			} else {
				tableLabelMap = Object.fromEntries((tables || []).map((t: any) => [t.id, t.label]))
			}
		} catch (err) {
			console.warn('Failed to get dining tables:', err)
		}
	}

	const totalCompleted = Object.values(stationCounts).reduce((sum, count) => sum + count, 0)

	// 디버깅 정보 추가
	console.log('Station counts:', stationCounts)
	console.log('Total completed:', totalCompleted)
	console.log('Items sample:', safeItems.slice(0, 3))

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

			{/* 데이터가 없을 때 안내 메시지 */}
			{totalCompleted === 0 && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
					<div className="text-center">
						<h3 className="text-lg font-semibold text-blue-800 mb-2">서빙할 항목이 없습니다</h3>
						<p className="text-blue-600 mb-4">
							주방에서 완료된 주문 항목들이 여기에 표시됩니다.
						</p>
						<div className="text-sm text-blue-500">
							<p>1. 메뉴에서 주문을 생성하세요</p>
							<p>2. 주방에서 주문을 "완료" 처리하세요</p>
							<p>3. 완료된 항목들이 서빙 페이지에 표시됩니다</p>
						</div>
					</div>
				</div>
			)}

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
