-- 안전한 메뉴 삭제를 위한 SQL 함수
-- Supabase SQL Editor에서 실행하세요

CREATE OR REPLACE FUNCTION delete_menu_item_safe(menu_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. menu_option 삭제 (menu_option_group을 통해)
  DELETE FROM public.menu_option
  WHERE group_id IN (
    SELECT id FROM public.menu_option_group
    WHERE menu_item_id = delete_menu_item_safe.menu_item_id
  );

  -- 2. menu_option_group 삭제
  DELETE FROM public.menu_option_group
  WHERE menu_item_id = delete_menu_item_safe.menu_item_id;

  -- 3. menu_item 삭제
  DELETE FROM public.menu_item
  WHERE id = delete_menu_item_safe.menu_item_id;

  -- 삭제된 행이 없으면 예외 발생
  IF NOT FOUND THEN
    RAISE EXCEPTION '메뉴 항목을 찾을 수 없습니다: %', menu_item_id;
  END IF;
END;
$$;
