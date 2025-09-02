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

export default async function StationPage({ params }: { params: Promise<{ station: string }> }) {
  const { station } = await params
  const supabase = await sb()

  // KDS 데이터: order_item + menu_item.station 기준으로 로드
  // Prefer kitchen_queue rows if present (includes order_item join)
  const { data: kq = [] } = await supabase
    .from('kitchen_queue')
    .select(`
      id, status, created_at, started_at, done_at, station,
      order_item:order_item_id ( id, name_snapshot, qty, order_ticket:order_id ( id, table_id ) )
    `)
    .eq('station', station)
    .order('created_at', { ascending: true })

  let queue = []
  if ((kq || []).length > 0) {
    queue = (kq || []).map((r: any) => ({
      id: String(r.id),
      // prefer order_item.status when available
      status: (Array.isArray(r.order_item) ? r.order_item[0]?.status : r.order_item?.status) ?? r.status,
      created_at: r.created_at ?? null,
      started_at: r.started_at ?? null,
      done_at: r.done_at ?? null,
      order_item: r.order_item ? ({
        id: String(r.order_item.id),
        name_snapshot: r.order_item.name_snapshot,
        qty: r.order_item.qty,
        order_ticket: r.order_item.order_ticket ? { id: r.order_item.order_ticket.id, table_id: r.order_item.order_ticket.table_id } : null,
      }) : null
    }))
  } else {
    // Fallback to order_item -> menu_item.station mapping
    const { data: items = [] } = await supabase
      .from('order_item')
      .select(`
        id, status, created_at,
        name_snapshot, qty,
        order_ticket:order_id ( id, table_id ),
        menu_item:menu_item_id ( id, station )
      `)
      .order('created_at', { ascending: true })

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
  }

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
