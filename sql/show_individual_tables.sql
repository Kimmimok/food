-- 특정 테이블의 상세 구조 확인 (테이블명은 실제 테이블명으로 변경하세요)
-- 예시: \dt public.menu_item 또는 아래 쿼리 사용

-- 1. menu_item 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'menu_item'
ORDER BY
    ordinal_position;

-- 2. menu_category 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'menu_category'
ORDER BY
    ordinal_position;

-- 3. order_ticket 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'order_ticket'
ORDER BY
    ordinal_position;

-- 4. order_item 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'order_item'
ORDER BY
    ordinal_position;

-- 5. dining_table 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'dining_table'
ORDER BY
    ordinal_position;

-- 6. kitchen_queue 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'kitchen_queue'
ORDER BY
    ordinal_position;

-- 7. waitlist 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'waitlist'
ORDER BY
    ordinal_position;

-- 8. payment 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'payment'
ORDER BY
    ordinal_position;

-- 9. user_profile 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'user_profile'
ORDER BY
    ordinal_position;

-- 10. restaurant_settings 테이블 구조
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'restaurant_settings'
ORDER BY
    ordinal_position;
