-- =============================================
-- GrainUp MVP — Schema inicial
-- =============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────
-- FUNÇÕES UTILITÁRIAS
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_slug(input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(unaccent(trim(input)), '[^a-z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'GU';
  seq    BIGINT;
BEGIN
  seq := nextval('order_number_seq');
  RETURN prefix || lpad(seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SAC' || lpad(nextval('ticket_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 100;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- PERFIS E ROLES
-- ─────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  cpf         TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin_editora',
  'admin_ead',
  'admin_eifol',
  'cliente',
  'afiliado_jocum',
  'afiliado_diretor',
  'lider_jocum'
);

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- EDITORA — PRODUTOS
-- ─────────────────────────────────────────

CREATE TABLE authors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  bio        TEXT,
  photo_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE books (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  subtitle            TEXT,
  slug                TEXT NOT NULL UNIQUE,
  author_id           UUID REFERENCES authors(id) ON DELETE SET NULL,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  cover_url           TEXT,
  description_short   TEXT,
  description_full    TEXT,
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  price_promotional   NUMERIC(10,2) CHECK (price_promotional >= 0),
  stock               INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  weight_grams        INT,
  height_cm           NUMERIC(6,2),
  width_cm            NUMERIC(6,2),
  length_cm           NUMERIC(6,2),
  pages               INT,
  isbn                TEXT,
  sku                 TEXT UNIQUE,
  ncm                 TEXT,
  cfop                TEXT,
  publisher           TEXT,
  published_at        DATE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  is_new              BOOLEAN NOT NULL DEFAULT false,
  is_bestseller       BOOLEAN NOT NULL DEFAULT false,
  sales_count         INT NOT NULL DEFAULT 0,
  rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count        INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE book_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE book_tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE book_tag_relations (
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES book_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

CREATE TABLE combos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  image_url         TEXT,
  price_original    NUMERIC(10,2) NOT NULL,
  price_promotional NUMERIC(10,2) NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE combo_items (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  book_id  UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1
);

CREATE TABLE offers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('book','combo','category','shipping')),
  book_id          UUID REFERENCES books(id) ON DELETE CASCADE,
  combo_id         UUID REFERENCES combos(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE CASCADE,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_value  NUMERIC(10,2),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────
-- EDITORA — VENDAS
-- ─────────────────────────────────────────

CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT,
  full_name    TEXT NOT NULL,
  zip_code     TEXT NOT NULL,
  street       TEXT NOT NULL,
  number       TEXT NOT NULL,
  complement   TEXT,
  neighborhood TEXT NOT NULL,
  city         TEXT NOT NULL,
  state        CHAR(2) NOT NULL,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  book_id    UUID REFERENCES books(id) ON DELETE CASCADE,
  combo_id   UUID REFERENCES combos(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (
    (book_id IS NOT NULL AND combo_id IS NULL) OR
    (book_id IS NULL AND combo_id IS NOT NULL)
  )
);

CREATE TYPE order_status AS ENUM (
  'aguardando_pagamento','pago','separando','enviado','entregue','cancelado','reembolsado'
);

CREATE TYPE payment_status AS ENUM (
  'pendente','aprovado','recusado','cancelado','reembolsado','chargeback'
);

CREATE TYPE payment_method AS ENUM ('pix','credito','debito','boleto');

CREATE TYPE fiscal_status AS ENUM (
  'nao_emitida','aguardando_emissao','emitida','autorizada',
  'rejeitada','cancelada','erro_emissao','pendencia_fiscal'
);

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT NOT NULL UNIQUE DEFAULT generate_order_number(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email    TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_cpf      TEXT,
  shipping_address  JSONB NOT NULL DEFAULT '{}',
  subtotal          NUMERIC(10,2) NOT NULL,
  discount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  status            order_status NOT NULL DEFAULT 'aguardando_pagamento',
  payment_status    payment_status NOT NULL DEFAULT 'pendente',
  payment_method    payment_method,
  affiliate_id      UUID,
  coupon_code       TEXT,
  notes             TEXT,
  tracking_code     TEXT,
  fiscal_status     fiscal_status NOT NULL DEFAULT 'nao_emitida',
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE SET NULL,
  combo_id    UUID REFERENCES combos(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE shipping_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  state          CHAR(2),
  min_order_value NUMERIC(10,2),
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_days INT NOT NULL DEFAULT 7,
  is_free        BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE payment_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway          TEXT NOT NULL,
  gateway_tx_id    TEXT,
  status           TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  payment_method   payment_method,
  pix_code         TEXT,
  response_raw     JSONB,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────
-- EDITORA — ENGAJAMENTO
-- ─────────────────────────────────────────

CREATE TYPE review_status AS ENUM ('pendente','aprovada','rejeitada');

CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT,
  body       TEXT,
  status     review_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  origin             TEXT NOT NULL DEFAULT 'newsletter',
  book_id            UUID REFERENCES books(id) ON DELETE SET NULL,
  marketing_consent  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TYPE ticket_status AS ENUM (
  'novo','em_atendimento','aguardando_cliente','resolvido','fechado'
);

CREATE TABLE support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT NOT NULL UNIQUE DEFAULT generate_ticket_number(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  category        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  status          ticket_status NOT NULL DEFAULT 'novo',
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE faq_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE faqs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  position     INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE news_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  summary      TEXT,
  content      TEXT,
  image_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE contact_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT,
  whatsapp         TEXT,
  phone            TEXT,
  whatsapp_message TEXT DEFAULT 'Olá! Gostaria de saber mais sobre os livros da GrainUp Editora.',
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  address          TEXT,
  business_hours   TEXT,
  instagram        TEXT,
  facebook         TEXT,
  youtube          TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE legal_pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL UNIQUE CHECK (type IN ('privacy','terms','returns','shipping','cookies')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE cookie_consents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  accepted   BOOLEAN NOT NULL,
  ip         TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────
-- FINANCEIRO / FISCAL
-- ─────────────────────────────────────────

CREATE TABLE financial_movements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gross_amount          NUMERIC(10,2) NOT NULL,
  discount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping              NUMERIC(10,2) NOT NULL DEFAULT 0,
  gateway_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  affiliate_commission  NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount            NUMERIC(10,2) NOT NULL,
  payment_method        payment_method,
  gateway               TEXT,
  gateway_transaction_id TEXT,
  status                TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE fiscal_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          fiscal_status NOT NULL DEFAULT 'nao_emitida',
  document_type   TEXT,
  document_number TEXT,
  document_url    TEXT,
  xml_url         TEXT,
  error_message   TEXT,
  issued_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_fiscal_updated_at
  BEFORE UPDATE ON fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- AFILIADOS
-- ─────────────────────────────────────────

CREATE TYPE affiliate_type AS ENUM ('jocum','diretor');
CREATE TYPE affiliate_status AS ENUM ('pendente','ativo','suspenso','rejeitado');

CREATE TABLE affiliates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             affiliate_type NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  cpf              TEXT NOT NULL,
  phone            TEXT NOT NULL,
  status           affiliate_status NOT NULL DEFAULT 'pendente',
  commission_rate  NUMERIC(5,2) NOT NULL DEFAULT 10,
  balance          NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_pending  NUMERIC(10,2) NOT NULL DEFAULT 0,
  leader_name      TEXT,
  leader_email     TEXT,
  leader_phone     TEXT,
  serving_location TEXT,
  last_confirmed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE affiliate_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  book_id      UUID REFERENCES books(id) ON DELETE CASCADE,
  code         TEXT NOT NULL UNIQUE,
  clicks       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE affiliate_sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate   NUMERIC(5,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmada','paga','cancelada')),
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE affiliate_withdrawals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','processando','pago','recusado')),
  notes        TEXT,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────
-- LOGS
-- ─────────────────────────────────────────

CREATE TABLE admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   UUID,
  details     JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────

CREATE INDEX idx_books_slug         ON books(slug);
CREATE INDEX idx_books_author       ON books(author_id);
CREATE INDEX idx_books_category     ON books(category_id);
CREATE INDEX idx_books_active       ON books(is_active);
CREATE INDEX idx_books_featured     ON books(is_featured);
CREATE INDEX idx_books_sales        ON books(sales_count DESC);
CREATE INDEX idx_books_rating       ON books(rating_avg DESC);
CREATE INDEX idx_books_search       ON books USING gin(to_tsvector('portuguese', title || ' ' || COALESCE(description_short, '')));

CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_created     ON orders(created_at DESC);
CREATE INDEX idx_order_items_order  ON order_items(order_id);

CREATE INDEX idx_reviews_book       ON reviews(book_id);
CREATE INDEX idx_reviews_status     ON reviews(status);
CREATE INDEX idx_tickets_status     ON support_tickets(status);
CREATE INDEX idx_affiliates_user    ON affiliates(user_id);
CREATE INDEX idx_affiliate_links_code ON affiliate_links(code);

-- ─────────────────────────────────────────
-- RLS — ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs          ENABLE ROW LEVEL SECURITY;

-- Helper function para verificar role do usuário atual
CREATE OR REPLACE FUNCTION has_role(check_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin','admin_editora','admin_ead','admin_eifol')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: usuário acessa o próprio perfil; admins acessam todos
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "profiles_admin" ON profiles
  FOR SELECT USING (is_admin());

-- User roles: apenas leitura do próprio
CREATE POLICY "user_roles_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Books: leitura pública; escrita apenas para admin_editora e super_admin
CREATE POLICY "books_public_read" ON books
  FOR SELECT USING (is_active = true);
CREATE POLICY "books_admin_all" ON books
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Authors, Categories: leitura pública
CREATE POLICY "authors_public" ON authors FOR SELECT USING (true);
CREATE POLICY "authors_admin"  ON authors FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "categories_public" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin"  ON categories FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Book images: leitura pública
CREATE POLICY "book_images_public" ON book_images FOR SELECT USING (true);
CREATE POLICY "book_images_admin"  ON book_images FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Combos, Offers: leitura pública (ativos); escrita admin
CREATE POLICY "combos_public" ON combos FOR SELECT USING (is_active = true);
CREATE POLICY "combos_admin"  ON combos FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "combo_items_public" ON combo_items FOR SELECT USING (true);
CREATE POLICY "combo_items_admin"  ON combo_items FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "offers_public" ON offers FOR SELECT USING (is_active = true);
CREATE POLICY "offers_admin"  ON offers FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Addresses: usuário vê apenas os seus
CREATE POLICY "addresses_own" ON addresses
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "addresses_admin" ON addresses
  FOR SELECT USING (has_role('super_admin') OR has_role('admin_editora'));

-- Carts: usuário vê o seu
CREATE POLICY "carts_own" ON carts
  FOR ALL USING (user_id = auth.uid() OR session_id IS NOT NULL);
CREATE POLICY "cart_items_own" ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

-- Orders: usuário vê os seus; admin vê todos
CREATE POLICY "orders_own" ON orders
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_admin" ON orders
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "order_items_own" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
CREATE POLICY "order_items_admin" ON order_items
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Reviews: leitura pública (aprovadas); cliente insere; admin modera
CREATE POLICY "reviews_public" ON reviews
  FOR SELECT USING (status = 'aprovada');
CREATE POLICY "reviews_own" ON reviews
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "reviews_admin" ON reviews
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Leads: insert público; leitura apenas admin
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_admin"  ON leads FOR SELECT USING (has_role('super_admin') OR has_role('admin_editora'));

-- Support tickets: cliente insere e vê os seus; admin vê todos
CREATE POLICY "tickets_insert"   ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "tickets_own"      ON support_tickets FOR SELECT USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "tickets_admin"    ON support_tickets FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "messages_own"     ON support_messages FOR SELECT USING (
  ticket_id IN (SELECT id FROM support_tickets WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);
CREATE POLICY "messages_insert"  ON support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_admin"   ON support_messages FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Financial / Fiscal: apenas admins
CREATE POLICY "financial_admin" ON financial_movements
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "fiscal_admin" ON fiscal_documents
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Affiliates: afiliado vê o próprio; admin vê todos
CREATE POLICY "affiliates_own"   ON affiliates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "affiliates_insert" ON affiliates FOR INSERT WITH CHECK (true);
CREATE POLICY "affiliates_admin" ON affiliates FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "aff_links_own"    ON affiliate_links FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "aff_links_admin"  ON affiliate_links FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "aff_sales_own"    ON affiliate_sales FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "aff_sales_admin"  ON affiliate_sales FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
CREATE POLICY "aff_withdraw_own" ON affiliate_withdrawals
  FOR ALL USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "aff_withdraw_admin" ON affiliate_withdrawals
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

-- Admin logs: apenas super_admin lê; sistema insere
CREATE POLICY "admin_logs_admin" ON admin_logs
  FOR SELECT USING (has_role('super_admin'));
CREATE POLICY "admin_logs_insert" ON admin_logs
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────
-- DADOS INICIAIS
-- ─────────────────────────────────────────

-- Categorias (migradas do site atual)
INSERT INTO categories (name, slug) VALUES
  ('Aconselhamento',       'aconselhamento'),
  ('Batalha espiritual',   'batalha-espiritual'),
  ('Biografia',            'biografia'),
  ('Devocional',           'devocional'),
  ('Evangelismo',          'evangelismo'),
  ('Família',              'familia'),
  ('Finanças',             'financas'),
  ('Igreja',               'igreja'),
  ('Liderança',            'lideranca'),
  ('Missões',              'missoes'),
  ('Mulheres',             'mulheres'),
  ('Oração',               'oracao'),
  ('Vida cristã',          'vida-crista'),
  ('Transformação social', 'transformacao-social');

-- Tags padrão
INSERT INTO book_tags (name, slug, color) VALUES
  ('Mais vendido',     'mais-vendido',     '#2E8B57'),
  ('Lançamento',       'lancamento',       '#1D4ED8'),
  ('Oferta',           'oferta',           '#DC2626'),
  ('Combo',            'combo',            '#7C3AED'),
  ('Recomendado',      'recomendado',      '#D97706'),
  ('Frete grátis',     'frete-gratis',     '#059669'),
  ('Novidade',         'novidade',         '#0891B2');

-- Categorias de FAQ
INSERT INTO faq_categories (name, slug, position) VALUES
  ('Compra',             'compra',           1),
  ('Pagamento',          'pagamento',        2),
  ('Entrega',            'entrega',          3),
  ('Trocas e devoluções','trocas-devolucoes',4),
  ('Afiliados',          'afiliados',        5),
  ('Conta e login',      'conta-login',      6),
  ('Privacidade',        'privacidade',      7);

-- Configuração de contato inicial
INSERT INTO contact_settings (
  id, email, whatsapp, phone, whatsapp_message, whatsapp_enabled,
  address, business_hours, instagram
) VALUES (
  gen_random_uuid(),
  'contato@grainupeditora.com.br',
  '5541991435610',
  '(41) 9914-35610',
  'Olá! Gostaria de saber mais sobre os livros da GrainUp Editora.',
  true,
  'Almirante Tamandaré, PR',
  'Seg–Sex: 8h às 17h',
  '@grainupeditora'
);

-- Páginas legais (conteúdo placeholder)
INSERT INTO legal_pages (type, title, content) VALUES
  ('privacy',  'Política de Privacidade', ''),
  ('terms',    'Termos de Uso',           ''),
  ('returns',  'Política de Trocas e Devoluções', ''),
  ('shipping', 'Política de Entrega',     ''),
  ('cookies',  'Política de Cookies',     '');

-- Fretes manuais iniciais por estado (preços de referência)
INSERT INTO shipping_rates (name, state, price, estimated_days, is_free, is_active) VALUES
  ('PAC — PR',  'PR', 12.90,  5, false, true),
  ('PAC — SP',  'SP', 15.90,  7, false, true),
  ('PAC — RJ',  'RJ', 18.90,  8, false, true),
  ('PAC — MG',  'MG', 17.90,  7, false, true),
  ('PAC — RS',  'RS', 19.90,  8, false, true),
  ('PAC — SC',  'SC', 16.90,  6, false, true),
  ('PAC — GO',  'GO', 22.90, 10, false, true),
  ('PAC — BA',  'BA', 24.90, 12, false, true),
  ('PAC — PE',  'PE', 26.90, 12, false, true),
  ('PAC — CE',  'CE', 27.90, 13, false, true),
  ('PAC — Outros', NULL, 29.90, 14, false, true),
  ('Frete Grátis — Acima de R$200', NULL, 0, 10, true, true);
