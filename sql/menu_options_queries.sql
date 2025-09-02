-- 메뉴 옵션 그룹 조회 (특정 메뉴의 옵션 그룹들)
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
