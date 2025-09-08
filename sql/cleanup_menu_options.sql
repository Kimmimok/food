-- 메뉴 옵션 데이터 삭제 (필요시 사용)
-- Supabase SQL Editor에서 실행하세요

-- 주의: 실제 운영 환경에서는 신중하게 사용하세요!

-- 1. 모든 메뉴 옵션 데이터 삭제
-- DELETE FROM public.order_item_option;
-- DELETE FROM public.menu_option;
-- DELETE FROM public.menu_option_group;

-- 2. 특정 메뉴의 옵션만 삭제 (예: 제육볶음)
-- DELETE FROM public.order_item_option
-- WHERE order_item_id IN (
--     SELECT oi.id FROM order_item oi
--     JOIN menu_item mi ON mi.id = oi.menu_item_id
--     WHERE mi.name = '제육볶음'
-- );
--
-- DELETE FROM public.menu_option
-- WHERE group_id IN (
--     SELECT mog.id FROM menu_option_group mog
--     JOIN menu_item mi ON mi.id = mog.menu_item_id
--     WHERE mi.name = '제육볶음'
-- );
--
-- DELETE FROM public.menu_option_group
-- WHERE menu_item_id IN (
--     SELECT id FROM menu_item WHERE name = '제육볶음'
-- );

-- 3. 옵션 그룹만 삭제 (옵션들은 남겨둠)
-- DELETE FROM public.menu_option_group WHERE name = '밥 종류';

-- 4. 데이터 확인 후 삭제
-- SELECT 'order_item_option' as table_name, COUNT(*) as count FROM order_item_option
-- UNION ALL
-- SELECT 'menu_option' as table_name, COUNT(*) as count FROM menu_option
-- UNION ALL
-- SELECT 'menu_option_group' as table_name, COUNT(*) as count FROM menu_option_group;
