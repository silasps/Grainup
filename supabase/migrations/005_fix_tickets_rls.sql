-- Corrige a policy tickets_own que usa auth.users diretamente
-- causando "permission denied for table users" para usuários autenticados.
-- auth.email() e auth.uid() são as funções corretas para usar em RLS policies.

DROP POLICY IF EXISTS "tickets_own" ON support_tickets;

CREATE POLICY "tickets_own" ON support_tickets
  FOR SELECT USING (
    customer_email = auth.email()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_own" ON support_messages;

CREATE POLICY "messages_own" ON support_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE customer_email = auth.email()
         OR user_id = auth.uid()
    )
  );
