-- =============================================
-- 033 — Módulo EAD (multitenancy)
-- =============================================

-- ─── ENUMS ─────────────────────────────────

CREATE TYPE ead_enrollment_status AS ENUM (
  'ativa', 'expirada', 'suspensa', 'cancelada'
);

CREATE TYPE ead_content_type AS ENUM (
  'video', 'texto', 'pdf', 'quiz', 'link_externo'
);

-- ─── TENANTS ───────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  custom_domain TEXT UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  plan          TEXT NOT NULL DEFAULT 'basic',
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE tenant_settings (
  tenant_id          UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url           TEXT,
  primary_color      TEXT DEFAULT '#000000',
  -- Email (NULL = usa domínio GrainUp; preenchido = white-label)
  email_from_name    TEXT,
  email_from_domain  TEXT,
  -- Bunny.net (uma biblioteca por tenant, criada no onboarding)
  bunny_library_id   TEXT,
  bunny_token_key    TEXT,
  bunny_cdn_hostname TEXT,
  -- Mercado Pago (cada tenant usa suas próprias credenciais)
  mp_access_token    TEXT,
  mp_public_key      TEXT,
  -- Comunidade externa
  community_link     TEXT
);

-- Admins associados a cada tenant
CREATE TABLE tenant_admins (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (tenant_id, user_id)
);

-- ─── CURSOS ────────────────────────────────

CREATE TABLE ead_courses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  slug                 TEXT NOT NULL,
  subtitle             TEXT,
  description_short    TEXT,
  description_full     TEXT,
  thumbnail_url        TEXT,
  cover_url            TEXT,
  trailer_video_id     TEXT,
  instructor_name      TEXT,
  instructor_bio       TEXT,
  instructor_photo_url TEXT,
  price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_promotional    NUMERIC(10,2),
  access_days          INT NOT NULL DEFAULT 180,
  is_active            BOOLEAN NOT NULL DEFAULT false,
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  is_free              BOOLEAN NOT NULL DEFAULT false,
  level                TEXT CHECK (level IN ('iniciante','intermediario','avancado')),
  language             TEXT NOT NULL DEFAULT 'pt-BR',
  total_lessons        INT NOT NULL DEFAULT 0,
  total_duration_s     INT NOT NULL DEFAULT 0,
  certificate_enabled  BOOLEAN NOT NULL DEFAULT true,
  sort_order           INT NOT NULL DEFAULT 0,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, slug)
);

CREATE TRIGGER trg_ead_courses_updated_at
  BEFORE UPDATE ON ead_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── MÓDULOS ───────────────────────────────

CREATE TABLE ead_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  position        INT NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_ead_modules_updated_at
  BEFORE UPDATE ON ead_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AULAS ─────────────────────────────────

CREATE TABLE ead_lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID NOT NULL REFERENCES ead_modules(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  content_type    ead_content_type NOT NULL DEFAULT 'video',
  -- Vídeo (Bunny.net)
  bunny_video_id  TEXT,
  duration_s      INT,
  -- Texto/PDF
  content_body    TEXT,
  pdf_url         TEXT,
  -- Link externo
  external_url    TEXT,
  -- Legenda
  subtitle_url    TEXT,
  description     TEXT,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  -- Drip content (NULL = disponível imediatamente)
  publish_at      TIMESTAMPTZ,
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (module_id, slug)
);

CREATE TRIGGER trg_ead_lessons_updated_at
  BEFORE UPDATE ON ead_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Arquivos anexos por aula (PDFs, slides, links)
CREATE TABLE ead_lesson_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL REFERENCES ead_lessons(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'file', -- 'file' | 'link'
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── MATRÍCULAS ────────────────────────────

CREATE TABLE ead_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  status       ead_enrollment_status NOT NULL DEFAULT 'ativa',
  enrolled_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes        TEXT,
  UNIQUE (user_id, course_id)
);

-- ─── PROGRESSO POR AULA ────────────────────

CREATE TABLE ead_lesson_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   UUID NOT NULL REFERENCES ead_enrollments(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES ead_lessons(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed       BOOLEAN NOT NULL DEFAULT false,
  last_position_s INT NOT NULL DEFAULT 0,
  watch_time_s    INT NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (enrollment_id, lesson_id)
);

CREATE TRIGGER trg_ead_progress_updated_at
  BEFORE UPDATE ON ead_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── CERTIFICADOS ──────────────────────────

CREATE TABLE ead_certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id    UUID NOT NULL REFERENCES ead_enrollments(id) ON DELETE CASCADE UNIQUE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL UNIQUE DEFAULT ('CERT-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  issued_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  student_name     TEXT NOT NULL,
  course_title     TEXT NOT NULL
);

-- ─── AVALIAÇÕES ────────────────────────────

CREATE TABLE ead_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  status     review_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (course_id, user_id)
);

-- ─── Q&A POR AULA ──────────────────────────

CREATE TABLE ead_qa_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES ead_lessons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_ead_qa_questions_updated_at
  BEFORE UPDATE ON ead_qa_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE ead_qa_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES ead_qa_questions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_instructor BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_ead_qa_answers_updated_at
  BEFORE UPDATE ON ead_qa_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── QUIZZES ───────────────────────────────

CREATE TABLE ead_quizzes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES ead_modules(id) ON DELETE CASCADE UNIQUE,
  title        TEXT NOT NULL,
  passing_score INT NOT NULL DEFAULT 70,
  blocks_next  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE ead_quiz_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID NOT NULL REFERENCES ead_quizzes(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  options      JSONB NOT NULL, -- [{ "text": "...", "correct": true/false }]
  position     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE ead_quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID NOT NULL REFERENCES ead_quizzes(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers      JSONB NOT NULL, -- { question_id: chosen_index }
  score        INT NOT NULL,
  passed       BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── AVISOS DO INSTRUTOR ───────────────────

CREATE TABLE ead_course_announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  sent_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  sent_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─── FAVORITOS ─────────────────────────────

CREATE TABLE ead_wishlists (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES ead_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- ─── ÍNDICES ───────────────────────────────

CREATE INDEX idx_ead_courses_tenant      ON ead_courses(tenant_id);
CREATE INDEX idx_ead_courses_slug        ON ead_courses(tenant_id, slug);
CREATE INDEX idx_ead_courses_active      ON ead_courses(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_ead_modules_course      ON ead_modules(course_id, position);
CREATE INDEX idx_ead_lessons_module      ON ead_lessons(module_id, position);
CREATE INDEX idx_ead_lessons_course      ON ead_lessons(course_id);
CREATE INDEX idx_ead_lessons_publish_at  ON ead_lessons(publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX idx_ead_enrollments_user    ON ead_enrollments(user_id);
CREATE INDEX idx_ead_enrollments_course  ON ead_enrollments(course_id);
CREATE INDEX idx_ead_enrollments_expires ON ead_enrollments(expires_at) WHERE status = 'ativa';
CREATE INDEX idx_ead_progress_enrollment ON ead_lesson_progress(enrollment_id);
CREATE INDEX idx_ead_progress_user       ON ead_lesson_progress(user_id);
CREATE INDEX idx_ead_certs_user          ON ead_certificates(user_id);
CREATE INDEX idx_ead_certs_code          ON ead_certificates(certificate_code);
CREATE INDEX idx_ead_qa_lesson           ON ead_qa_questions(lesson_id);
CREATE INDEX idx_tenant_admins_user      ON tenant_admins(user_id);

-- ─── RLS ───────────────────────────────────

ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_modules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_lesson_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_enrollments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_lesson_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_certificates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_qa_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_qa_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_quizzes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_quiz_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_quiz_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ead_wishlists            ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário atual é admin do tenant
CREATE OR REPLACE FUNCTION has_tenant_access(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('super_admin') OR EXISTS (
    SELECT 1 FROM tenant_admins
    WHERE tenant_id = p_tenant_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: verifica matrícula ativa e não expirada
CREATE OR REPLACE FUNCTION is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ead_enrollments
    WHERE user_id = auth.uid()
      AND course_id = p_course_id
      AND status = 'ativa'
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: % de conclusão de uma matrícula
CREATE OR REPLACE FUNCTION ead_course_progress(p_enrollment_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_lessons     INT;
  completed_lessons INT;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM ead_lessons l
  JOIN ead_enrollments e ON e.course_id = l.course_id
  WHERE e.id = p_enrollment_id
    AND (l.publish_at IS NULL OR l.publish_at <= now());

  SELECT COUNT(*) INTO completed_lessons
  FROM ead_lesson_progress p
  WHERE p.enrollment_id = p_enrollment_id AND p.completed = true;

  IF total_lessons = 0 THEN RETURN 0; END IF;
  RETURN ROUND((completed_lessons::NUMERIC / total_lessons) * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants: super_admin vê todos; tenant admins veem o próprio
CREATE POLICY "tenants_own_admin"
  ON tenants FOR SELECT
  USING (has_role('super_admin') OR has_tenant_access(id));
CREATE POLICY "tenants_super_admin_all"
  ON tenants FOR ALL
  USING (has_role('super_admin'));

-- Tenant settings: apenas admins do tenant
CREATE POLICY "tenant_settings_admin"
  ON tenant_settings FOR ALL
  USING (has_tenant_access(tenant_id));

-- Tenant admins: super_admin gerencia; usuário lê o próprio
CREATE POLICY "tenant_admins_own"
  ON tenant_admins FOR SELECT
  USING (user_id = auth.uid() OR has_role('super_admin'));
CREATE POLICY "tenant_admins_super"
  ON tenant_admins FOR ALL
  USING (has_role('super_admin'));

-- Cursos: leitura pública (ativos); admin do tenant gerencia
CREATE POLICY "ead_courses_public_read"
  ON ead_courses FOR SELECT
  USING (is_active = true);
CREATE POLICY "ead_courses_admin"
  ON ead_courses FOR ALL
  USING (has_tenant_access(tenant_id));

-- Módulos: leitura para matriculados + preview público; admin gerencia
CREATE POLICY "ead_modules_read"
  ON ead_modules FOR SELECT
  USING (
    is_free_preview = true
    OR is_enrolled(course_id)
    OR has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
  );
CREATE POLICY "ead_modules_admin"
  ON ead_modules FOR ALL
  USING (has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id)));

-- Aulas: matriculados + preview + drip (só aulas já publicadas)
CREATE POLICY "ead_lessons_read"
  ON ead_lessons FOR SELECT
  USING (
    (
      is_free_preview = true
      OR is_enrolled(course_id)
      OR has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
    )
    AND (publish_at IS NULL OR publish_at <= now() OR has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id)))
  );
CREATE POLICY "ead_lessons_admin"
  ON ead_lessons FOR ALL
  USING (has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id)));

-- Anexos: mesma regra das aulas
CREATE POLICY "ead_attachments_read"
  ON ead_lesson_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ead_lessons l
      WHERE l.id = lesson_id
        AND (l.is_free_preview = true OR is_enrolled(l.course_id))
    )
  );
CREATE POLICY "ead_attachments_admin"
  ON ead_lesson_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ead_lessons l
      JOIN ead_courses c ON c.id = l.course_id
      WHERE l.id = lesson_id AND has_tenant_access(c.tenant_id)
    )
  );

-- Matrículas: usuário vê as próprias; admin do tenant vê todas do tenant
CREATE POLICY "ead_enrollments_own"
  ON ead_enrollments FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "ead_enrollments_insert"
  ON ead_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ead_enrollments_admin"
  ON ead_enrollments FOR ALL
  USING (
    has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
  );

-- Progresso: usuário gerencia o próprio; admin do tenant lê
CREATE POLICY "ead_progress_own"
  ON ead_lesson_progress FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "ead_progress_admin"
  ON ead_lesson_progress FOR SELECT
  USING (
    has_tenant_access((
      SELECT c.tenant_id FROM ead_lessons l
      JOIN ead_courses c ON c.id = l.course_id
      WHERE l.id = lesson_id
    ))
  );

-- Certificados: usuário vê os próprios; verificação pública por código via service role
CREATE POLICY "ead_certs_own"
  ON ead_certificates FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "ead_certs_admin"
  ON ead_certificates FOR ALL
  USING (
    has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
  );

-- Avaliações: públicas (aprovadas); aluno cria/edita a própria
CREATE POLICY "ead_reviews_public"
  ON ead_reviews FOR SELECT
  USING (status = 'aprovada');
CREATE POLICY "ead_reviews_own"
  ON ead_reviews FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "ead_reviews_admin"
  ON ead_reviews FOR ALL
  USING (
    has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
  );

-- Q&A: matriculados lêem e criam; admins moderam
CREATE POLICY "ead_qa_questions_read"
  ON ead_qa_questions FOR SELECT
  USING (is_enrolled((SELECT course_id FROM ead_lessons WHERE id = lesson_id)) OR is_admin());
CREATE POLICY "ead_qa_questions_own"
  ON ead_qa_questions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ead_qa_questions_admin"
  ON ead_qa_questions FOR ALL
  USING (is_admin());

CREATE POLICY "ead_qa_answers_read"
  ON ead_qa_answers FOR SELECT
  USING (
    is_enrolled((
      SELECT l.course_id FROM ead_lessons l
      JOIN ead_qa_questions q ON q.lesson_id = l.id
      WHERE q.id = question_id
    )) OR is_admin()
  );
CREATE POLICY "ead_qa_answers_own"
  ON ead_qa_answers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ead_qa_answers_admin"
  ON ead_qa_answers FOR ALL
  USING (is_admin());

-- Quizzes e perguntas: matriculados lêem; admins gerenciam
CREATE POLICY "ead_quizzes_read"
  ON ead_quizzes FOR SELECT
  USING (
    is_enrolled((SELECT course_id FROM ead_modules WHERE id = module_id))
    OR is_admin()
  );
CREATE POLICY "ead_quizzes_admin"  ON ead_quizzes FOR ALL  USING (is_admin());

CREATE POLICY "ead_quiz_questions_read"
  ON ead_quiz_questions FOR SELECT
  USING (
    is_enrolled((
      SELECT m.course_id FROM ead_modules m
      JOIN ead_quizzes q ON q.module_id = m.id
      WHERE q.id = quiz_id
    )) OR is_admin()
  );
CREATE POLICY "ead_quiz_questions_admin" ON ead_quiz_questions FOR ALL USING (is_admin());

CREATE POLICY "ead_quiz_attempts_own"
  ON ead_quiz_attempts FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "ead_quiz_attempts_admin"
  ON ead_quiz_attempts FOR SELECT
  USING (is_admin());

-- Avisos: matriculados lêem; admins criam
CREATE POLICY "ead_announcements_read"
  ON ead_course_announcements FOR SELECT
  USING (is_enrolled(course_id) OR is_admin());
CREATE POLICY "ead_announcements_admin"
  ON ead_course_announcements FOR ALL
  USING (
    has_tenant_access((SELECT tenant_id FROM ead_courses WHERE id = course_id))
  );

-- Favoritos: usuário gerencia os próprios
CREATE POLICY "ead_wishlists_own"
  ON ead_wishlists FOR ALL
  USING (user_id = auth.uid());
