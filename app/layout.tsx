// This file contains the layout for the application
import '../styles/globals.css'
import CartClientScript from '../components/CartClientScript'
import Toast from '../components/Toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* 사이드바 네비게이션 */}
          <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">🍽️ Restaurant POS</h1>
              <p className="text-sm text-gray-500 mt-1">통합 관리 시스템</p>
            </div>

            <div className="flex-1 p-4">
              <div className="space-y-2">
                <NavLink href="/" icon="🏠" label="대시보드" />
                <NavLink href="/tables" icon="🪑" label="테이블 관리" />
                <NavLink href="/menu" icon="📋" label="메뉴 관리" />
                <NavLink href="/kitchen" icon="👨‍🍳" label="주방 디스플레이" />
                <NavLink href="/waitlist" icon="⏰" label="웨이팅 관리" />
                <NavLink href="/cashier" icon="💳" label="계산대" />
                <NavLink href="/reports/sales" icon="📊" label="매출 리포트" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">행복한 하루 되세요!</div>
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
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">A</div>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">{children}</div>
          </main>
        </div>

        {/* client-only scripts and toasts */}
        <CartClientScript />
        <Toast />
      </body>
    </html>
  )
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
  )
}
