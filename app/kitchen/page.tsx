import Link from 'next/link'

const STATIONS = [
	{ id: 'main', name: '메인 키친', desc: '메인 요리 및 밥류', icon: '🍳' },
	{ id: 'bar', name: '바', desc: '음료 및 주류', icon: '🥤' },
	{ id: 'dessert', name: '디저트', desc: '후식 및 커피', icon: '🍰' },
]
import { requireRole } from '@/lib/auth'

export default async function KitchenHome() {
	await requireRole(['manager','admin'])
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">주방 디스플레이 시스템</h1>
					<p className="text-gray-600 mt-1">스테이션별로 주문 현황을 확인하고 관리하세요</p>
				</div>
				<div className="flex items-center space-x-3">
					<div className="text-sm text-gray-500">
						주방 스테이션 선택
					</div>
					<div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
				</div>
			</div>
			
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{STATIONS.map(s => (
					<div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between mb-4">
							<div className="text-3xl">{s.icon}</div>
							<div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
								활성
							</div>
						</div>
						
						<h3 className="text-xl font-bold text-gray-900 mb-2">{s.name}</h3>
						<p className="text-gray-600 text-sm mb-6">{s.desc}</p>
						
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-500">
								대기 주문: <span className="font-semibold text-orange-600">3건</span>
							</div>
							<Link 
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" 
								href={`/kitchen/${s.id}`}
							>
								스테이션 열기
							</Link>
						</div>
					</div>
				))}
			</div>
			
			{/* 전체 주문 요약 */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">전체 주방 현황</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="text-center p-4 bg-orange-50 rounded-lg">
						<div className="text-2xl font-bold text-orange-600">8</div>
						<div className="text-sm text-gray-600">대기중</div>
					</div>
					<div className="text-center p-4 bg-blue-50 rounded-lg">
						<div className="text-2xl font-bold text-blue-600">5</div>
						<div className="text-sm text-gray-600">준비중</div>
					</div>
					<div className="text-center p-4 bg-green-50 rounded-lg">
						<div className="text-2xl font-bold text-green-600">12</div>
						<div className="text-sm text-gray-600">완료</div>
					</div>
					<div className="text-center p-4 bg-purple-50 rounded-lg">
						<div className="text-2xl font-bold text-purple-600">3.5분</div>
						<div className="text-sm text-gray-600">평균 처리시간</div>
					</div>
				</div>
			</div>
		</div>
	)
}
