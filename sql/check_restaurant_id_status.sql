-- 데이터베이스 restaurant_id 컬럼 확인 쿼리
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 테이블의 컬럼 정보 확인
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    CASE WHEN c.column_name = 'restaurant_id' THEN '✅ 존재' ELSE '❌ 없음' END as restaurant_id_status
FROM
    information_schema.tables t
JOIN
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'restaurant_settings',
        'menu_item',
        'menu_category',
        'order_ticket',
        'order_item',
        'dining_table',
        'waitlist',
        'payment',
        'kitchen_queue',
        'user_profile'
    )
    AND c.column_name = 'restaurant_id'
ORDER BY
    t.table_name;

-- 2. 각 테이블의 restaurant_id 데이터 샘플 확인
SELECT 'restaurant_settings' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM restaurant_settings;
SELECT 'menu_item' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM menu_item;
SELECT 'menu_category' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM menu_category;
SELECT 'order_ticket' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM order_ticket;
SELECT 'order_item' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM order_item;
SELECT 'dining_table' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM dining_table;
SELECT 'waitlist' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM waitlist;
SELECT 'payment' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM payment;
SELECT 'kitchen_queue' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM kitchen_queue;
SELECT 'user_profile' as table_name, COUNT(*) as total_rows, COUNT(restaurant_id) as with_restaurant_id FROM user_profile;

-- 3. restaurant_settings의 restaurant_id 값 확인
SELECT id, name, restaurant_id, domain, is_active FROM restaurant_settings;

-- 4. 각 테이블의 restaurant_id 값 샘플 (첫 3개 행)
SELECT 'menu_item' as table_name, id, name, restaurant_id FROM menu_item LIMIT 3;
SELECT 'menu_category' as table_name, id, name, restaurant_id FROM menu_category LIMIT 3;
SELECT 'dining_table' as table_name, id, label, restaurant_id FROM dining_table LIMIT 3;
SELECT 'waitlist' as table_name, id, name, restaurant_id FROM waitlist LIMIT 3;