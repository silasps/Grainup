-- Tabela de cupons promocionais criados pelo admin
-- Não geram crédito para afiliados — usados para campanhas, presentes, etc.

CREATE TABLE IF NOT EXISTS promo_coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  label            TEXT,                          -- nome interno, ex: "Natal 2026"
  discount_type    TEXT NOT NULL DEFAULT 'percent'
                   CHECK (discount_type IN ('percent', 'fixed')),
  discount_percent INTEGER NOT NULL DEFAULT 0
                   CHECK (discount_percent BETWEEN 0 AND 100),
  discount_fixed   NUMERIC(10,2),
  max_uses         INTEGER DEFAULT NULL,          -- NULL = ilimitado
  uses_count       INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true,
  expires_at       TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: apenas admins gerenciam
ALTER TABLE promo_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY promo_coupons_admin ON promo_coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin_editora')
    )
  );

-- RPC para incremento atômico do contador de usos
CREATE OR REPLACE FUNCTION increment_promo_coupon_uses(p_code TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE promo_coupons SET uses_count = uses_count + 1 WHERE code = p_code;
$$;
