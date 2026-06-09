-- Cupons gerados por afiliados
-- Lógica: afiliado tem 50% de "margem". Cupom de X% → afiliado ganha (50-X)%.
-- Se X > 50, a diferença é debitada do saldo do afiliado.

CREATE TABLE affiliate_coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id     UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  code             TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  max_uses         INTEGER DEFAULT NULL,   -- NULL = ilimitado
  uses_count       INTEGER DEFAULT 0 NOT NULL,
  expires_at       TIMESTAMPTZ DEFAULT NULL,
  active           BOOLEAN DEFAULT true NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX affiliate_coupons_code_idx      ON affiliate_coupons(code);
CREATE INDEX affiliate_coupons_affiliate_idx ON affiliate_coupons(affiliate_id);

ALTER TABLE affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- Afiliado vê e gerencia apenas os seus
CREATE POLICY "affiliate_coupons_own" ON affiliate_coupons
  FOR ALL USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Admins veem tudo
CREATE POLICY "affiliate_coupons_admin" ON affiliate_coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_editora')
    )
  );

-- Incrementa atomicamente o contador de usos (chamado pelo webhook via service role)
CREATE OR REPLACE FUNCTION increment_coupon_uses(p_code TEXT)
RETURNS VOID AS $$
  UPDATE affiliate_coupons SET uses_count = uses_count + 1 WHERE code = p_code;
$$ LANGUAGE SQL SECURITY DEFINER;
