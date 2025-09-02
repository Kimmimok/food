-- 메뉴 옵션 데이터 조회 쿼리들
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 메뉴의 옵션 그룹 및 옵션 수 조회
SELECT
    mi.name as 메뉴_이름,
    mc.name as 카테고리,
    COUNT(DISTINCT mog.id) as 옵션_그룹_수,
    COUNT(mo.id) as 총_옵션_수
FROM menu_item mi
JOIN menu_category mc ON mc.id = mi.category_id
LEFT JOIN menu_option_group mog ON mog.menu_item_id = mi.id
LEFT JOIN menu_option mo ON mo.group_id = mog.id
GROUP BY mi.id, mi.name, mc.name
ORDER BY mc.name, mi.name;

-- 2. 특정 메뉴의 상세 옵션 정보 조회
SELECT
    mi.name as 메뉴_이름,
    mog.name as 옵션_그룹,
    mog.min_select as 최소_선택,
    mog.max_select as 최대_선택,
    mo.name as 옵션_이름,
    mo.price_delta as 추가_가격,
    mo.sort_order as 정렬_순서
FROM menu_item mi
LEFT JOIN menu_option_group mog ON mog.menu_item_id = mi.id
LEFT JOIN menu_option mo ON mo.group_id = mog.id
WHERE mi.name = '제육볶음'  -- 원하는 메뉴 이름으로 변경
ORDER BY mog.sort_order, mo.sort_order;

-- 3. 옵션 그룹별 옵션 통계
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

-- 4. 가격대별 옵션 분포
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
