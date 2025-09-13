-- 멀티테넌시 3단계: RPC 함수 생성
-- set_current_restaurant 함수 생성

CREATE OR REPLACE FUNCTION set_current_restaurant(restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 현재 세션에 restaurant_id 설정
  PERFORM set_config('app.current_restaurant_id', restaurant_id::text, false);
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION set_current_restaurant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_restaurant(uuid) TO anon;