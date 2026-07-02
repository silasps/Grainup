-- Catálogo de melhorias de UX/design vendidas como upgrade opcional (trial
-- por tempo determinado, depois volta pro fallback antigo até comprar).
-- Correção de bugs NUNCA entra aqui — bug fix é sempre grátis e automático.
CREATE TABLE ux_upgrades (
  key          TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  trial_days   INTEGER NOT NULL DEFAULT 7,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado de ativação por upgrade — uma linha por upgrade (trial é por conta,
-- não por usuário: toda a Editora Jocum compartilha o mesmo relógio).
CREATE TABLE ux_upgrade_activations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upgrade_key       TEXT NOT NULL UNIQUE REFERENCES ux_upgrades(key) ON DELETE CASCADE,
  trial_started_at  TIMESTAMPTZ,
  trial_ends_at     TIMESTAMPTZ,
  purchased_at      TIMESTAMPTZ,
  payment_id        TEXT,
  frozen_at         TIMESTAMPTZ, -- quando o trial expirou sem compra (dado congelado, não perdido)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ux_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_upgrade_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read ux_upgrades" ON ux_upgrades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_editora'))
  );

CREATE POLICY "admins manage ux_upgrade_activations" ON ux_upgrade_activations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_editora'))
  );
