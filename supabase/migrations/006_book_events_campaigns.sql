-- Garante unicidade de email em leads para upsert funcionar
ALTER TABLE leads ADD CONSTRAINT leads_email_unique UNIQUE (email);

-- Book funnel events (anonymous + logged users)
CREATE TABLE book_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('view', 'add_to_cart', 'purchase')),
  session_id  TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_book_events_book_id ON book_events(book_id);
CREATE INDEX idx_book_events_type_date ON book_events(event_type, created_at);
CREATE INDEX idx_book_events_created_at ON book_events(created_at);

ALTER TABLE book_events ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode inserir eventos (rastreamento anônimo)
CREATE POLICY "anyone insert events" ON book_events
  FOR INSERT WITH CHECK (true);

-- Apenas admins leem
CREATE POLICY "admins read events" ON book_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Email campaigns
CREATE TYPE campaign_status AS ENUM ('draft', 'sending', 'sent', 'failed');

CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  segment     TEXT NOT NULL DEFAULT 'all',
  status      campaign_status NOT NULL DEFAULT 'draft',
  sent_count  INTEGER NOT NULL DEFAULT 0,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
