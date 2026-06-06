ALTER TABLE public.combos
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'fixed'
    CHECK (discount_type IN ('fixed', 'percentage'));
