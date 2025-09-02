-- idempotent migration: add table_token to dining_table and backfill
BEGIN;

ALTER TABLE IF EXISTS public.dining_table
  ADD COLUMN IF NOT EXISTS table_token text;

-- backfill tokens for existing rows without one
UPDATE public.dining_table
SET table_token = gen_random_uuid()::text
WHERE table_token IS NULL;

-- ensure unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dining_table_table_token_key'
  ) THEN
    ALTER TABLE public.dining_table
      ADD CONSTRAINT dining_table_table_token_key UNIQUE (table_token);
  END IF;
END$$;

COMMIT;
