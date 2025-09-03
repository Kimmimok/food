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

  // 레스토랑 이름 조회
  let restaurantName = 'Restaurant'
  try {
    const { data: rs } = await supabase.from('restaurant_settings').select('name').eq('id', 1).maybeSingle()
    restaurantName = rs?.name ?? restaurantName
  } catch (e) {
    // ignore
  }

  return (
    <div className="space-y-6">
      {/* 상단: 상호명 (대기 신청) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName} (대기 신청)</h1>
          <p className="text-gray-600 mt-1">대기(신청)을 등록하시고 잠시 기다려 주시면 감사하겠습니다.(5분이내에 입장하지 않으시면 다음분에게 기회를 드립니다.)</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            실시간 업데이트
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-4">
          
        </div>
        <WaitlistPanel initialRows={rows as any[]} tables={tables as any[]} />
      </div>
    </div>
  )
}
