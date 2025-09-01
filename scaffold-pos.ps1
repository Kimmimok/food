# scaffold-pos.ps1
$folders = @(
  "app",
  "app/menu",
  "app/menu/new",
  "app/menu/[id]",
  "app/tables",
  "app/tables/[tableId]",
  "app/kitchen",
  "app/kitchen/[station]",
  "app/waitlist",
  "app/cashier",
  "app/reports",
  "app/reports/sales",
  "components",
  "components/ui",
  "components/kds",
  "components/orders",
  "lib",
  "styles",
  "public/images"
)

foreach ($f in $folders) {
  New-Item -ItemType Directory -Force -Path $f | Out-Null
}

# 기본 파일 생성
@"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground">
        <header className="px-4 py-3 border-b">
          <h1 className="text-lg font-semibold">네이버 자유여행 카페 스테이 하롱</h1>
          <p className="text-sm opacity-70">식당 관리 시스템 (MVP)</p>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
"@ | Set-Content -Encoding UTF8 "app/layout.tsx"

@"
export default function Page() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">대시보드</h2>
      <ul className="list-disc pl-5 text-sm">
        <li>/menu — 메뉴 관리</li>
        <li>/tables — 테이블 주문</li>
        <li>/kitchen/main — 주방(KDS)</li>
        <li>/waitlist — 대기자 관리</li>
        <li>/cashier — 결제</li>
        <li>/reports/sales — 매출 리포트</li>
      </ul>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 "app/page.tsx"

@"
import { createBrowserClient } from '@supabase/ssr'
export const supabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
"@ | Set-Content -Encoding UTF8 "lib/supabase-client.ts"

@"
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
export function supabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
      headers: { get(name: string) { return headers().get(name) } }
    }
  )
}
"@ | Set-Content -Encoding UTF8 "lib/supabase-server.ts"

@"
export function calcLine(price: number, qty: number, opt = 0) {
  return (price + opt) * qty
}
"@ | Set-Content -Encoding UTF8 "lib/calc.ts"

@"
/* Tailwind 지시어 (프로젝트에 Tailwind 설정 시 유효) */
@tailwind base;
@tailwind components;
@tailwind utilities;
"@ | Set-Content -Encoding UTF8 "styles/globals.css"

# 라우트용 플레이스홀더
@"
export default function Page(){ return <div>메뉴 관리</div>; }
"@ | Set-Content -Encoding UTF8 "app/menu/page.tsx"

@"
export default function Page(){ return <div>테이블 그리드</div>; }
"@ | Set-Content -Encoding UTF8 "app/tables/page.tsx"

@"
export default function Page(){ return <div>KDS: main</div>; }
"@ | Set-Content -Encoding UTF8 "app/kitchen/page.tsx"

@"
export default function Page(){ return <div>대기자 관리</div>; }
"@ | Set-Content -Encoding UTF8 "app/waitlist/page.tsx"

@"
export default function Page(){ return <div>캐셔/결제</div>; }
"@ | Set-Content -Encoding UTF8 "app/cashier/page.tsx"

@"
export default function Page(){ return <div>매출 리포트</div>; }
"@ | Set-Content -Encoding UTF8 "app/reports/sales/page.tsx"

# 환경변수 예시
@"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
"@ | Set-Content -Encoding UTF8 ".env.local.example"

Write-Host "✅ 폴더와 기본 파일 생성 완료"
