-- idempotent ALTER to add table_count to restaurant_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'table_count'
  ) THEN
    ALTER TABLE public.restaurant_settings ADD COLUMN table_count integer DEFAULT 0;
    RAISE NOTICE 'Added column restaurant_settings.table_count';
  ELSE
    RAISE NOTICE 'Column restaurant_settings.table_count already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'default_table_capacity'
  ) THEN
    ALTER TABLE public.restaurant_settings ADD COLUMN default_table_capacity integer DEFAULT 4;
    RAISE NOTICE 'Added column restaurant_settings.default_table_capacity';
  ELSE
    RAISE NOTICE 'Column restaurant_settings.default_table_capacity already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'table_capacities'
  ) THEN
    ALTER TABLE public.restaurant_settings ADD COLUMN table_capacities jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added column restaurant_settings.table_capacities';
  ELSE
    RAISE NOTICE 'Column restaurant_settings.table_capacities already exists';
  END IF;
END$$;

-- ensure there is a row with id = 1
INSERT INTO public.restaurant_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- set nulls to 0
UPDATE public.restaurant_settings SET table_count = 0 WHERE table_count IS NULL;
UPDATE public.restaurant_settings SET default_table_capacity = 4 WHERE default_table_capacity IS NULL;
UPDATE public.restaurant_settings SET table_capacities = '[]'::jsonb WHERE table_capacities IS NULL;
