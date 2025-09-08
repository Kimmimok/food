-- 자동으로 user_profile 레코드를 생성하는 트리거
-- Supabase SQL Editor에서 실행하세요.

-- 트리거 함수: 새 auth.users 레코드가 만들어질 때 자동으로 user_profile 생성
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- user_profile이 이미 존재하지 않을 때만 삽입
  IF NOT EXISTS (SELECT 1 FROM public.user_profile WHERE id = NEW.id) THEN
    INSERT INTO public.user_profile (id, email, name, role, created_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->> 'full_name', 'member', now());
  END IF;
  RETURN NEW;
END;
$$;

-- 트리거 생성 (auth.users 테이블에 AFTER INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auth_user_insert_user_profile'
  ) THEN
    CREATE TRIGGER auth_user_insert_user_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END;
$$;

-- 주의: Supabase의 auth.users는 관리되는 스키마입니다. 이 트리거는 서비스 역할 또는 DB 권한이 필요하지 않습니다.
