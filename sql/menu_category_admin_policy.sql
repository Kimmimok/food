-- menu_category 테이블에 관리자(관리자/매니저) 전용 RLS 정책 추가
-- Supabase SQL Editor에서 실행하세요.

-- 1) Row Level Security 활성화
ALTER TABLE IF EXISTS public.menu_category ENABLE ROW LEVEL SECURITY;

-- 2) 관리자 전용 정책 추가 (idempotent)
DROP POLICY IF EXISTS "admins_manage_categories" ON public.menu_category;
CREATE POLICY "admins_manage_categories" ON public.menu_category
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.role IN ('manager','admin')
    )
  );

-- 참고:
--  - 이 SQL은 카테고리의 모든 작업(SELECT/INSERT/UPDATE/DELETE)을 user_profile에 있는
--    manager 또는 admin 역할을 가진 사용자에게만 허용합니다.
--  - 실행 권한이 제한된 경우(예: Supabase에서 특정 권한 필요) 콘솔에서 슈퍼유저 또는
--    서비스 역할로 실행해야 합니다.
