import '../styles/globals.css'
import { getUserAndRole } from '@/lib/auth'
import LogoutButton from '@/components/LogoutButton'
import { supabaseServer } from '@/lib/supabase-server'
import Toasts from '@/components/Toast'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getUserAndRole()
  const isAuthed = !!user
  let restaurantName = 'Restaurant POS'
  try {
    const sb = await supabaseServer()
    const { data } = await sb.from('restaurant_settings').select('name').eq('id', 1).maybeSingle()
    restaurantName = data?.name ?? restaurantName
  } catch (e) {
    // ignore
  }
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        {!isAuthed ? (
          // 비로그인: 최소 레이아웃(사이드바/헤더 없음) — 로그인 화면만 표시
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md mx-auto">
              {children}
            </div>
          </div>
        ) : (
          <div className="flex h-screen">
            {/* 사이드바 네비게이션 */}
            <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <h1 className="text-xl font-bold text-gray-900">🍽️ {restaurantName}</h1>
                  <p className="text-sm text-gray-500 mt-1">통합 관리 시스템</p>
                </div>
              
              <div className="flex-1 p-4">
                <div className="space-y-2">
                  <NavLink href="/" icon="🏠" label="대시보드" />
                  <NavLink href="/tables" icon="🪑" label="테이블 관리" />
                  <NavLink href="/menu" icon="📋" label="메뉴 관리" />
                  <NavLink href="/order" icon="🧾" label="주문 관리" />
                  <NavLink href="/kitchen" icon="👨‍🍳" label="주방 관리" />
                  <NavLink href="/serving" icon="🍽️" label="서빙 관리" />
                  <NavLink href="/waitlist" icon="⏰" label="웨이팅 관리" />
                  <NavLink href="/cashier" icon="💳" label="계산 관리" />
                  <NavLink href="/reports/sales" icon="📊" label="매출 리포트" />
                  { (role === 'manager' || role === 'admin') && (
                    <NavLink href="/settings" icon="⚙️" label="설정" />
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  © 2025 Restaurant POS
                </div>
              </div>
            </nav>
            
            {/* 메인 컨텐츠 영역 */}
            <main className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900" id="page-title">POS 시스템</h2>
                    <p className="text-sm text-gray-500">실시간 관리 및 모니터링</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {new Date().toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    {user?.email && (
                      <div className="text-sm text-gray-700" title={user.email}>{user.email}</div>
                    )}
                    <LogoutButton />
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-auto p-6 bg-gray-50">
                {children}
                <Toasts />
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a 
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
    >
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}
