# 여러 식당 멀티테넌시 구현 가이드

## 🎯 개요
단계별로 여러 식당이 같은 애플리케이션을 사용할 수 있도록 설정하는 방법을 안내합니다.

---

## 📋 단계별 구현 가이드

### 단계 1: 데이터베이스 스키마 수정

#### 1.1 restaurant_settings 테이블에 restaurant_id 추가
```sql
-- restaurant_settings 테이블에 restaurant_id 추가
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 기존 데이터 업데이트 (첫 번째 식당)
UPDATE public.restaurant_settings
SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid,
    domain = 'restaurant1.yourdomain.com'
WHERE id = 1;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_domain ON public.restaurant_settings(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_restaurant_id ON public.restaurant_settings(restaurant_id);
```

#### 1.2 모든 테이블에 restaurant_id 추가
```sql
-- menu_item 테이블
ALTER TABLE public.menu_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- menu_category 테이블
ALTER TABLE public.menu_category
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- orders 테이블
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- order_item 테이블
ALTER TABLE public.order_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- tables 테이블
ALTER TABLE public.tables
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- waitlist 테이블
ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- user_profile 테이블에 restaurant_id 추가 (선택사항)
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);
```

#### 1.3 RLS 정책 업데이트
```sql
-- menu_item RLS 정책
DROP POLICY IF EXISTS "menu_item_select" ON public.menu_item;
CREATE POLICY "menu_item_select" ON public.menu_item
  FOR SELECT
  USING (
    restaurant_id::text = current_setting('app.current_restaurant_id', true)
    OR current_setting('app.current_restaurant_id', true) IS NULL
  );

-- 다른 테이블들도 동일하게 적용
-- orders, tables, waitlist 등 모든 테이블에 restaurant_id 기반 RLS 적용
```

---

### 단계 2: 환경변수 설정

#### 2.1 .env.local 파일 생성
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 식당별 설정
RESTAURANT_1_DOMAIN=restaurant1.yourdomain.com
RESTAURANT_1_ID=550e8400-e29b-41d4-a716-446655440000
RESTAURANT_1_NAME=레스토랑 1

RESTAURANT_2_DOMAIN=restaurant2.yourdomain.com
RESTAURANT_2_ID=550e8400-e29b-41d4-a716-446655440001
RESTAURANT_2_NAME=레스토랑 2
```

#### 2.2 환경변수 타입 정의
```typescript
// lib/env.ts
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  },
  restaurants: {
    restaurant1: {
      id: process.env.RESTAURANT_1_ID!,
      domain: process.env.RESTAURANT_1_DOMAIN!,
      name: process.env.RESTAURANT_1_NAME!,
    },
    restaurant2: {
      id: process.env.RESTAURANT_2_ID!,
      domain: process.env.RESTAURANT_2_DOMAIN!,
      name: process.env.RESTAURANT_2_NAME!,
    },
  },
}
```

---

### 단계 3: 미들웨어 생성

#### 3.1 middleware.ts 생성
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from './lib/env'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl

  // 개발 환경에서는 localhost 허용
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const response = NextResponse.next()
    response.headers.set('x-restaurant-id', env.restaurants.restaurant1.id)
    response.headers.set('x-restaurant-domain', env.restaurants.restaurant1.domain)
    return response
  }

  // 도메인별 식당 ID 매핑
  const restaurantMapping: Record<string, { id: string; domain: string }> = {
    [env.restaurants.restaurant1.domain]: {
      id: env.restaurants.restaurant1.id,
      domain: env.restaurants.restaurant1.domain,
    },
    [env.restaurants.restaurant2.domain]: {
      id: env.restaurants.restaurant2.id,
      domain: env.restaurants.restaurant2.domain,
    },
  }

  const restaurant = restaurantMapping[hostname]

  if (!restaurant) {
    // 알 수 없는 도메인 처리
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // 식당 정보를 헤더에 추가
  const response = NextResponse.next()
  response.headers.set('x-restaurant-id', restaurant.id)
  response.headers.set('x-restaurant-domain', restaurant.domain)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

### 단계 4: Supabase 클라이언트 수정

#### 4.1 supabase-client.ts 업데이트
```typescript
// lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr'
import { env } from './env'

export function createClient() {
  const client = createBrowserClient(
    env.supabase.url,
    env.supabase.anonKey
  )

  // 현재 식당 ID 설정 (미들웨어에서 설정된 값 사용)
  if (typeof window !== 'undefined') {
    const restaurantId = document.cookie
      .split('; ')
      .find(row => row.startsWith('restaurant_id='))
      ?.split('=')[1]

    if (restaurantId) {
      client.rpc('set_current_restaurant', { restaurant_id: restaurantId })
    }
  }

  return client
}

export const supabase = createClient()
```

#### 4.2 서버 사이드 Supabase 클라이언트
```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from './env'

export async function supabaseServer() {
  const cookieStore = await cookies()

  const client = createServerClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 현재 요청의 restaurant_id 설정
  const restaurantId = cookieStore.get('restaurant_id')?.value
  if (restaurantId) {
    await client.rpc('set_current_restaurant', { restaurant_id: restaurantId })
  }

  return client
}
```

#### 4.3 Supabase RPC 함수 생성
```sql
-- set_current_restaurant RPC 함수
CREATE OR REPLACE FUNCTION set_current_restaurant(restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 현재 세션에 restaurant_id 설정
  PERFORM set_config('app.current_restaurant_id', restaurant_id::text, false);
END;
$$;
```

---

### 단계 5: 애플리케이션 코드 수정

#### 5.1 레이아웃 수정
```typescript
// app/layout.tsx
import { headers } from 'next/headers'
import { env } from '../lib/env'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')
  const restaurantDomain = headersList.get('x-restaurant-domain')

  // 식당 정보 찾기
  const restaurant = Object.values(env.restaurants).find(r => r.id === restaurantId)

  let restaurantName = restaurant?.name || 'Restaurant POS'

  // 기존 코드...
  return (
    <html lang="ko">
      <head>
        <title>{restaurantName} - POS 시스템</title>
      </head>
      <body>
        {/* 기존 레이아웃 코드 */}
        <nav className="w-48 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">🍽️ {restaurantName}</h1>
            <p className="text-sm text-gray-500 mt-1">통합 관리 시스템</p>
          </div>
          {/* 나머지 네비게이션 */}
        </nav>
        {/* 메인 컨텐츠 */}
      </body>
    </html>
  )
}
```

#### 5.2 데이터 조회 시 restaurant_id 필터링
```typescript
// 예시: 메뉴 아이템 조회
// app/menu/actions.ts
'use server'

import { supabaseServer } from '../../lib/supabase-server'
import { headers } from 'next/headers'

export async function getMenuItems() {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('menu_item')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error
  return data
}
```

#### 5.3 데이터 생성 시 restaurant_id 추가
```typescript
// 예시: 새 메뉴 아이템 생성
export async function createMenuItem(formData: FormData) {
  const headersList = await headers()
  const restaurantId = headersList.get('x-restaurant-id')

  if (!restaurantId) {
    throw new Error('Restaurant ID not found')
  }

  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('menu_item')
    .insert({
      name: formData.get('name'),
      price: formData.get('price'),
      restaurant_id: restaurantId, // 필수 추가
      // 다른 필드들...
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 단계 6: 배포 설정

#### 6.1 Vercel 환경변수 설정
Vercel 대시보드에서 다음 환경변수들을 설정:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

RESTAURANT_1_DOMAIN=restaurant1.yourdomain.com
RESTAURANT_1_ID=550e8400-e29b-41d4-a716-446655440000
RESTAURANT_1_NAME=레스토랑 1

RESTAURANT_2_DOMAIN=restaurant2.yourdomain.com
RESTAURANT_2_ID=550e8400-e29b-41d4-a716-446655440001
RESTAURANT_2_NAME=레스토랑 2
```

#### 6.2 도메인 설정
각 식당별로 커스텀 도메인을 Vercel에 연결:

1. Vercel 프로젝트 설정 → Domains
2. 각 식당 도메인 추가
3. DNS 설정 완료

#### 6.3 vercel.json 설정
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["icn1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Restaurant-ID",
          "value": "$RESTAURANT_ID"
        }
      ]
    }
  ]
}
```

---

### 단계 7: 테스트 및 검증

#### 7.1 로컬 테스트
```bash
# 환경변수 설정
cp .env.example .env.local

# 개발 서버 실행
npm run dev

# 다른 도메인으로 테스트 (hosts 파일 수정)
# 127.0.0.1 restaurant1.local
# 127.0.0.1 restaurant2.local
```

#### 7.2 데이터베이스 테스트
```sql
-- 각 식당별 데이터 확인
SELECT * FROM menu_item WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';
SELECT * FROM orders WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- RLS 정책 테스트
SET app.current_restaurant_id = '550e8400-e29b-41d4-a716-446655440000';
SELECT * FROM menu_item; -- 해당 식당 데이터만 표시
```

#### 7.3 배포 후 테스트
```bash
# Vercel 배포
vercel --prod

# 각 도메인별 접속 테스트
# https://restaurant1.yourdomain.com
# https://restaurant2.yourdomain.com
```

---

### 단계 8: 추가 식당 설정

#### 8.1 새 식당 추가 절차
```sql
-- 1. restaurant_settings에 새 식당 추가
INSERT INTO public.restaurant_settings (
  restaurant_id,
  name,
  domain,
  business_number,
  phone,
  address
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '레스토랑 3',
  'restaurant3.yourdomain.com',
  '123-45-67890',
  '02-123-4567',
  '서울시 강남구...'
);

-- 2. 환경변수에 새 식당 추가
RESTAURANT_3_DOMAIN=restaurant3.yourdomain.com
RESTAURANT_3_ID=550e8400-e29b-41d4-a716-446655440002
RESTAURANT_3_NAME=레스토랑 3

-- 3. 미들웨어에 새 식당 매핑 추가
const restaurantMapping = {
  // 기존 식당들...
  [env.restaurants.restaurant3.domain]: {
    id: env.restaurants.restaurant3.id,
    domain: env.restaurants.restaurant3.domain,
  },
}

-- 4. Vercel에 새 도메인 추가
-- 5. DNS 설정
```

---

## 🔧 문제 해결

### 일반적인 문제들:

#### 1. 데이터가 보이지 않는 경우
```sql
-- 현재 세션의 restaurant_id 확인
SELECT current_setting('app.current_restaurant_id');

-- RLS 정책 확인
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'menu_item';
```

#### 2. 미들웨어가 작동하지 않는 경우
```typescript
// 미들웨어 디버깅
console.log('Hostname:', hostname)
console.log('Restaurant ID:', restaurant?.id)
```

#### 3. 환경변수가 로드되지 않는 경우
```bash
# Vercel에서 환경변수 확인
vercel env ls

# 로컬에서 환경변수 확인
printenv | grep RESTAURANT
```

---

## 📊 모니터링 및 관리

### 로그 확인
```typescript
// 각 식당별 로그 분리
export function logRestaurantEvent(restaurantId: string, event: string, data: any) {
  console.log(`[${restaurantId}] ${event}:`, data)

  // Vercel Analytics에 전송
  if (typeof window !== 'undefined') {
    // Analytics 이벤트 전송
  }
}
```

### 성능 모니터링
```sql
-- 각 식당별 쿼리 성능 모니터링
SELECT
  restaurant_id,
  COUNT(*) as query_count,
  AVG(total_time) as avg_time
FROM pg_stat_statements
WHERE query LIKE '%restaurant_id%'
GROUP BY restaurant_id;
```

---

## 🎯 다음 단계

1. **현재 단계 완료 후**: 위의 8단계를 순서대로 진행
2. **테스트 완료 후**: 실제 식당 데이터로 마이그레이션
3. **운영 시작**: 모니터링 및 유지보수
4. **확장**: 필요시 더 많은 식당 추가

이 가이드를 따라 단계별로 진행하시면 여러 식당이 같은 애플리케이션을 안전하게 사용할 수 있습니다! 🚀