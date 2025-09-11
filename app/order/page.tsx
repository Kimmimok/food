import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import TableOrderModal from '@/components/TableOrderModal'
import Link from 'next/link'

async function supabaseServer() {
  const cookieStore = await cookies()
  const h = await headers()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { 
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
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

export default async function OrderIndex() {
  const supabase = await supabaseServer()
  const { data: tables = [] } = await supabase
    .from('dining_table')
    .select('*')
    .order('label', { ascending: true })

  const statusStats = tables.reduce((acc, table) => {
    acc[table.status] = (acc[table.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">테이블별 주문</h1>
          <p className="text-gray-600 mt-1">테이블을 선택해서 주문을 시작하세요</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            총 {tables.length}개 테이블
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* 테이블 상태 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">사용중</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statusStats.seated || 0}</p>
            </div>
            <div className="text-2xl">🟢</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">정리 필요</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statusStats.dirty || 0}</p>
            </div>
            <div className="text-2xl">🟡</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">예약됨</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statusStats.reserved || 0}</p>
            </div>
            <div className="text-2xl">🔵</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">사용 가능</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statusStats.empty || 0}</p>
            </div>
            <div className="text-2xl">⚪</div>
          </div>
        </div>
      </div>

      {/* 테이블 그리드 - 큰 카드로 표시 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">테이블 선택</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tables.map(t => (
            <div key={t.id} className={`rounded-lg border-2 p-6 flex flex-col transition-all duration-200 ${getTableStyle(t.status)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-2xl">{t.label}</div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadgeStyle(t.status)}`}>
                  {getStatusLabel(t.status)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-6">
                최대 {t.capacity}명
              </div>
              
              <div className="mt-auto">
                <TableOrderModal tableId={`${t.id}`} label={t.label} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
