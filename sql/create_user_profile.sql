-- 사용자 프로파일 테이블 생성 및 RLS 정책
-- Supabase SQL Editor에 붙여넣고 실행하세요.

-- 1) 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role text NOT NULL DEFAULT 'member', -- member / manager / admin
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 인덱스(선택)
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON public.user_profile (email);

-- 3) Row Level Security 활성화
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- 4) 정책: 사용자는 본인 레코드에 대해 읽기/수정/삽입 가능
-- 정책이 이미 있을 경우를 대비해 안전하게 DROP 후 CREATE 합니다 (idempotent)
DROP POLICY IF EXISTS "self_select" ON public.user_profile;
CREATE POLICY "self_select" ON public.user_profile
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "self_insert" ON public.user_profile;
CREATE POLICY "self_insert" ON public.user_profile
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "self_update" ON public.user_profile;
CREATE POLICY "self_update" ON public.user_profile
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5) 관리자용 예시 정책(관리자는 수동으로 부여하거나 별도 관리 인터페이스 사용 권장)
-- 아래는 service role(서버에서 실행) 또는 슈퍼유저가 관리할 수 있도록 남겨둡니다.
-- 필요시 다음과 같이 관리자 전용 정책을 추가하세요 (외부에서 직접 실행 권장):
-- CREATE POLICY "admin_manage" ON public.user_profile
--   FOR ALL
--   USING (false)
--   WITH CHECK (false);

-- 참고: Supabase 콘솔의 Authentication -> Settings 에서
--   JWT 및 서비스 역할 사용 방법을 확인하시고,
--   서버 사이드에서 프로파일을 안전하게 수정하려면 서비스 키를 사용하세요.
