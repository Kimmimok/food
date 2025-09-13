-- 멀티테넌시 1단계: 데이터베이스 스키마 수정
-- restaurant_settings 테이블에 restaurant_id, domain, is_active 컬럼 추가

-- 1. restaurant_settings 테이블에 컬럼 추가
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. 기존 데이터 업데이트 (첫 번째 식당)
UPDATE public.restaurant_settings
SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid,
    domain = 'restaurant1.yourdomain.com',
    is_active = true
WHERE id = 1;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_domain ON public.restaurant_settings(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_restaurant_id ON public.restaurant_settings(restaurant_id);

-- 4. 변경사항 확인
SELECT id, name, restaurant_id, domain, is_active FROM public.restaurant_settings;