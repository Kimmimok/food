-- 멀티테넌시 2단계: 다른 테이블에 restaurant_id 추가
-- menu_item, menu_category, orders, order_item, tables, waitlist 테이블에 restaurant_id 추가

-- 1. menu_item 테이블
ALTER TABLE public.menu_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 2. menu_category 테이블
ALTER TABLE public.menu_category
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 3. orders 테이블
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 4. order_item 테이블
ALTER TABLE public.order_item
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 5. tables 테이블
ALTER TABLE public.tables
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 6. waitlist 테이블
ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 7. user_profile 테이블 (선택사항)
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurant_settings(restaurant_id);

-- 8. 기존 데이터에 restaurant_id 설정 (첫 번째 식당)
UPDATE public.menu_item SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;
UPDATE public.menu_category SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;
UPDATE public.orders SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;
UPDATE public.order_item SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;
UPDATE public.tables SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;
UPDATE public.waitlist SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid WHERE restaurant_id IS NULL;

-- 9. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_menu_item_restaurant_id ON public.menu_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_restaurant_id ON public.menu_category(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_item_restaurant_id ON public.order_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant_id ON public.waitlist(restaurant_id);