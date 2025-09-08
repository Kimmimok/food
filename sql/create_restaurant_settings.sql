-- 레스토랑 설정 테이블 생성
-- Supabase SQL Editor에서 실행하세요.

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

-- 단일 행을 보장하려면 다음과 같이 초기행을 삽입할 수 있습니다.
INSERT INTO public.restaurant_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
