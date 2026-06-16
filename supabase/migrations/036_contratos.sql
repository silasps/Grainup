-- Tabela de contratos digitais com trilha de evidência para assinatura eletrônica simples
-- Lei 14.063/2020 + STJ REsp 2.159.442/2025

CREATE TABLE contratos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_name     TEXT        NOT NULL,
  client_email    TEXT        NOT NULL,
  contract_slug   TEXT        NOT NULL DEFAULT 'editora-jocum-v1',
  status          TEXT        NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'assinado', 'expirado')),
  otp_hash        TEXT,
  otp_expires_at  TIMESTAMPTZ,
  signed_at       TIMESTAMPTZ,
  signer_ip       TEXT,
  signer_user_agent TEXT,
  signer_latitude   NUMERIC(10, 7),
  signer_longitude  NUMERIC(10, 7),
  evidence_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX contratos_token_idx ON contratos (token);
CREATE INDEX contratos_status_idx ON contratos (status);
