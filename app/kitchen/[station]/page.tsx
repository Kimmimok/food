// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import KitchenBoard from '@/components/kds/KitchenBoard'
import { bulkMarkDone, bulkMarkServed } from '../actions'

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

export default async function StationPage({ params }: any) {
  const supabase = await sb()
  const station = params.station

  // 큐 로드 (order_item 및 order_ticket까지 가져오고, 테이블 라벨은 별도 조회)
  const { data: queue = [] } = await supabase
    .from('kitchen_queue')
    .select(`
      id, status, created_at, started_at, done_at,
      order_item:order_item_id (
        id, name_snapshot, qty,
        order_ticket:order_id ( id, table_id )
      )
    `)
    .eq('station', station)
    .order('created_at', { ascending: true })

  // 테이블 라벨 맵
  const tableIds = Array.from(new Set(
    queue
      .map((q: any) => q.order_item?.order_ticket?.table_id)
      .filter(Boolean)
  ))

  let tableLabelMap: Record<string, string> = {}
  if (tableIds.length > 0) {
    const { data: tables = [] } = await supabase
      .from('dining_table')
      .select('id, label')
      .in('id', tableIds)
    tableLabelMap = Object.fromEntries(tables.map((t: any) => [t.id, t.label]))
  }

  // 일괄 버튼(서버 액션)
  const DoneAll = async () => { 'use server'; await bulkMarkDone(station) }
  const ServedAll = async () => { 'use server'; await bulkMarkServed(station) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">KDS — {station}</h2>
        <div className="flex gap-2">
          <form action={DoneAll}><button className="px-3 py-2 border rounded text-sm">모두 완료</button></form>
          <form action={ServedAll}><button className="px-3 py-2 border rounded text-sm">완료 → 서빙완료</button></form>
        </div>
      </div>

      <KitchenBoard station={station} initialQueue={queue as any} tableLabelMap={tableLabelMap} />
    </div>
  )
}
