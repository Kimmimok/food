// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import CustomerWaitlistForm from '@/components/CustomerWaitlistForm'
import RefreshButton from '@/components/RefreshButton'

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

export default async function CustomerWaitApplyPage(){
  const supabase = await sb()
  let restaurantName = 'Restaurant'
  try {
    const { data: rs } = await supabase
      .from('restaurant_settings')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
    restaurantName = rs?.name ?? restaurantName
  } catch {}

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100">
      <div className="bg-white/90 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-screen-sm mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪑</span>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{restaurantName}</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">대기 신청 — 아래 양식에 정보를 입력해 주세요.</p>
            </div>
          </div>
          <div className="ml-4">
            <RefreshButton className="inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[140px] bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
              <span>🔄</span>
              <span>새로고침</span>
            </RefreshButton>
          </div>
        </div>
      </div>

      <main className="max-w-screen-sm mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">대기 신청</h2>
            <p className="text-sm text-gray-500">정확한 정보를 입력하시면 호출 시 더 정확히 안내해 드립니다.</p>
          </div>
          <CustomerWaitlistForm />
          <div className="mt-6 text-center text-xs bg-yellow-100 text-black p-2 rounded">입력하신 연락처는 대기 호출을 위해서만 사용됩니다.</div>
        </div>
      </main>
    </div>
  )
}
