-- 한식 식당용 메뉴 옵션 그룹 및 옵션 시드 데이터
-- Supabase SQL Editor에서 실행하세요

BEGIN;

-- 1. 메뉴 옵션 그룹 생성 (한식 식당용)
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
    -- 제육볶음 옵션 그룹
    ('제육볶음', '밥 종류', 0, 1, 1),
    ('제육볶음', '매운 정도', 1, 1, 2),
    ('제육볶음', '반찬 추가', 0, 3, 3),

    -- 오징어볶음 옵션 그룹
    ('오징어볶음', '밥 종류', 0, 1, 1),
    ('오징어볶음', '매운 정도', 1, 1, 2),
    ('오징어볶음', '반찬 추가', 0, 3, 3),

    -- 김치볶음밥 옵션 그룹
    ('김치볶음밥', '매운 정도', 1, 1, 1),
    ('김치볶음밥', '반찬 추가', 0, 2, 2),

    -- 라면류 옵션 그룹
    ('간장라면', '매운 정도', 1, 1, 1),
    ('간장라면', '반찬 추가', 0, 2, 2),
    ('매운라면', '매운 정도', 1, 1, 1),
    ('매운라면', '반찬 추가', 0, 2, 2),
    ('짬뽕', '매운 정도', 1, 1, 1),
    ('짬뽕', '반찬 추가', 0, 2, 2),
    ('비빔국수', '매운 정도', 1, 1, 1),
    ('비빔국수', '반찬 추가', 0, 2, 2)
) AS group_data(menu_name, name, min_select, max_select, sort_order)
JOIN public.menu_item mi ON mi.name = group_data.menu_name
WHERE NOT EXISTS (
    SELECT 1 FROM menu_option_group mog
    WHERE mog.menu_item_id = mi.id AND mog.name = group_data.name
);

-- 2. 메뉴 옵션 생성 (한식 식당용)
INSERT INTO public.menu_option (id, group_id, name, price_delta, sort_order)
SELECT
    gen_random_uuid(),
    mog.id,
    option_data.name,
    option_data.price_delta,
    option_data.sort_order
FROM (
    VALUES
    -- 밥 종류 옵션
    ('밥 종류', '현미밥', 1000, 1),
    ('밥 종류', '흰쌀밥', 0, 2),
    ('밥 종류', '밥 없음', -1000, 3),

    -- 매운 정도 옵션
    ('매운 정도', '순한맛', 0, 1),
    ('매운 정도', '중간맛', 0, 2),
    ('매운 정도', '매운맛', 500, 3),
    ('매운 정도', '아주 매운맛', 1000, 4),

    -- 반찬 추가 옵션
    ('반찬 추가', '계란찜', 2000, 1),
    ('반찬 추가', '김치', 1000, 2),
    ('반찬 추가', '오이소박이', 1500, 3),
    ('반찬 추가', '콩자반', 1500, 4),
    ('반찬 추가', '도토리묵', 2000, 5),
    ('반찬 추가', '미역줄기', 1500, 6)
) AS option_data(group_name, name, price_delta, sort_order)
JOIN public.menu_option_group mog ON mog.name = option_data.group_name
WHERE NOT EXISTS (
    SELECT 1 FROM menu_option mo
    WHERE mo.group_id = mog.id AND mo.name = option_data.name
);

COMMIT;
