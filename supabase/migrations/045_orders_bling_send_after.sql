-- Atraso proposital antes do envio automático ao Bling (pedido de venda + NF-e). Existe
-- como buffer operacional pós-pagamento — NÃO corrige as causas raiz de duplicidade
-- (já resolvidas: claim atômico em pushOrderToBling, filtro ?email= do /contatos, guard de
-- "Desvincular" com NF-e válida). Setado por processApprovedPayment na primeira aprovação
-- de cada pedido (idempotente). O cron /api/admin/bling-auto-send dispara pushOrderToBling
-- assim que bling_send_after <= now(). NULL tem dois significados válidos e distintos:
--   1) pedido "pago" que nunca teve o campo setado (legado, ver backfill abaixo) — tratado
--      no backfill, não deve acontecer daqui pra frente;
--   2) opt-out explícito: resetBlingLinkAction ("Desvincular do Bling") zera este campo de
--      propósito, pra impedir o cron de reenviar sozinho um pedido que o admin está
--      investigando manualmente no Bling. Nesse caso o próximo envio só acontece via botão
--      manual "Enviar ao Bling" — nunca automaticamente.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bling_send_after timestamptz;

-- Backfill: pedidos já "pago" sem bling_order_id e sem essa coluna setada não devem ficar
-- presos esperando um timestamp que nunca existiu — ficam elegíveis imediatamente.
UPDATE orders
SET bling_send_after = now()
WHERE status = 'pago'
  AND bling_order_id IS NULL
  AND bling_send_after IS NULL;

-- Índice parcial: o cron só consulta pedidos pagos ainda não enviados, então só essas linhas
-- precisam estar no índice (evita indexar as milhares de linhas já finalizadas).
CREATE INDEX IF NOT EXISTS orders_bling_send_after_idx
  ON orders (bling_send_after)
  WHERE bling_order_id IS NULL;
