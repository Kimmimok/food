-- Idempotent ALTERs to add alert settings to restaurant_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'enable_new_order_sound'
    ) THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN enable_new_order_sound boolean DEFAULT true;
        RAISE NOTICE 'Added column restaurant_settings.enable_new_order_sound';
    ELSE
        RAISE NOTICE 'Column restaurant_settings.enable_new_order_sound already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'enable_new_order_popup'
    ) THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN enable_new_order_popup boolean DEFAULT true;
        RAISE NOTICE 'Added column restaurant_settings.enable_new_order_popup';
    ELSE
        RAISE NOTICE 'Column restaurant_settings.enable_new_order_popup already exists';
    END IF;
END $$;

-- Ensure base row exists
INSERT INTO public.restaurant_settings (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_settings WHERE id = 1);
