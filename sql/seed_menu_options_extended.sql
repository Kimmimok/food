-- 추가 메뉴 옵션 그룹 및 옵션 (더 풍부한 한식 식당용)
-- Supabase SQL Editor에서 실행하세요

BEGIN;

-- 3. 추가 메뉴 옵션 그룹 (국 종류, 음료 옵션 등)
INSERT INTO public.menu_option_group (id, menu_item_id, name, min_select, max_select, sort_order)
SELECT
    gen_random_uuid(),
    mi.id,
    group_data.name,
    group_data.min_select,
    group_data.max_select,
    group_data.sort_order
FROM (
    VALUES
    -- 볶음류에 국 옵션 추가
    ('제육볶음', '국 종류', 0, 1, 4),
    ('오징어볶음', '국 종류', 0, 1, 4),
    ('김치볶음밥', '국 종류', 0, 1, 2),

    -- 음료에 옵션 추가
    ('아메리카노', '사이즈', 1, 1, 1),
    ('아메리카노', '온도', 1, 1, 2),
    ('레몬에이드', '사이즈', 1, 1, 1),
    ('콜라', '사이즈', 1, 1, 1),

    -- 면류에 국수 옵션 추가
    ('비빔국수', '면 종류', 1, 1, 3)
) AS group_data(menu_name, name, min_select, max_select, sort_order)
JOIN public.menu_item mi ON mi.name = group_data.menu_name
WHERE NOT EXISTS (
    SELECT 1 FROM menu_option_group mog
    WHERE mog.menu_item_id = mi.id AND mog.name = group_data.name
);

-- 4. 추가 메뉴 옵션
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT
    gen_random_uuid(),
    mog.id,
    option_data.name,
    option_data.price_delta,
    option_data.sort_order
FROM (
    VALUES
    -- 국 종류 옵션
    ('국 종류', '된장국', 2000, 1),
    ('국 종류', '미역국', 2000, 2),
    ('국 종류', '콩나물국', 2000, 3),
    ('국 종류', '계란국', 2500, 4),

    -- 음료 사이즈 옵션
    ('사이즈', 'Regular', 0, 1),
    ('사이즈', 'Large', 500, 2),

    -- 음료 온도 옵션
    ('온도', 'Hot', 0, 1),
    ('온도', 'Ice', 0, 2),

    -- 면 종류 옵션
    ('면 종류', '쌀국수', 0, 1),
    ('면 종류', '메밀국수', 1000, 2),
    ('면 종류', '우동면', 1500, 3)
) AS option_data(group_name, name, price_delta, sort_order)
JOIN public.menu_option_group mog ON mog.name = option_data.group_name
WHERE NOT EXISTS (
    SELECT 1 FROM menu_option mo
    WHERE mo.group_id = mog.id AND mo.name = option_data.name
);

COMMIT;
