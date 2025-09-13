-- 멀티테넌시: 누락된 restaurant_id 컬럼들 추가
-- 실제 데이터베이스 테이블 구조에 맞게 수정

-- 1. restaurant_settings 테이블에 restaurant_id 추가 (없으면)
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. menu_item 테이블에 restaurant_id 추가
ALTER TABLE public.menu_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 3. menu_category 테이블에 restaurant_id 추가
ALTER TABLE public.menu_category
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 4. order_ticket 테이블에 restaurant_id 추가 (orders 대신)
ALTER TABLE public.order_ticket
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 5. order_item 테이블에 restaurant_id 추가
ALTER TABLE public.order_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 6. dining_table 테이블에 restaurant_id 추가 (tables 대신)
ALTER TABLE public.dining_table
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 7. waitlist 테이블에 restaurant_id 추가
ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 8. payment 테이블에 restaurant_id 추가
ALTER TABLE public.payment
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 9. kitchen_queue 테이블에 restaurant_id 추가
ALTER TABLE public.kitchen_queue
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 10. user_profile 테이블에 restaurant_id 추가 (선택사항)
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 기존 데이터에 restaurant_id 설정 (첫 번째 식당)
-- restaurant_settings에서 restaurant_id 가져오기
DO $$
DECLARE
    default_restaurant_id uuid;
BEGIN
    -- restaurant_settings에서 첫 번째 식당의 restaurant_id 가져오기
    SELECT restaurant_id INTO default_restaurant_id
    FROM public.restaurant_settings
    WHERE id = 1;

    -- 만약 없으면 기본값 설정
    IF default_restaurant_id IS NULL THEN
        default_restaurant_id := '550e8400-e29b-41d4-a716-446655440000'::uuid;
        UPDATE public.restaurant_settings
        SET restaurant_id = default_restaurant_id,
            domain = 'restaurant1.yourdomain.com',
            is_active = true
        WHERE id = 1;
    END IF;

    -- 다른 테이블들에 restaurant_id 설정 (NULL인 경우만)
    UPDATE public.menu_item SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.menu_category SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.order_ticket SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.order_item SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.dining_table SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.waitlist SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.payment SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.kitchen_queue SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_menu_item_restaurant_id ON public.menu_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_restaurant_id ON public.menu_category(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_ticket_restaurant_id ON public.order_ticket(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_item_restaurant_id ON public.order_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dining_table_restaurant_id ON public.dining_table(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant_id ON public.waitlist(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_restaurant_id ON public.payment(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_restaurant_id ON public.kitchen_queue(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_restaurant_id ON public.user_profile(restaurant_id);

-- restaurant_settings 인덱스
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_domain ON public.restaurant_settings(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_restaurant_id ON public.restaurant_settings(restaurant_id);