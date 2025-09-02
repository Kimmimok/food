-- Add station column to menu_item and backfill
BEGIN;
ALTER TABLE IF EXISTS public.menu_item
  ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'main';

-- Optional: constrain to known stations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_item_station_check'
  ) THEN
    ALTER TABLE public.menu_item
      ADD CONSTRAINT menu_item_station_check CHECK (station IN ('main','bar','dessert'));
  END IF;
END$$;

COMMIT;
