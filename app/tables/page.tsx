// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TableCard from '@/components/TableCard'
import { seatTableAndOpenOrder, markTableEmpty } from './actions'
import { RealtimeSync, useAutoRefresh } from '@/components/RealtimeSync'
import RefreshButton from '@/components/RefreshButton'
import { markTableClean, markAllTablesClean } from './actions'
import { supabase } from '@/lib/supabase-client'

 

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [ordersMap, setOrdersMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // 자동 새로고침 훅 사용
  useAutoRefresh()

  useEffect(() => {
    loadTablesData()
  }, [])

  const loadTablesData = async () => {
    try {
      setLoading(true)
      const client = supabase()

      // 테이블 데이터 가져오기
      const { data: tablesRaw = [] } = await client
        .from('dining_table')
        .select('*')
        .order('label', { ascending: true })

      let tables = tablesRaw || []

      // 설정에서 테이블 수 확인
      if ((!tables || tables.length === 0)) {
        const { data: settings } = await client.from('restaurant_settings').select('table_count, default_table_capacity, table_capacities').eq('id', 1).maybeSingle()
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

      // 주문 데이터 가져오기
      const tableIds = tables.map((t: any) => t.id)
      let ordersMap: Record<string, any> = {}
      const resp = await client
        .from('order_ticket')
        .select('id, table_id, status, created_at, items:order_item(name_snapshot, qty)')
        .in('table_id', tableIds)
        .in('status', ['open', 'sent_to_kitchen', 'completed', 'paid'])
        .order('created_at', { ascending: false })

      const orders = Array.isArray(resp.data) ? resp.data : []

      // 주문 매핑
      for (const o of orders) {
        if (!ordersMap[o.table_id]) {
          if (o.status === 'open' || o.status === 'sent_to_kitchen') {
            ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
          } else if (o.status === 'completed' || o.status === 'paid') {
            ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
          }
        } else {
          const existing = ordersMap[o.table_id]
          if (existing.status === 'open' || existing.status === 'sent_to_kitchen') {
            continue
          }
          if ((o.status === 'completed' || o.status === 'paid') &&
            new Date(o.created_at) > new Date(existing.created_at)) {
            ordersMap[o.table_id] = { id: o.id, status: o.status, created_at: o.created_at, items: o.items ?? [] }
          }
        }
      }

      // 테이블 상태 결정
      for (const table of tables) {
        const tableId = String(table.id)
        const order = ordersMap[tableId]

        if (order && (order.status === 'completed' || order.status === 'paid')) {
          table.status = 'dirty'
          delete ordersMap[tableId]
        } else if (table.status === 'dirty' && !order) {
          table.status = 'empty'
        } else if (order && (order.status === 'open' || order.status === 'sent_to_kitchen')) {
          table.status = 'seated'
        } else if (!order) {
          table.status = 'empty'
        }
      }

      setTables(tables)
      setOrdersMap(ordersMap)
    } catch (error) {
      console.error('Error loading tables data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanComplete = async (tableId: string) => {
    // Optimistic UI update: hide button and update stats immediately
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'empty' } : t))
    setOrdersMap(prev => {
      const copy = { ...prev }
      delete copy[String(tableId)]
      return copy
    })

    try {
      // call server action and check result
      const result = await markTableClean(tableId)
      if (!result.success) {
        console.error('Failed to mark table as clean:', result.error)
        // on error, reload to reconcile state
        await loadTablesData()
        return
      }
      // ensure canonical data after server completes
      await loadTablesData()
    } catch (error) {
      console.error('Error marking table as clean:', error)
      // on error, reload to reconcile state
      await loadTablesData()
    }
  }

  const handleMarkAllClean = async () => {
    // Optimistic UI: mark all dirty tables as empty locally
    setTables(prev => prev.map(t => t.status === 'dirty' ? { ...t, status: 'empty' } : t))
    setOrdersMap(prev => {
      const copy = { ...prev }
      // remove any orders that belonged to dirty tables
      Object.keys(copy).forEach(k => {
        // find table by id in current tables state
        const table = tables.find(tt => String(tt.id) === String(k))
        if (table && table.status === 'dirty') delete copy[k]
      })
      return copy
    })

    try {
      // call server action and check result
      const result = await markAllTablesClean()
      if (!result.success) {
        console.error('Failed to mark all tables as clean:', result.error)
        // on error, reload to reconcile state
        await loadTablesData()
        return
      }
      // ensure canonical data after server completes
      await loadTablesData()
    } catch (error) {
      console.error('Error marking all tables as clean:', error)
      // on error, reload to reconcile state
      await loadTablesData()
    }
  }

  const statusStats = tables.reduce((acc, table) => {
    acc[table.status] = (acc[table.status] || 0) + 1;
    return acc;
  }, { seated: 0, dirty: 0, reserved: 0, empty: 0 } as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }	return (
		<div className="space-y-6">
			<RealtimeSync onUpdate={loadTablesData} />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">테이블 관리</h1>
					<p className="text-gray-600 mt-1">테이블 상태를 확인하고 주문을 관리하세요</p>
				</div>
				<div className="flex items-center space-x-4">
					<RefreshButton className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
						<span>🔄</span>
						<span>새로고침</span>
					</RefreshButton>
					{statusStats.dirty > 0 && (
						<button
							onClick={handleMarkAllClean}
							className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
						>
							<span>✅</span>
							<span>모두 처리 ({statusStats.dirty}개)</span>
						</button>
					)}
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
							<TableCard table={t} order={ordersMap[String(t.id)]} onCleanComplete={handleCleanComplete} />
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
	return (
		<form action={seatTableAndOpenOrder.bind(null, tableId)} className="flex-1">
			<button className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
				착석
			</button>
		</form>
	)
}

function EmptyButton({ tableId }: { tableId: string }) {
	return (
		<form action={markTableEmpty.bind(null, tableId)} className="flex-1">
			<button className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
				비우기
			</button>
		</form>
	)
}

