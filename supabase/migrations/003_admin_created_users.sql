-- Tabela de auditoria para usuários criados diretamente pelo admin
CREATE TABLE admin_user_creations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name  TEXT NOT NULL,
  created_by_role  user_role NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE admin_user_creations ENABLE ROW LEVEL SECURITY;

-- Somente admins podem consultar os registros
CREATE POLICY "admin_user_creations_select" ON admin_user_creations
  FOR SELECT TO authenticated
  USING (is_admin());
