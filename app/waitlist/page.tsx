// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import WaitlistPanel from '@/components/WaitlistPanel'

async function sb() {
  const c = await cookies()
  const h = await headers()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(n: string){ return c.get(n)?.value } },
      headers: { get(n: string){ return h.get(n) as any } }
    }
  )
}

export default async function WaitlistPage() {
  const supabase = await sb()

  const { data: rows = [] } = await supabase
    .from('waitlist')
    .select('*')
    .in('status', ['waiting','called'])
    .order('created_at', { ascending: true })

  const { data: tables = [] } = await supabase
    .from('dining_table')
    .select('id,label,capacity,status')
    .order('label', { ascending: true })

  // dining_table이 비어있으면 설정값으로 가상 테이블 생성 (관리 페이지와 동일 정책)
  let tablesFinal = tables || []
  if (!tablesFinal || tablesFinal.length === 0) {
    try {
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('table_count, default_table_capacity, table_capacities')
        .eq('id', 1)
        .maybeSingle()
      const count = settings?.table_count ?? 0
      const cap = settings?.default_table_capacity ?? 4
      const caps: any[] = Array.isArray(settings?.table_capacities) ? settings.table_capacities : []
      if (count > 0) {
        tablesFinal = Array.from({ length: count }, (_, i) => ({
          id: String(i + 1),
          label: String(i + 1),
          capacity: Number(caps[i] ?? cap),
          status: 'empty'
        }))
      }
    } catch {}
  }

  // 레스토랑 이름 조회
  let restaurantName = 'Restaurant'
  try {
    const { data: rs } = await supabase.from('restaurant_settings').select('name').eq('id', 1).maybeSingle()
    restaurantName = rs?.name ?? restaurantName
  } catch (e) {
    // ignore
  }

  // 사용 가능 테이블 수: 'seated' 또는 'dirty'가 아닌 테이블을 사용 가능으로 간주
  const availableTablesList = (tablesFinal || []).filter(t => t.status !== 'seated' && t.status !== 'dirty')
  const availableTablesCount = availableTablesList.length

  return (
    <div className="space-y-6">
      {/* 상단: 상호명 (대기 신청) 및 통계 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName} (대기 신청)</h1>
          <p className="text-gray-600 mt-1">대기(신청)을 등록하시고 잠시 기다려 주시면 감사하겠습니다.(5분이내에 입장하지 않으시면 다음분에게.)</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* header 통계는 WaitlistPanel에서 표시하므로 생략 */}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-4">
        </div>
        <WaitlistPanel initialRows={rows as any[]} tables={tablesFinal as any[]} />
      </div>
    </div>
  )
}
