// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ServingBoard from '@/components/serving/ServingBoard'
import { bulkMarkServed } from '../../kitchen/actions'

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
  const { data: items = [] } = await supabase
    .from('order_item')
    .select(`
      id, status, created_at,
      name_snapshot, qty,
      order_ticket:order_id ( id, table_id ),
      menu_item:menu_item_id ( id, station )
    `)
    .eq('status', 'done')
    .order('created_at', { ascending: true })

  let queue = []

  // station에 맞는 완료된 항목들만 필터링
  queue = (items || [])
    .filter((it: any) => {
      const itemStation = it.menu_item?.station || 'main'
      // beverages 스테이션에서는 bar 스테이션의 메뉴도 포함
      return itemStation === station || (station === 'beverages' && itemStation === 'bar')
    })
    .map((it: any) => ({
      id: String(it.id),
      status: it.status,
      created_at: it.created_at ?? null,
      started_at: null,
      done_at: null,
      order_item: {
        id: String(it.id),
        name_snapshot: it.name_snapshot,
        qty: it.qty,
        order_ticket: it.order_ticket ? { id: it.order_ticket.id, table_id: it.order_ticket.table_id } : null,
      }
    }))

  // 테이블 라벨 맵
  const tableIds = Array.from(new Set(queue.map((q: any) => q.order_item?.order_ticket?.table_id).filter(Boolean)))

  let tableLabelMap: Record<string, string> = {}
  if (tableIds.length > 0) {
    const { data: tables = [] } = await supabase
      .from('dining_table')
      .select('id, label')
      .in('id', tableIds)
    tableLabelMap = Object.fromEntries(tables.map((t: any) => [t.id, t.label]))
  }

  // 일괄 버튼(서버 액션)
  const ServedAll = async () => { 'use server'; await bulkMarkServed(station) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">서빙 관리 — {station}</h2>
        <div className="flex gap-2">
          <form action={ServedAll}><button className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">모두 서빙완료</button></form>
        </div>
      </div>

      <ServingBoard station={station} initialQueue={queue as any} tableLabelMap={tableLabelMap} />
    </div>
  )
}
