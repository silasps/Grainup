-- Log de auditoria pras ações que criam/desfazem o vínculo com o Bling (pedido de venda +
-- NF-e). Existe porque não havia como provar, só com dados do banco, se uma nota duplicada
-- veio de um clique dentro da nossa plataforma (ex.: "Desvincular" + "Enviar Bling" de novo)
-- ou de fora dela — investigação real em 2026-09 não conseguiu descartar nenhuma hipótese só
-- olhando bling_order_id/bling_nfe_id. Cada linha aqui registra quem/o quê disparou uma ação,
-- de onde (cron automático vs. clique manual, com e-mail do admin quando aplicável), e o
-- resultado — inclusive tentativas bloqueadas pelos guards e chamadas "ignoradas" por já
-- existir um envio em andamento (evidência direta de corrida/duplo clique, se acontecer).
CREATE TABLE IF NOT EXISTS bling_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  action text NOT NULL,       -- 'push_attempt' | 'push_skipped' | 'push_success' | 'push_nfe_failed' | 'push_failed' | 'reset_blocked' | 'reset_ok' | 'sync_fallback_create'
  source text NOT NULL,       -- 'cron_auto_send' | 'manual_admin'
  actor text,                 -- e-mail do admin logado, quando a ação foi manual; null pra cron
  detail text,                -- mensagem de erro, IDs do Bling envolvidos, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bling_action_log_order_id_idx ON bling_action_log (order_id);
CREATE INDEX IF NOT EXISTS bling_action_log_created_at_idx ON bling_action_log (created_at);
