-- Tabela de destaques: slides do hero (tipo: oferta, novidade, anuncio)
CREATE TABLE public.destaques (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  subtitle    text,
  image_url   text,
  cta_label   text DEFAULT 'Saiba mais',
  cta_url     text,
  type        text NOT NULL DEFAULT 'anuncio'
              CHECK (type IN ('oferta', 'novidade', 'anuncio')),
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destaques ENABLE ROW LEVEL SECURITY;

-- Admins têm acesso total
CREATE POLICY "admin_full_access" ON public.destaques
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin_editora')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin_editora')
    )
  );

-- Leitura pública (para exibir no hero)
CREATE POLICY "public_read_active" ON public.destaques
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_destaques_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER destaques_updated_at
  BEFORE UPDATE ON public.destaques
  FOR EACH ROW EXECUTE FUNCTION update_destaques_updated_at();
