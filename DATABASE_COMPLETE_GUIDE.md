# 🍽️ 레스토랑 POS 시스템 - 데이터베이스 완전 가이드
## Database Complete Guide for Restaurant POS System

---

## 📋 목차
1. [데이터베이스 구조 개요](#데이터베이스-구조-개요)
2. [테이블 상세 구조](#테이블-상세-구조)
3. [테이블 사용처 분석](#테이블-사용처-분석)
4. [데이터베이스 조회 쿼리](#데이터베이스-조회-쿼리)
5. [시드 데이터](#시드-데이터)
6. [관리자 정책](#관리자-정책)
7. [유지보수 및 정리](#유지보수-및-정리)

---

## 🏗️ 데이터베이스 구조 개요

### 핵심 테이블들
- **`user_profile`** - 사용자 프로필 및 권한 관리
- **`restaurant_settings`** - 레스토랑 설정
- **`menu_category`** - 메뉴 카테고리
- **`menu_item`** - 메뉴 항목
- **`order_ticket`** - 주문 티켓
- **`order_item`** - 주문 항목
- **`dining_table`** - 식탁 관리
- **`kitchen_queue`** - 주방 대기열
- **`waitlist`** - 대기자 명단
- **`payment`** - 결제 정보
- **`menu_option_group`** - 메뉴 옵션 그룹
- **`menu_option`** - 메뉴 옵션
- **`order_item_option`** - 주문 옵션 선택

### 뷰(View)
- **`v_sales_daily`** - 일일 판매 통계

---

## 📊 테이블 상세 구조

### 1. user_profile (사용자 프로필)
```sql
CREATE TABLE user_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  name text,
  role text NOT NULL DEFAULT 'member',
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
**용도**: 사용자 인증 및 권한 관리
**인덱스**: idx_user_profile_email

### 2. restaurant_settings (레스토랑 설정)
```sql
CREATE TABLE restaurant_settings (
  id integer PRIMARY KEY DEFAULT 1,
  name text,
  business_number text,
  phone text,
  address text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  table_count integer DEFAULT 0,
  default_table_capacity integer DEFAULT 4,
  table_capacities jsonb DEFAULT '[]'
);
```
**용도**: 레스토랑 기본 정보 및 테이블 설정

### 3. menu_category (메뉴 카테고리)
```sql
CREATE TABLE menu_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
```
**용도**: 메뉴 분류 (면류, 볶음, 음료 등)

### 4. menu_item (메뉴 항목)
```sql
CREATE TABLE menu_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES menu_category(id),
  name text NOT NULL,
  price numeric NOT NULL,
  sku text,
  is_sold_out boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  image_url text,
  station text NOT NULL DEFAULT 'main'
);
```
**용도**: 개별 메뉴 항목 정보

### 5. dining_table (식탁)
```sql
CREATE TABLE dining_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  capacity integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'empty',
  table_token text
);
```
**용도**: 테이블 관리 및 토큰 기반 주문

### 6. order_ticket (주문 티켓)
```sql
CREATE TABLE order_ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no bigint NOT NULL DEFAULT nextval('order_ticket_order_no_seq'),
  table_id uuid REFERENCES dining_table(id),
  channel text NOT NULL DEFAULT 'dine_in',
  status text NOT NULL DEFAULT 'open',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
```
**용도**: 주문의 헤더 정보

### 7. order_item (주문 항목)
```sql
CREATE TABLE order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES order_ticket(id),
  menu_item_id uuid REFERENCES menu_item(id),
  name_snapshot text NOT NULL,
  price_snapshot numeric NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  note text
);
```
**용도**: 주문 내 개별 메뉴 항목

### 8. kitchen_queue (주방 대기열)
```sql
CREATE TABLE kitchen_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_item(id),
  station text NOT NULL DEFAULT 'main',
  status text NOT NULL DEFAULT 'queued',
  ticket_no bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  done_at timestamptz
);
```
**용도**: 주방 작업 관리

### 9. payment (결제)
```sql
CREATE TABLE payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES order_ticket(id),
  method text NOT NULL,
  amount numeric NOT NULL,
  paid_at timestamptz DEFAULT now(),
  ref_no text
);
```
**용도**: 결제 정보 기록

### 10. waitlist (대기자 명단)
```sql
CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  size integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'waiting',
  note text,
  created_at timestamptz DEFAULT now(),
  called_at timestamptz,
  seated_table_id uuid REFERENCES dining_table(id)
);
```
**용도**: 대기자 관리

### 11. menu_option_group (메뉴 옵션 그룹)
```sql
CREATE TABLE menu_option_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES menu_item(id),
  name text NOT NULL,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0
);
```
**용도**: 메뉴 옵션 카테고리 (토핑, 사이즈 등)

### 12. menu_option (메뉴 옵션)
```sql
CREATE TABLE menu_option (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES menu_option_group(id),
  name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
```
**용도**: 개별 옵션 항목

### 13. order_item_option (주문 옵션 선택)
```sql
CREATE TABLE order_item_option (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_item(id),
  option_name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0
);
```
**용도**: 실제 주문 시 선택된 옵션 기록

---

## 🔍 테이블 사용처 분석

### 워크플로우별 사용처

#### 1. 메뉴 관리 워크플로우
```
menu_category ← menu_item ← menu_option_group ← menu_option
```

#### 2. 주문 프로세스 워크플로우
```
dining_table → order_ticket → order_item → kitchen_queue
                              ↓
                        order_item_option
```

#### 3. 결제 프로세스 워크플로우
```
order_ticket → payment → dining_table (상태 변경)
```

#### 4. 대기 관리 워크플로우
```
waitlist → dining_table (배정)
```

### 각 테이블의 주요 용도

| 테이블 | 용도 | 관련 컴포넌트 |
|--------|------|---------------|
| user_profile | 권한 관리 | CategoryTabs, MenuList |
| menu_category | 메뉴 분류 | CategoryTabs, OrderBuilder |
| menu_item | 메뉴 정보 | MenuList, ItemCard, OrderBuilder |
| dining_table | 테이블 관리 | TablesPage, OrderActions |
| order_ticket | 주문 헤더 | CashierPanel, OrderActions |
| order_item | 주문 상세 | OrderItemsPanel, KitchenBoard |
| kitchen_queue | 주방 작업 | KitchenBoard, ServingBoard |
| payment | 결제 처리 | CashierPanel, CashierActions |
| waitlist | 대기 관리 | WaitlistPanel, WaitlistActions |
| menu_option_group | 옵션 그룹 | (향후 구현 예정) |
| menu_option | 옵션 항목 | (향후 구현 예정) |
| order_item_option | 선택 옵션 | (향후 구현 예정) |

---

## 🔍 데이터베이스 조회 쿼리

### 1. 모든 테이블 컬럼 구조 조회
```sql
SELECT
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as is_primary_key,
    CASE
        WHEN fk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as is_foreign_key,
    fk.foreign_table_name,
    fk.foreign_column_name
FROM
    information_schema.tables t
JOIN
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
    FROM
        information_schema.table_constraints tc
    JOIN
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
) pk ON t.table_schema = pk.table_schema AND t.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
    FROM
        information_schema.table_constraints tc
    JOIN
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN
        information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
) fk ON t.table_schema = fk.table_schema AND t.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY
    t.table_name,
    c.ordinal_position;
```

### 2. 간단 버전 테이블 구조
```sql
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
ORDER BY
    table_name,
    ordinal_position;
```

### 3. 메뉴 옵션 조회 쿼리
```sql
-- 메뉴 옵션 그룹 조회
SELECT
    mog.id,
    mog.name,
    mog.min_select,
    mog.max_select,
    mog.sort_order,
    COUNT(mo.id) as option_count
FROM menu_option_group mog
LEFT JOIN menu_option mo ON mo.group_id = mog.id
WHERE mog.menu_item_id = '메뉴_아이템_ID'
GROUP BY mog.id, mog.name, mog.min_select, mog.max_select, mog.sort_order
ORDER BY mog.sort_order;

-- 메뉴 옵션 그룹별 옵션들 조회
SELECT
    mog.name as group_name,
    mo.name as option_name,
    mo.price_delta,
    mo.sort_order
FROM menu_option_group mog
JOIN menu_option mo ON mo.group_id = mog.id
WHERE mog.menu_item_id = '메뉴_아이템_ID'
ORDER BY mog.sort_order, mo.sort_order;
```

---

## 🌱 시드 데이터

### 기본 메뉴 카테고리 및 메뉴 항목
```sql
-- 카테고리 생성
INSERT INTO menu_category (name, sort_order, is_active) VALUES
('면류', 1, true),
('볶음', 2, true),
('음료', 3, true);

-- 메뉴 항목 생성
INSERT INTO menu_item (category_id, name, price, is_active, sort_order) VALUES
-- 면류
(SELECT id FROM menu_category WHERE name = '면류' LIMIT 1, '간장라면', 7000, true, 1),
(SELECT id FROM menu_category WHERE name = '면류' LIMIT 1, '매운라면', 7500, true, 2),
(SELECT id FROM menu_category WHERE name = '면류' LIMIT 1, '짬뽕', 9000, true, 3),

-- 볶음
(SELECT id FROM menu_category WHERE name = '볶음' LIMIT 1, '제육볶음', 12000, true, 1),
(SELECT id FROM menu_category WHERE name = '볶음' LIMIT 1, '오징어볶음', 14000, true, 2),
(SELECT id FROM menu_category WHERE name = '볶음' LIMIT 1, '김치볶음밥', 8000, true, 3),

-- 음료
(SELECT id FROM menu_category WHERE name = '음료' LIMIT 1, '아메리카노', 3500, true, 1),
(SELECT id FROM menu_category WHERE name = '음료' LIMIT 1, '레몬에이드', 4500, true, 2),
(SELECT id FROM menu_category WHERE name = '음료' LIMIT 1, '콜라', 2500, true, 3);
```

### 한식 메뉴 옵션 데이터
```sql
-- 메뉴 옵션 그룹 생성
INSERT INTO menu_option_group (menu_item_id, name, min_select, max_select, sort_order)
SELECT mi.id, '밥 종류', 0, 1, 1
FROM menu_item mi WHERE mi.name = '제육볶음';

-- 메뉴 옵션 생성
INSERT INTO menu_option (group_id, name, price_delta, sort_order)
SELECT mog.id, '현미밥', 1000, 1
FROM menu_option_group mog WHERE mog.name = '밥 종류';

INSERT INTO menu_option (group_id, name, price_delta, sort_order)
SELECT mog.id, '흰쌀밥', 0, 2
FROM menu_option_group mog WHERE mog.name = '밥 종류';

INSERT INTO menu_option (group_id, name, price_delta, sort_order)
SELECT mog.id, '밥 없음', -1000, 3
FROM menu_option_group mog WHERE mog.name = '밥 종류';
```

---

## 🔐 관리자 정책

### 메뉴 카테고리 관리자 정책
```sql
-- Row Level Security 활성화
ALTER TABLE menu_category ENABLE ROW LEVEL SECURITY;

-- 관리자 전용 정책
DROP POLICY IF EXISTS "admins_manage_categories" ON menu_category;
CREATE POLICY "admins_manage_categories" ON menu_category
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  );
```

### 메뉴 항목 관리자 정책
```sql
-- Row Level Security 활성화
ALTER TABLE menu_item ENABLE ROW LEVEL SECURITY;

-- 관리자 전용 정책
DROP POLICY IF EXISTS "admins_manage_menu" ON menu_item;
CREATE POLICY "admins_manage_menu" ON menu_item
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  );
```

---

## 🛠️ 유지보수 및 정리

### 데이터 분석 쿼리
```sql
-- 메뉴 옵션 통계
SELECT
    mog.name as 옵션_그룹,
    COUNT(mo.id) as 옵션_개수,
    AVG(mo.price_delta) as 평균_추가_가격,
    MIN(mo.price_delta) as 최소_가격,
    MAX(mo.price_delta) as 최대_가격
FROM menu_option_group mog
LEFT JOIN menu_option mo ON mo.group_id = mog.id
GROUP BY mog.id, mog.name
ORDER BY mog.name;

-- 가격대별 옵션 분포
SELECT
    CASE
        WHEN price_delta = 0 THEN '무료'
        WHEN price_delta <= 500 THEN '500원 이하'
        WHEN price_delta <= 1000 THEN '1000원 이하'
        WHEN price_delta <= 2000 THEN '2000원 이하'
        ELSE '2000원 초과'
    END as 가격_대,
    COUNT(*) as 옵션_개수
FROM menu_option
GROUP BY
    CASE
        WHEN price_delta = 0 THEN '무료'
        WHEN price_delta <= 500 THEN '500원 이하'
        WHEN price_delta <= 1000 THEN '1000원 이하'
        WHEN price_delta <= 2000 THEN '2000원 이하'
        ELSE '2000원 초과'
    END
ORDER BY 옵션_개수 DESC;
```

### 데이터 정리 (주의해서 사용)
```sql
-- 옵션 데이터 삭제 (운영 환경에서는 신중하게 사용)
DELETE FROM order_item_option;
DELETE FROM menu_option;
DELETE FROM menu_option_group;

-- 특정 메뉴 옵션만 삭제
DELETE FROM menu_option
WHERE group_id IN (
    SELECT mog.id FROM menu_option_group mog
    JOIN menu_item mi ON mi.id = mog.menu_item_id
    WHERE mi.name = '제육볶음'
);

DELETE FROM menu_option_group
WHERE menu_item_id IN (
    SELECT id FROM menu_item WHERE name = '제육볶음'
);
```

---

## 📝 PostgreSQL 명령어

### 테이블 구조 확인
```sql
-- 모든 테이블 목록
\dt

-- 특정 테이블 구조
\d public.menu_item
\d public.menu_category
\d public.order_ticket

-- 모든 테이블의 컬럼 정보
SELECT
    schemaname,
    tablename,
    attname as column_name,
    format_type(atttypid, atttypmod) as data_type,
    attnotnull as not_null,
    adsrc as default_value
FROM pg_attribute
JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public'
    AND pg_class.relkind = 'r'
    AND attname NOT IN ('cmin', 'cmax', 'ctid', 'tableoid', 'xmin', 'xmax')
ORDER BY schemaname, tablename, attnum;
```

---

## 🎯 주요 팁

1. **외래 키 관계**를 항상 확인하세요
2. **RLS 정책**은 보안에 중요합니다
3. **인덱스**는 성능에 영향을 미칩니다
4. **시드 데이터**는 개발 환경에서 유용합니다
5. **데이터 정리**는 신중하게 수행하세요

이 가이드를 참고하여 데이터베이스를 효과적으로 관리하세요! 🚀
