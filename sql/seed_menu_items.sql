-- idempotent seed for menu categories and 10 sample menu items
-- This script uses gen_random_uuid() for generated UUID ids. Ensure the pgcrypto extension is available in your DB.
BEGIN;

-- create categories if missing (id generated)
INSERT INTO public.menu_category (id, name, sort_order, is_active)
SELECT gen_random_uuid(), v.name, v.sort_order, v.is_active
FROM (VALUES
  ('면류', 1, true),
  ('볶음', 2, true),
  ('음료', 3, true)
) AS v(name, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_category WHERE name = v.name);

-- sample menu items: insert if not exists by (name, category)
INSERT INTO public.menu_item (id, name, price, category_id, is_active, is_sold_out, sort_order, image_url)
SELECT gen_random_uuid(), t.name, t.price, c.id, t.is_active, t.is_sold_out, t.sort_order, t.image_url
FROM (VALUES
  ('간장라면', 7000, '면류', true, false, 1, 'https://images.unsplash.com/photo-1543779509-2f4a9b12b2b4?w=800&q=80&auto=format&fit=crop'),
  ('매운라면', 7500, '면류', true, false, 2, 'https://images.unsplash.com/photo-1543353071-087092ec393a?w=800&q=80&auto=format&fit=crop'),
  ('짬뽕', 9000, '면류', true, false, 3, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop'),
  ('제육볶음', 12000, '볶음', true, false, 1, 'https://images.unsplash.com/photo-1604908177522-7f1d6b9e1f6a?w=800&q=80&auto=format&fit=crop'),
  ('오징어볶음', 14000, '볶음', true, false, 2, 'https://images.unsplash.com/photo-1604908177750-6b9f3f7f4b3a?w=800&q=80&auto=format&fit=crop'),
  ('김치볶음밥', 8000, '볶음', true, false, 3, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80&auto=format&fit=crop'),
  ('아메리카노', 3500, '음료', true, false, 1, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop'),
  ('레몬에이드', 4500, '음료', true, false, 2, 'https://images.unsplash.com/photo-1505576391880-7c3b0f9d0e3a?w=800&q=80&auto=format&fit=crop'),
  ('콜라', 2500, '음료', true, false, 3, 'https://images.unsplash.com/photo-1582719478250-5f3a1c9b6b4c?w=800&q=80&auto=format&fit=crop'),
  ('비빔국수', 8500, '면류', true, false, 4, 'https://images.unsplash.com/photo-1595927410236-2b0e7c4f9b5b?w=800&q=80&auto=format&fit=crop')
) AS t(name, price, category_name, is_active, is_sold_out, sort_order, image_url)
JOIN public.menu_category c ON c.name = t.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_item mi WHERE mi.name = t.name AND mi.category_id = c.id
);

COMMIT;
