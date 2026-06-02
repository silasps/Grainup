-- Adds periodic review fields for JOCUM affiliates (6-month cycle)
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz;
