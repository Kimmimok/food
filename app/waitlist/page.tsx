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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">웨이팅 관리</h1>
          <p className="text-gray-600 mt-1">고객 대기열을 효율적으로 관리하고 테이블을 배정하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            실시간 업데이트
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <WaitlistPanel initialRows={rows as any[]} tables={tables as any[]} />
      </div>
    </div>
  )
}
