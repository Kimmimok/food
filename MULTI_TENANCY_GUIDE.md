# 식당관리 프로그램 멀티테넌시 구현 가이드

## 🎯 목표
단일 식당용 시스템을 여러 식당에서 동시에 사용할 수 있는 멀티테넌시 시스템으로 변환

---

## 📋 1단계: 데이터베이스 스키마 변경

### 1.1 restaurant_settings 테이블 확장

```sql
-- restaurant_settings 테이블에 멀티테넌시 지원 필드 추가
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS restaurant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS max_tables INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;

-- 기존 단일 레코드를 새로운 구조로 마이그레이션
UPDATE public.restaurant_settings
SET restaurant_id = gen_random_uuid()
WHERE restaurant_id IS NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_active ON public.restaurant_settings(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_id ON public.restaurant_settings(restaurant_id);
```

### 1.2 모든 테이블에 restaurant_id 추가

```sql
-- user_profile 테이블에 restaurant_id 추가
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- waitlist 테이블에 restaurant_id 추가
ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- menu_category 테이블에 restaurant_id 추가
ALTER TABLE public.menu_category
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- menu_item 테이블에 restaurant_id 추가
ALTER TABLE public.menu_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- order_ticket 테이블에 restaurant_id 추가
ALTER TABLE public.order_ticket
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- order_item 테이블에 restaurant_id 추가
ALTER TABLE public.order_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- dining_table 테이블에 restaurant_id 추가
ALTER TABLE public.dining_table
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- kitchen_queue 테이블에 restaurant_id 추가
ALTER TABLE public.kitchen_queue
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- payment 테이블에 restaurant_id 추가
ALTER TABLE public.payment
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);
```

### 1.3 인덱스 생성

```sql
-- 각 테이블에 restaurant_id 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_profile_restaurant ON public.user_profile(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant ON public.waitlist(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_restaurant ON public.menu_category(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_restaurant ON public.menu_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_ticket_restaurant ON public.order_ticket(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_item_restaurant ON public.order_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dining_table_restaurant ON public.dining_table(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_restaurant ON public.kitchen_queue(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_restaurant ON public.payment(restaurant_id);
```

---

## 📋 2단계: RLS 정책 업데이트

### 2.1 사용자별 식당 필터링 정책

```sql
-- user_profile 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "self_select" ON public.user_profile;
CREATE POLICY "restaurant_users" ON public.user_profile
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT up.restaurant_id
      FROM public.user_profile up
      WHERE up.id = auth.uid()
    )
  );

-- waitlist 테이블 RLS 정책
DROP POLICY IF EXISTS "restaurant_waitlist" ON public.waitlist;
CREATE POLICY "restaurant_waitlist" ON public.waitlist
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT up.restaurant_id
      FROM public.user_profile up
      WHERE up.id = auth.uid()
    )
  );

-- menu_category 테이블 RLS 정책
DROP POLICY IF EXISTS "restaurant_menus" ON public.menu_category;
CREATE POLICY "restaurant_menus" ON public.menu_category
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT up.restaurant_id
      FROM public.user_profile up
      WHERE up.id = auth.uid()
    )
  );

-- menu_item 테이블 RLS 정책
DROP POLICY IF EXISTS "restaurant_menu_items" ON public.menu_item;
CREATE POLICY "restaurant_menu_items" ON public.menu_item
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT up.restaurant_id
      FROM public.user_profile up
      WHERE up.id = auth.uid()
    )
  );
```

### 2.2 관리자용 정책

```sql
-- 관리자를 위한 모든 식당 접근 정책 (선택사항)
DROP POLICY IF EXISTS "admin_all_restaurants" ON public.restaurant_settings;
CREATE POLICY "admin_all_restaurants" ON public.restaurant_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );
```

---

## 📋 3단계: 애플리케이션 코드 수정

### 3.1 환경변수 추가

```bash
# .env.local 파일에 추가
NEXT_PUBLIC_ENABLE_MULTITENANCY=true
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=your-default-restaurant-id
```

### 3.2 사용자 컨텍스트 수정

```typescript
// app/contexts/RestaurantContext.tsx (새 파일)
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Restaurant {
  id: string
  name: string
  settings: any
}

interface RestaurantContextType {
  currentRestaurant: Restaurant | null
  restaurants: Restaurant[]
  setCurrentRestaurant: (restaurant: Restaurant) => void
  loading: boolean
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserRestaurants()
  }, [])

  const loadUserRestaurants = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select('restaurant_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (userProfile?.restaurant_id) {
        const { data: restaurant } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('restaurant_id', userProfile.restaurant_id)
          .single()

        if (restaurant) {
          setCurrentRestaurant({
            id: restaurant.restaurant_id,
            name: restaurant.name,
            settings: restaurant
          })
        }
      }
    } catch (error) {
      console.error('Failed to load restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <RestaurantContext.Provider value={{
      currentRestaurant,
      restaurants,
      setCurrentRestaurant,
      loading
    }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export const useRestaurant = () => {
  const context = useContext(RestaurantContext)
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }
  return context
}
```

### 3.3 데이터베이스 쿼리 수정

```typescript
// 모든 데이터베이스 쿼리에 restaurant_id 필터링 추가
// 예시: waitlist 조회
export async function getWaitlist(restaurantId: string) {
  const supabase = await sb()
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('status', ['waiting', 'called'])
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

// 예시: 메뉴 조회
export async function getMenuItems(restaurantId: string) {
  const supabase = await sb()
  const { data, error } = await supabase
    .from('menu_item')
    .select(`
      *,
      menu_category (
        name,
        sort_order
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
```

### 3.4 레이아웃 컴포넌트 수정

```tsx
// app/layout.tsx
import { RestaurantProvider } from '@/app/contexts/RestaurantContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <RestaurantProvider>
          {children}
        </RestaurantProvider>
      </body>
    </html>
  )
}
```

---

## 📋 4단계: 관리자 인터페이스

### 4.1 식당 선택 컴포넌트

```tsx
// components/RestaurantSelector.tsx
'use client'

import { useRestaurant } from '@/app/contexts/RestaurantContext'

export default function RestaurantSelector() {
  const { currentRestaurant, restaurants, setCurrentRestaurant } = useRestaurant()

  if (!currentRestaurant) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">식당을 선택해주세요.</p>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div>
        <h3 className="font-semibold text-blue-900">{currentRestaurant.name}</h3>
        <p className="text-sm text-blue-600">ID: {currentRestaurant.id}</p>
      </div>
      {restaurants.length > 1 && (
        <select
          value={currentRestaurant.id}
          onChange={(e) => {
            const selected = restaurants.find(r => r.id === e.target.value)
            if (selected) setCurrentRestaurant(selected)
          }}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          {restaurants.map(restaurant => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
```

### 4.2 식당 관리 페이지

```tsx
// app/admin/restaurants/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Restaurant {
  restaurant_id: string
  name: string
  is_active: boolean
  subscription_plan: string
  max_tables: number
  max_users: number
}

export default function RestaurantManagement() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRestaurants()
  }, [])

  const loadRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Failed to load restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  const createRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .insert({
          name: '새로운 식당',
          is_active: true,
          subscription_plan: 'basic'
        })
        .select()
        .single()

      if (error) throw error
      setRestaurants(prev => [data, ...prev])
    } catch (error) {
      console.error('Failed to create restaurant:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">식당 관리</h1>
        <button
          onClick={createRestaurant}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새 식당 추가
        </button>
      </div>

      <div className="grid gap-4">
        {restaurants.map(restaurant => (
          <div key={restaurant.restaurant_id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{restaurant.name}</h3>
                <p className="text-sm text-gray-600">ID: {restaurant.restaurant_id}</p>
                <p className="text-sm text-gray-600">
                  플랜: {restaurant.subscription_plan} | 최대 테이블: {restaurant.max_tables} | 최대 사용자: {restaurant.max_users}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  restaurant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {restaurant.is_active ? '활성' : '비활성'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📋 5단계: 마이그레이션 스크립트

### 5.1 기존 데이터 마이그레이션

```sql
-- 기존 데이터를 기본 식당으로 마이그레이션
-- restaurant_settings에서 기본 식당 ID 가져오기
DO $$
DECLARE
    default_restaurant_id uuid;
BEGIN
    -- 기본 식당 ID 가져오기 (첫 번째 레코드)
    SELECT restaurant_id INTO default_restaurant_id
    FROM public.restaurant_settings
    LIMIT 1;

    -- 기존 데이터에 restaurant_id 추가
    UPDATE public.user_profile SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.waitlist SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.menu_category SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.menu_item SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.order_ticket SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.order_item SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.dining_table SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.kitchen_queue SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.payment SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;

    RAISE NOTICE 'Migration completed for restaurant_id: %', default_restaurant_id;
END $$;
```

---

## 📋 6단계: 배포 및 테스트

### 6.1 환경별 설정

```bash
# 개발 환경
NEXT_PUBLIC_ENABLE_MULTITENANCY=true
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=dev-restaurant-id

# 프로덕션 환경
NEXT_PUBLIC_ENABLE_MULTITENANCY=true
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=prod-restaurant-id
```

### 6.2 테스트 체크리스트

- [ ] 새 식당 생성 가능
- [ ] 식당별 사용자 관리
- [ ] 식당별 메뉴 분리
- [ ] 식당별 대기열 분리
- [ ] 식당별 테이블 관리
- [ ] RLS 정책 정상 작동
- [ ] 크로스 식당 데이터 접근 차단

---

## 🎯 구현 이점

### ✅ 장점
- **단일 코드베이스**: 하나의 애플리케이션으로 여러 식당 관리
- **비용 효율성**: 데이터베이스 및 인프라 비용 절감
- **유지보수 용이성**: 업데이트 시 모든 식당에 동시에 적용
- **확장성**: 새로운 식당 추가가 쉬움

### ⚠️ 고려사항
- **데이터 보안**: RLS 정책으로 데이터 격리 필수
- **성능**: 대용량 데이터 시 인덱스 최적화 필요
- **백업**: 식당별 백업 전략 수립
- **모니터링**: 식당별 사용량 모니터링

---

## 🚀 다음 단계

1. **데이터베이스 마이그레이션 실행**
2. **애플리케이션 코드 수정**
3. **테스트 환경에서 검증**
4. **프로덕션 배포**
5. **모니터링 및 최적화**

이 가이드를 따라 멀티테넌시 시스템을 성공적으로 구현할 수 있습니다! 🎉