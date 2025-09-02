-- Trigger: insert into kitchen_queue when new order_item is created
-- Run this in Supabase SQL editor or psql as a privileged user.

-- Create function that inserts into kitchen_queue on order_item insert
CREATE OR REPLACE FUNCTION public.fn_enqueue_order_item_to_kitchen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Determine station from menu_item; default to 'main'
  INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
  SELECT NEW.id, COALESCE(mi.station, 'main'), 'queued', NOW()
  FROM public.menu_item mi
  WHERE mi.id = NEW.menu_item_id;

  -- If menu_item not found, still insert with 'main'
  IF NOT FOUND THEN
    INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
    VALUES (NEW.id, 'main', 'queued', NOW());
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trg_enqueue_order_item_to_kitchen ON public.order_item;
CREATE TRIGGER trg_enqueue_order_item_to_kitchen
AFTER INSERT ON public.order_item
FOR EACH ROW
EXECUTE FUNCTION public.fn_enqueue_order_item_to_kitchen();

-- Backfill: insert kitchen_queue rows for existing order_item rows missing in kitchen_queue
-- Only insert items that are not already in kitchen_queue
-- NOTE: some schemas do not have an order_item.created_at column; use NOW() for created_at
INSERT INTO public.kitchen_queue (order_item_id, station, status, created_at)
SELECT oi.id, COALESCE(mi.station, 'main'), 'queued', NOW()
FROM public.order_item oi
LEFT JOIN public.kitchen_queue kq ON kq.order_item_id = oi.id
LEFT JOIN public.menu_item mi ON mi.id = oi.menu_item_id
WHERE kq.id IS NULL;

-- Optional: ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_order_item_id ON public.kitchen_queue(order_item_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_queue_station ON public.kitchen_queue(station);
