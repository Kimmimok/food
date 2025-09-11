// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ServingBoard from '@/components/serving/ServingBoard'
import { bulkMarkServed } from '../../kitchen/actions'
import BulkServeButton from '@/components/serving/BulkServeButton'

async function sb() {
  const c = await cookies()
  const h = await headers()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(n: string){ return c.get(n)?.value } },
      headers: { get(n: string){ return h.get(n) } }
    }
  )
}

export default async function ServingStationPage({ params }: { params: Promise<{ station: string }> }) {
  const { station } = await params
  const supabase = await sb()

  // 서빙 데이터: 완료된(doned) 상태의 아이템들만 로드
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
      console.error(`Serving station ${station} - database error:`, error)
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
    console.error(`Serving station ${station} - query exception:`, err)
    console.error('Exception details:', {
      message: err?.message,
     	stack: err?.stack,
      name: err?.name
    })
    queryError = err
  }

  if (queryError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
              <div className="flex-1" />
            </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">데이터베이스 오류</h3>
            <p className="text-red-600 mb-2">{station} 스테이션 데이터를 불러오는 중 오류가 발생했습니다.</p>
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

  console.log(`Serving station ${station} - items found:`, items?.length || 0)
  console.log(`Serving station ${station} - items data:`, items)

  // 안전하게 데이터 처리
  const safeItems = Array.isArray(items) ? items : []
  let queue = []

  // station에 맞는 완료된 항목들만 필터링
  const filteredItems = []
  for (const it of safeItems) {
    if (it.menu_item_id) {
      try {
        const { data: menuItem, error: menuError } = await supabase
          .from('menu_item')
          .select('station')
          .eq('id', it.menu_item_id)
          .maybeSingle()

        if (menuError) {
          console.warn(`Menu item ${it.menu_item_id} query error:`, menuError)
          // 에러가 발생하면 main 스테이션으로 처리
          if (station === 'main') {
            filteredItems.push(it)
          }
        } else {
          const itemStation = menuItem?.station || 'main'
          // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
          if (itemStation === station || (station === 'beverages' && itemStation === 'bar')) {
            filteredItems.push(it)
          }
        }
      } catch (err) {
        console.warn(`Failed to get menu item ${it.menu_item_id}:`, err)
        // 에러가 발생하면 main 스테이션으로 처리
        if (station === 'main') {
          filteredItems.push(it)
        }
      }
    } else {
      // menu_item_id가 없는 경우 main 스테이션으로 처리
      if (station === 'main') {
        filteredItems.push(it)
      }
    }
  }

  queue = filteredItems.map((it: any) => ({
    id: String(it.id),
    status: it.status,
    created_at: it.created_at ?? null,
    started_at: null,
    done_at: null,
    order_item: {
      id: String(it.id),
      name_snapshot: it.name_snapshot,
      qty: it.qty,
      order_ticket: it.order_id ? { id: it.order_id, table_id: null } : null, // table_id는 별도로 가져옴
    }
  }))

  // 테이블 라벨 맵
  const orderIds = filteredItems.map((it: any) => it.order_id).filter(Boolean)
  let tableLabelMap: Record<string, string> = {}

  if (orderIds.length) {
    try {
      const { data: orders = [], error: orderError } = await supabase
        .from('order_ticket')
        .select('id, table_id')
        .in('id', orderIds)

      if (orderError) {
        console.warn('Order ticket query error:', orderError)
      } else {
        const tableIds = Array.from(new Set(orders.map((o: any) => o.table_id).filter(Boolean)))
        if (tableIds.length) {
          try {
            const { data: tables = [], error: tableError } = await supabase
              .from('dining_table')
              .select('id, label')
              .in('id', tableIds)

            if (tableError) {
              console.warn('Dining table query error:', tableError)
            } else {
              tableLabelMap = Object.fromEntries(tables.map((t: any) => [t.id, t.label]))
            }
          } catch (err) {
            console.warn('Failed to get dining tables:', err)
          }
        }

        // order_ticket 정보를 queue에 추가
        const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))
        queue = queue.map((q: any) => ({
          ...q,
          order_item: {
            ...q.order_item,
            order_ticket: orderMap[q.order_item.order_ticket?.id] || q.order_item.order_ticket
          }
        }))
      }
    } catch (err) {
      console.warn('Failed to get order tickets:', err)
    }
  }

  // (일괄 처리는 클라이언트 BulkServeButton에서 호출)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <div className="flex gap-2">
          <BulkServeButton station={station} />
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">서빙할 항목이 없습니다</h3>
            <p className="text-blue-600 mb-4">
              {station} 스테이션에서 완료된 주문 항목들이 여기에 표시됩니다.
            </p>
            <div className="text-sm text-blue-500">
              <p>1. 메뉴에서 주문을 생성하세요</p>
              <p>2. 주방에서 해당 스테이션의 주문을 "완료" 처리하세요</p>
              <p>3. 완료된 항목들이 서빙 페이지에 표시됩니다</p>
            </div>
          </div>
        </div>
      ) : (
        <ServingBoard station={station} initialQueue={queue as any} tableLabelMap={tableLabelMap} showServedSection={false} />
      )}
    </div>
  )
}
