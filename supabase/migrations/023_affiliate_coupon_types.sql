-- Adiciona suporte a tipos de desconto nos cupons de afiliado
ALTER TABLE affiliate_coupons
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_fixed numeric(10,2);
