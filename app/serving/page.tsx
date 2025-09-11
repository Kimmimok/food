// @ts-nocheck
import { supabaseServer } from '../../lib/supabase-server'
import { requireRole } from '../../lib/auth'
import { RefreshButton } from '@/components/RefreshButton'
import StationPage from './[station]/page'
import ServingCard from '@/components/serving/ServingCard'
// ServingSummary removed from this page; realtime handled inside station components
// Realtime sync removed from this page - kept logic server-side

const STATIONS = [
	{ id: 'main', name: '메인 키친', icon: '🍳' },
	{ id: 'beverages', name: '음료/주류', icon: '🥤' },
	{ id: 'dessert', name: '디저트', icon: '🍰' },
]

export default async function ServingHome() {
	await requireRole(['manager','admin'])
	const supabase = await supabaseServer()

	// Get completed items that are ready for serving
	// 음료/주류는 kitchen_queue에 없으므로 order_item에서 직접 가져옴
	let items: any[] = []
	let queryError = null

	try {
		// 먼저 order_item에서 완료된 항목들을 확인
		const { data: orderItems, error: oiError } = await supabase
			.from('order_item')
			.select('id, status, name_snapshot, qty, menu_item_id')
			.eq('status', 'done')
			.limit(5)

		console.log('Debug - Order items with status done:', orderItems)
		console.log('Debug - Order items error:', oiError)

		// kitchen_queue에서도 확인
		const { data: kitchenQueue, error: kqError } = await supabase
			.from('kitchen_queue')
			.select('id, status, order_item_id, station')
			.eq('status', 'done')
			.limit(5)

		console.log('Debug - Kitchen queue with status done:', kitchenQueue)
		console.log('Debug - Kitchen queue error:', kqError)

		// kitchen_queue에서 완료된 항목들을 order_item과 join해서 가져오기
		const { data: kqData, error: kqMainError } = await supabase
			.from('kitchen_queue')
			.select(`
				id, status, station,
				order_item:order_item_id (
					id, status, name_snapshot, qty, menu_item_id,
					menu_item:menu_item_id (id, station),
					order_ticket:order_id (id, created_at, table_id)
				)
			`)
			.eq('status', 'done')

		console.log('Debug - Kitchen queue with join:', kqData?.length || 0, 'items')
		console.log('Debug - Kitchen queue join error:', kqMainError)

		const { data, error } = await supabase
			.from('order_item')
			.select(`
				id, status,
				name_snapshot, qty,
				order_id,
				menu_item_id,
				menu_item:menu_item_id (
					id, station
				),
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
			console.log('Serving page - query successful, data length:', data?.length || 0)
			// kitchen_queue 데이터도 함께 고려
			let allItems = [...(data || [])]

			if (kqData && kqData.length > 0) {
				for (const kq of kqData) {
					const oi = kq.order_item
					if (oi && oi.status === 'done') {
						// 중복 방지를 위해 이미 있는 항목인지 확인
						const exists = allItems.find(item => item.id === oi.id)
						if (!exists) {
							allItems.push(oi)
							console.log('Added item from kitchen_queue:', oi.id, oi.name_snapshot)
						}
					}
				}
			}

			// 데이터를 created_at 기준으로 정렬
			items = allItems.sort((a, b) => {
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
		// 이미 join으로 menu_item 정보를 가져왔으므로 직접 사용
		const menuItem = it.menu_item
		if (menuItem && menuItem.station) {
			const st = menuItem.station
			// beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
			const effectiveStation = st === 'bar' ? 'beverages' : st
			stationCounts[effectiveStation] = (stationCounts[effectiveStation] || 0) + 1
		} else {
			// menu_item 정보가 없는 경우 main으로 처리
			console.warn(`Menu item not found for order_item ${it.id}, assigning to main station`)
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

	// (서빙완료 관련 전체 목록/카운트는 이 페이지에서 제거)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">서빙 관리 시스템</h1>
					<p className="text-gray-600 mt-1">완료된 식사들을 서빙하고 관리하세요</p>
				</div>
				<div className="flex items-center space-x-3">
					<RefreshButton
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
					>
						새로고침
					</RefreshButton>
					<div className="text-sm text-gray-500">
						서빙 준비 완료
					</div>
					<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
				</div>
			</div>

			{/* 전체 서빙 현황 - 3개 카드: 메인 / 주류 및 음료 / 디저트 */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">전체 서빙 현황</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<div className="text-center p-4 bg-orange-50 rounded-lg">
						<div className="text-2xl font-bold text-orange-600">{stationCounts.main || 0}</div>
						<div className="text-sm text-gray-600">메인</div>
					</div>
					<div className="text-center p-4 bg-blue-50 rounded-lg">
						<div className="text-2xl font-bold text-blue-600">{stationCounts.beverages || 0}</div>
						<div className="text-sm text-gray-600">주류 및 음료</div>
					</div>
					<div className="text-center p-4 bg-pink-50 rounded-lg">
						<div className="text-2xl font-bold text-pink-600">{stationCounts.dessert || 0}</div>
						<div className="text-sm text-gray-600">디저트</div>
					</div>
				</div>
			</div>

			{/* 서빙관리 카드: 화면 전체 너비에 맞춰 표시 (메인 / 주류 및 음료 / 서빙완료) */}
			<div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{STATIONS.map(s => (
					<div key={s.id} className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[480px]">
						<div className="mb-3">
							<div className="text-lg font-bold">{s.icon} {s.name}:{stationCounts[s.id] || 0}</div>
							<div className="text-sm text-gray-400">대기</div>
						</div>
						{/* 스테이션 상세를 카드 내부에 전체 표시 (스크롤 제거) */}
						<div>
							<StationPage params={Promise.resolve({ station: s.id })} />
						</div>
					</div>
				))}
				{/* '서빙완료' 카드 제거 - 각 스테이션 카드만 표시 */}
			</div>
		
			{/* 빈 상태 안내 메시지 제거 per request */}

		</div>
	)
}
