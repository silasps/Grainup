-- =============================================
-- 034 — Linkar order_items a cursos EAD
-- =============================================

ALTER TABLE order_items
  ADD COLUMN ead_course_id UUID REFERENCES ead_courses(id) ON DELETE SET NULL;

CREATE INDEX idx_order_items_ead_course ON order_items(ead_course_id)
  WHERE ead_course_id IS NOT NULL;
