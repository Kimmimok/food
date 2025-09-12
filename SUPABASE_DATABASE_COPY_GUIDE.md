# Supabase 데이터베이스 복사 가이드

## 🎯 목표
현재 Supabase 프로젝트의 모든 테이블, 컬럼, 트리거, 정책을 새 프로젝트로 완전히 복사하는 상세 가이드

---

## 📋 1단계: 새 Supabase 프로젝트 생성

### 1.1 Supabase 대시보드에서 새 프로젝트 생성
1. [supabase.com](https://supabase.com) 접속
2. **"New project"** 클릭
3. 프로젝트 이름 입력 (예: `food-pos-copy`)
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (기존 프로젝트와 동일하게)
6. **"Create new project"** 클릭

### 1.2 프로젝트 생성 대기
- 프로젝트 생성에는 2-3분 소요됨
- 생성 완료 후 **SQL Editor** 탭으로 이동

---

## 📋 2단계: 기본 테이블 및 정책 생성

### 2.1 SQL Editor에서 첫 번째 파일 실행

새 프로젝트의 **SQL Editor**에 다음 SQL을 붙여넣고 실행:

```sql
-- 사용자 프로파일 테이블 생성 및 RLS 정책
CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role text NOT NULL DEFAULT 'member', -- member / manager / admin
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_email ON public.user_profile (email);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_select" ON public.user_profile;
CREATE POLICY "self_select" ON public.user_profile
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "self_insert" ON public.user_profile;
CREATE POLICY "self_insert" ON public.user_profile
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "self_update" ON public.user_profile;
CREATE POLICY "self_update" ON public.user_profile
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 식당 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id integer PRIMARY KEY DEFAULT 1,
  name text,
  business_number text,
  phone text,
  address text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.restaurant_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 대기 테이블에 예약 관련 컬럼 추가
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS reservation_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_duration INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS special_request TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_reservation BOOLEAN DEFAULT FALSE;

-- 예약 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_waitlist_reservation_time ON waitlist(reservation_time) WHERE is_reservation = TRUE;
CREATE INDEX IF NOT EXISTS idx_waitlist_status_reservation ON waitlist(status, is_reservation);
```

---

## 📋 3단계: 트리거 생성

### 3.1 사용자 프로필 자동 생성 트리거

```sql
-- 트리거 함수: 새 auth.users 레코드가 만들어질 때 자동으로 user_profile 생성
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- user_profile이 이미 존재하지 않을 때만 삽입
  IF NOT EXISTS (SELECT 1 FROM public.user_profile WHERE id = NEW.id) THEN
    INSERT INTO public.user_profile (id, email, name, role, created_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->> 'full_name', 'member', now());
  END IF;
  RETURN NEW;
END;
$$;

-- 트리거 생성 (auth.users 테이블에 AFTER INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auth_user_insert_user_profile'
  ) THEN
    CREATE TRIGGER auth_user_insert_user_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END;
$$;
```

### 3.2 주방 큐 자동 생성 트리거

```sql
-- 주방 큐 자동 생성 함수
CREATE OR REPLACE FUNCTION public.fn_enqueue_order_item_to_kitchen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Determine station from menu_item; default to 'main'
  INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
  SELECT NEW.id, COALESCE(mi.station, 'main'), 'queued', NOW()
  FROM public.menu_item mi
  WHERE mi.id = NEW.menu_item_id;

  -- If menu_item not found, still insert with 'main'
  IF NOT FOUND THEN
    INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
    VALUES (NEW.id, 'main', 'queued', NOW());
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_enqueue_order_item_to_kitchen ON public.order_item;
CREATE TRIGGER trg_enqueue_order_item_to_kitchen
AFTER INSERT ON public.order_item
FOR EACH ROW
EXECUTE FUNCTION public.fn_enqueue_order_item_to_kitchen();

-- 기존 데이터 백필
INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
SELECT oi.id, COALESCE(mi.station, 'main'), 'queued', NOW()
FROM public.order_item oi
LEFT JOIN public.kitchen_queue kq ON kq.order_item_id = oi.id
LEFT JOIN public.menu_item mi ON mi.id = oi.menu_item_id
WHERE kq.id IS NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_order_item_id ON public.kitchen_queue(order_item_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_station ON public.kitchen_queue(station);
```

---

## 📋 4단계: 관리자 정책 추가

### 4.1 메뉴 항목 관리자 정책

```sql
-- menu_item 테이블에 관리자 전용 RLS 정책 추가
ALTER TABLE IF EXISTS public.menu_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage" ON public.menu_item;
CREATE POLICY "admins_manage" ON public.menu_item
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  );
```

### 4.2 메뉴 카테고리 관리자 정책

```sql
-- menu_category 테이블에 관리자 전용 RLS 정책 추가
ALTER TABLE IF EXISTS public.menu_category ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_categories" ON public.menu_category;
CREATE POLICY "admins_manage_categories" ON public.menu_category
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  );
```

---

## 📋 5단계: 샘플 데이터 추가 (선택사항)

### 5.1 메뉴 카테고리 및 메뉴 항목

```sql
-- 메뉴 카테고리 생성
INSERT INTO public.menu_category (id, name, sort_order, is_active)
SELECT gen_random_uuid(), v.name, v.sort_order, v.is_active
FROM (VALUES
  ('면류', 1, true),
  ('볶음', 2, true),
  ('음료', 3, true)
) AS v(name, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_category WHERE name = v.name);

-- 샘플 메뉴 항목 추가
INSERT INTO public.menu_item (id, name, price, category_id, is_active, is_sold_out, sort_order, image_url)
SELECT gen_random_uuid(), t.name, t.price, c.id, t.is_active, t.is_sold_out, t.sort_order, t.image_url
FROM (VALUES
  ('간장라면', 7000, '면류', true, false, 1, 'https://images.unsplash.com/photo-1543779509-2f4a9b12b2b4?w=800&q=80&auto=format&fit=crop'),
  ('매운라면', 7500, '면류', true, false, 2, 'https://images.unsplash.com/photo-1543353071-087092ec393a?w=800&q=80&auto=format&fit=crop'),
  ('짬뽕', 9000, '면류', true, false, 3, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop'),
  ('제육볶음', 12000, '볶음', true, false, 1, 'https://images.unsplash.com/photo-1604908177522-7f1d6b9e1f6a?w=800&q=80&auto=format&fit=crop'),
  ('오징어볶음', 14000, '볶음', true, false, 2, 'https://images.unsplash.com/photo-1604908177750-6b9f3f7f4b3a?w=800&q=80&auto=format&fit=crop'),
  ('김치볶음밥', 8000, '볶음', true, false, 3, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80&auto=format&fit=crop'),
  ('아메리카노', 3500, '음료', true, false, 1, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop'),
  ('레몬에이드', 4500, '음료', true, false, 2, 'https://images.unsplash.com/photo-1505576391880-7c3b0f9d0e3a?w=800&q=80&auto=format&fit=crop'),
  ('콜라', 2500, '음료', true, false, 3, 'https://images.unsplash.com/photo-1582719478250-5f3a1c9b6b4c?w=800&q=80&auto=format&fit=crop'),
  ('비빔국수', 8500, '면류', true, false, 4, 'https://images.unsplash.com/photo-1595927410236-2b0e7c4f9b5b?w=800&q=80&auto=format&fit=crop')
) AS t(name, price, category_name, is_active, is_sold_out, sort_order, image_url)
JOIN public.menu_category c ON c.name = t.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_item mi WHERE mi.name = t.name AND mi.category_id = c.id
);
```

---

## 📋 6단계: 검증 및 테스트

### 6.1 테이블 구조 확인

```sql
-- 모든 테이블 목록 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 6.2 트리거 확인

```sql
-- 모든 트리거 확인
SELECT
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 6.3 RLS 정책 확인

```sql
-- 모든 RLS 정책 확인
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 📋 7단계: 추가 설정

### 7.1 Storage 버킷 생성
1. Supabase 대시보드 → **Storage** 탭
2. **"Create bucket"** 클릭
3. 버킷 이름: `menu-images`
4. **Public bucket** 체크 (메뉴 이미지 공개용)

### 7.2 환경변수 설정
새 프로젝트의 환경변수들을 기존 프로젝트와 동일하게 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ⚠️ 주의사항

1. **실행 순서**를 반드시 지켜주세요
2. 각 SQL 실행 후 **에러가 없는지 확인**하세요
3. **RLS 정책**은 보안상 필수적입니다
4. **트리거**는 자동화 로직을 위해 필요합니다
5. **인덱스**는 성능 최적화를 위해 중요합니다

---

## 🔧 문제 해결

### 만약 특정 SQL이 실패한다면:

1. **권한 문제**: Supabase SQL Editor에서 실행
2. **테이블 없음**: 기본 테이블들이 먼저 생성되었는지 확인
3. **중복 에러**: `IF NOT EXISTS` 구문이 포함된 SQL 사용

### 실행 순서가 중요한 이유:
```
1. 기본 테이블 생성 → 2. RLS 정책 → 3. 트리거 → 4. 인덱스 → 5. 샘플 데이터
```

---

## 📁 포함된 SQL 파일들

- `combined_setup.sql` - 기본 테이블 및 정책
- `create_user_profile_trigger.sql` - 사용자 프로필 자동 생성 트리거
- `trigger_order_item_to_kitchen.sql` - 주방 큐 자동 생성 트리거
- `menu_item_admin_policy.sql` - 메뉴 항목 관리자 정책
- `menu_category_admin_policy.sql` - 메뉴 카테고리 관리자 정책
- `seed_menu_items.sql` - 샘플 메뉴 데이터

---

## 🎯 최종 결과

이 가이드를 따라 실행하면 다음과 같은 데이터베이스 구조가 생성됩니다:

- ✅ 사용자 프로필 시스템 (자동 생성 트리거)
- ✅ 식당 설정 관리
- ✅ 예약 시스템 (대기 테이블 확장)
- ✅ 주방 관리 시스템 (자동 큐 생성)
- ✅ 메뉴 관리 (관리자 전용 정책)
- ✅ 샘플 데이터 (선택사항)

모든 보안 정책과 자동화 로직이 포함된 완전한 데이터베이스 복사가 완료됩니다! 🚀