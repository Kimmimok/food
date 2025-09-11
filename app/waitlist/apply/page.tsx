// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import CustomerWaitlistForm from '@/components/CustomerWaitlistForm'

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-sm mx-auto px-4 py-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName} (대기 신청)</h1>
          <p className="text-base text-gray-600 mt-1">하단 양식에 정보를 입력해 주세요.</p>
        </div>
      </div>

      <div className="max-w-screen-sm mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <CustomerWaitlistForm />
        </div>
      </div>
    </div>
  )
}
