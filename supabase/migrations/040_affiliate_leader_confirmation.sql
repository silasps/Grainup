ALTER TABLE affiliates
  ADD COLUMN leader_token       UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN leader_confirmation TEXT CHECK (leader_confirmation IN ('confirmed', 'denied')),
  ADD COLUMN leader_confirmation_notes TEXT,
  ADD COLUMN leader_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN affiliates.leader_token        IS 'Token de uso único enviado ao líder para confirmar o vínculo JOCUM';
COMMENT ON COLUMN affiliates.leader_confirmation IS 'Resposta do líder: confirmed | denied';
