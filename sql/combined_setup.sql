-- Combined setup for Supabase: create user_profile (with RLS/policies) and restaurant_settings
-- 실행 순서: 1) user_profile 관련 DDL 및 정책, 2) restaurant_settings 생성 및 초기행
-- Supabase SQL Editor에 붙여넣어 실행하거나, 로컬에 psql이 설치되어 있고
-- PG* 환경변수가 설정되어 있으면 아래 PowerShell 스크립트로 실행할 수 있습니다.

/* ------------------------------------------------------------------ */
-- 1) user_profile + RLS policies (idempotent)
/* ------------------------------------------------------------------ */

-- 사용자 프로파일 테이블 생성 및 RLS 정책
CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role text NOT NULL DEFAULT 'member', -- member / manager / admin
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_email ON public.user_profile (email);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

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

/* ------------------------------------------------------------------ */
-- 2) restaurant_settings 테이블 및 초기행
/* ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id integer PRIMARY KEY DEFAULT 1,
  name text,
  business_number text,
  phone text,
  address text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.restaurant_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

/* ------------------------------------------------------------------ */
-- 3) 대기 테이블에 예약 관련 컬럼 추가
/* ------------------------------------------------------------------ */

-- 대기 테이블에 예약 관련 컬럼 추가
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS reservation_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_duration INTEGER DEFAULT 120, -- 분 단위
ADD COLUMN IF NOT EXISTS special_request TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_reservation BOOLEAN DEFAULT FALSE;

-- 예약 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_waitlist_reservation_time ON waitlist(reservation_time) WHERE is_reservation = TRUE;
CREATE INDEX IF NOT EXISTS idx_waitlist_status_reservation ON waitlist(status, is_reservation);

/* ------------------------------------------------------------------ */
-- 권장: 아래 항목을 수동으로 확인하세요
-- 1) Supabase 프로젝트에 storage 버킷 `menu-images`가 존재하는지
-- 2) manager/admin 계정의 user_profile 행(id=auth.user id, role='manager'|'admin')이 있는지
--    (없으면 SQL 에디터 또는 Admin UI에서 직접 행을 추가)
/* ------------------------------------------------------------------ */
