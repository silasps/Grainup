-- RLS para tabelas de FAQ (foram criadas sem políticas)
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs           ENABLE ROW LEVEL SECURITY;

-- Leitura pública (categorias sempre; FAQs apenas as ativas)
CREATE POLICY "faq_categories_public_read" ON faq_categories
  FOR SELECT USING (true);

CREATE POLICY "faqs_public_read" ON faqs
  FOR SELECT USING (is_active = true);

-- Admin: acesso total
CREATE POLICY "faq_categories_admin_all" ON faq_categories
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));

CREATE POLICY "faqs_admin_all" ON faqs
  FOR ALL USING (has_role('super_admin') OR has_role('admin_editora'));
