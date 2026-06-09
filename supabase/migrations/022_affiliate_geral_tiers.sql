-- Adiciona tipo 'geral' e role 'afiliado_geral'
ALTER TYPE affiliate_type   ADD VALUE IF NOT EXISTS 'geral';
ALTER TYPE user_role        ADD VALUE IF NOT EXISTS 'afiliado_geral';

-- Contador de vendas confirmadas (base para progressão de tier)
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS total_confirmed_sales INT NOT NULL DEFAULT 0;

-- Campos adicionais no saque
ALTER TABLE affiliate_withdrawals
  ADD COLUMN IF NOT EXISTS pix_key      TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf','email','telefone','aleatoria')),
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Incrementa total_confirmed_sales quando uma venda é confirmada/paga
CREATE OR REPLACE FUNCTION increment_affiliate_confirmed_sales()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmada','paga') AND OLD.status = 'pendente' THEN
    UPDATE affiliates
       SET total_confirmed_sales = total_confirmed_sales + 1
     WHERE id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_sales_confirmed
  AFTER UPDATE ON affiliate_sales
  FOR EACH ROW EXECUTE FUNCTION increment_affiliate_confirmed_sales();

-- Tiers para afiliado geral:
--  0-9   → 30%  (Explorador)
-- 10-24  → 35%  (Colaborador)
-- 25-49  → 40%  (Parceiro)
-- 50-99  → 45%  (Embaixador)
-- 100+   → 50%  (Embaixador Elite)
CREATE OR REPLACE FUNCTION affiliate_margin(p_type TEXT, p_sales INT)
RETURNS NUMERIC AS $$
BEGIN
  IF p_type IN ('jocum','diretor') THEN RETURN 50; END IF;
  IF p_sales >= 100 THEN RETURN 50; END IF;
  IF p_sales >=  50 THEN RETURN 45; END IF;
  IF p_sales >=  25 THEN RETURN 40; END IF;
  IF p_sales >=  10 THEN RETURN 35; END IF;
  RETURN 30;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
