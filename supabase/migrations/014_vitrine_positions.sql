ALTER TABLE books
  ADD COLUMN IF NOT EXISTS featured_position   INT,
  ADD COLUMN IF NOT EXISTS bestseller_position INT,
  ADD COLUMN IF NOT EXISTS new_position        INT;

CREATE INDEX IF NOT EXISTS idx_books_featured_pos    ON books(featured_position)    WHERE featured_position    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_bestseller_pos  ON books(bestseller_position)  WHERE bestseller_position  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_new_pos         ON books(new_position)         WHERE new_position         IS NOT NULL;
