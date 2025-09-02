-- 한식당 음료 및 주류 메뉴 데이터 등록
-- 식당에서 실제 판매 가능한 메뉴들만 포함
-- Supabase SQL Editor에서 실행하세요

BEGIN;

-- 1. 주류 카테고리 추가 (중복 방지)
INSERT INTO public.menu_category (id, name, sort_order, is_active)
SELECT gen_random_uuid(), '주류', 4, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_category WHERE name = '주류'
);

-- 2. 음료 카테고리 추가 (중복 방지)
INSERT INTO public.menu_category (id, name, sort_order, is_active)
SELECT gen_random_uuid(), '음료', 3, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_category WHERE name = '음료'
);

-- 2. 커피 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'main'
FROM (
    VALUES
    ('아메리카노', 3500, 1, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80&auto=format&fit=crop'),
    ('카페라떼', 4500, 2, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80&auto=format&fit=crop'),
    ('카푸치노', 4500, 3, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80&auto=format&fit=crop'),
    ('에스프레소', 3000, 4, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80&auto=format&fit=crop'),
    ('카페모카', 5000, 5, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80&auto=format&fit=crop')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '음료'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 3. 탄산음료 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'main'
FROM (
    VALUES
    ('코카콜라', 2500, 6, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop'),
    ('코카콜라 제로', 2500, 7, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop'),
    ('스프라이트', 2500, 8, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop'),
    ('환타 오렌지', 2500, 9, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop'),
    ('칠성 사이다', 2200, 10, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '음료'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 4. 과일음료 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'main'
FROM (
    VALUES
    ('오렌지 주스', 3500, 11, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80&auto=format&fit=crop'),
    ('포도 주스', 3500, 12, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80&auto=format&fit=crop'),
    ('토마토 주스', 3200, 13, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80&auto=format&fit=crop'),
    ('망고 주스', 4000, 14, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80&auto=format&fit=crop'),
    ('키위 주스', 3800, 15, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80&auto=format&fit=crop')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '음료'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 5. 차 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'main'
FROM (
    VALUES
    ('녹차', 2500, 16, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80&auto=format&fit=crop'),
    ('홍차', 2500, 17, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80&auto=format&fit=crop'),
    ('자스민차', 2800, 18, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80&auto=format&fit=crop'),
    ('페퍼민트차', 2500, 19, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80&auto=format&fit=crop'),
    ('캐모마일차', 2800, 20, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80&auto=format&fit=crop')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '음료'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 6. 생수 및 우유 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'main'
FROM (
    VALUES
    ('생수', 1000, 21, 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&q=80&auto=format&fit=crop'),
    ('삼다수', 1500, 22, 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&q=80&auto=format&fit=crop'),
    ('우유', 2000, 23, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format&fit=crop'),
    ('딸기우유', 2500, 24, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format&fit=crop'),
    ('바나나우유', 2500, 25, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80&auto=format&fit=crop')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '음료'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'bar'
FROM (
    VALUES
    ('참이슬', 4000, 26, 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&h=400&fit=crop&auto=format'),
    ('처음처럼', 4000, 27, 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&h=400&fit=crop&auto=format'),
    ('진로', 4500, 28, 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&h=400&fit=crop&auto=format'),
    ('한라산', 4200, 29, 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&h=400&fit=crop&auto=format'),
    ('좋은데이', 3800, 30, 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&h=400&fit=crop&auto=format')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '주류'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 3. 막걸리 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'bar'
FROM (
    VALUES
    ('국순당 생 막걸리', 3500, 31, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format'),
    ('문배주 양조 생 막걸리', 4000, 32, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format'),
    ('황금보리', 3800, 33, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format'),
    ('지평 생 막걸리', 4200, 34, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format'),
    ('배상면주가 생 막걸리', 4500, 35, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '주류'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

-- 4. 맥주 메뉴 등록 (중복 방지)
INSERT INTO public.menu_item (id, category_id, name, price, is_active, sort_order, image_url, station)
SELECT
    gen_random_uuid(),
    mc.id,
    menu_data.name,
    menu_data.price,
    true,
    menu_data.sort_order,
    menu_data.image_url,
    'bar'
FROM (
    VALUES
    ('카스', 4000, 36, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('하이트', 4000, 37, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('클라우드', 4500, 38, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('테라', 4500, 39, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('아사히', 5000, 40, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('칭따오', 4800, 41, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('버드와이저', 5500, 42, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format'),
    ('호가든', 6000, 43, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&auto=format')
) AS menu_data(name, price, sort_order, image_url)
CROSS JOIN menu_category mc
WHERE mc.name = '주류'
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_item mi
      WHERE mi.name = menu_data.name
  );

COMMIT;

-- 음료 메뉴 옵션 추가
BEGIN;

-- 커피 옵션 그룹 생성 (HOT/ICE 선택)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT gen_random_uuid(), mi.id, '온도 선택', 1, 1, 1
FROM public.menu_item mi
WHERE mi.name IN ('아메리카노', '카페라떼', '카푸치노', '에스프레소', '카페모카')
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option_group mog
      WHERE mog.menu_item_id = mi.id AND mog.name = '온도 선택'
  );

-- 커피 온도 옵션 추가
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, 'HOT', 0, 1
FROM public.menu_option_group mog
WHERE mog.name = '온도 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('아메리카노', '카페라떼', '카푸치노', '에스프레소', '카페모카')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = 'HOT'
  );

INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, 'ICE', 500, 2
FROM public.menu_option_group mog
WHERE mog.name = '온도 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('아메리카노', '카페라떼', '카푸치노', '에스프레소', '카페모카')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = 'ICE'
  );

-- 탄산음료 옵션 그룹 생성 (용량 선택)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT gen_random_uuid(), mi.id, '용량 선택', 1, 1, 1
FROM public.menu_item mi
WHERE mi.name IN ('코카콜라', '코카콜라 제로', '스프라이트', '환타 오렌지', '칠성 사이다')
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option_group mog
      WHERE mog.menu_item_id = mi.id AND mog.name = '용량 선택'
  );

-- 탄산음료 용량 옵션 추가
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '355ml', 0, 1
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('코카콜라', '코카콜라 제로', '스프라이트', '환타 오렌지', '칠성 사이다')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '355ml'
  );

INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '500ml', 500, 2
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('코카콜라', '코카콜라 제로', '스프라이트', '환타 오렌지', '칠성 사이다')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '500ml'
  );

COMMIT;
BEGIN;

-- 소주 옵션 그룹 생성 (온도 선택)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT gen_random_uuid(), mi.id, '온도 선택', 1, 1, 1
FROM public.menu_item mi
WHERE mi.name IN ('참이슬', '처음처럼', '진로', '한라산', '좋은데이')
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option_group mog
      WHERE mog.menu_item_id = mi.id AND mog.name = '온도 선택'
  );

-- 소주 온도 옵션 추가
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '시원하게', 0, 1
FROM public.menu_option_group mog
WHERE mog.name = '온도 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('참이슬', '처음처럼', '진로', '한라산', '좋은데이')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '시원하게'
  );

INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '차갑게', 0, 2
FROM public.menu_option_group mog
WHERE mog.name = '온도 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('참이슬', '처음처럼', '진로', '한라산', '좋은데이')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '차갑게'
  );

-- 맥주 옵션 그룹 생성 (용량 선택)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT gen_random_uuid(), mi.id, '용량 선택', 1, 1, 1
FROM public.menu_item mi
WHERE mi.name IN ('카스', '하이트', '클라우드', '테라', '아사히', '칭따오', '버드와이저', '호가든')
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option_group mog
      WHERE mog.menu_item_id = mi.id AND mog.name = '용량 선택'
  );

-- 맥주 용량 옵션 추가
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '500ml', 0, 1
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('카스', '하이트', '클라우드', '테라', '아사히', '칭따오', '버드와이저', '호가든')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '500ml'
  );

INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '355ml', -500, 2
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('카스', '하이트', '클라우드', '테라', '아사히', '칭따오', '버드와이저', '호가든')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '355ml'
  );

-- 막걸리 옵션 그룹 생성 (용량 선택)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT gen_random_uuid(), mi.id, '용량 선택', 1, 1, 1
FROM public.menu_item mi
WHERE mi.name IN ('국순당 생 막걸리', '문배주 양조 생 막걸리', '황금보리', '지평 생 막걸리', '배상면주가 생 막걸리')
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option_group mog
      WHERE mog.menu_item_id = mi.id AND mog.name = '용량 선택'
  );

-- 막걸리 용량 옵션 추가
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '750ml', 0, 1
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('국순당 생 막걸리', '문배주 양조 생 막걸리', '황금보리', '지평 생 막걸리', '배상면주가 생 막걸리')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '750ml'
  );

INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT gen_random_uuid(), mog.id, '500ml', -1000, 2
FROM public.menu_option_group mog
WHERE mog.name = '용량 선택'
  AND mog.menu_item_id IN (
    SELECT id FROM public.menu_item WHERE name IN ('국순당 생 막걸리', '문배주 양조 생 막걸리', '황금보리', '지평 생 막걸리', '배상면주가 생 막걸리')
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.menu_option mo
      WHERE mo.group_id = mog.id AND mo.name = '500ml'
  );

COMMIT;
