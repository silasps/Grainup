-- Seed dos 4 combos temáticos que aparecem na página pública /editora/combos
-- Execute após a migration 001_initial_schema.sql

INSERT INTO combos (name, slug, description, price_original, price_promotional, is_active, is_featured)
VALUES
  (
    'Kit Missões Mundiais',
    'kit-missoes-mundiais',
    '3 livros essenciais para quem quer entender e viver a missão de Deus no mundo.',
    135.00,
    105.00,
    true,
    true
  ),
  (
    'Kit Liderança Cristã',
    'kit-lideranca-crista',
    'Uma coleção cuidadosa para desenvolver líderes servidores e íntegros.',
    120.00,
    95.00,
    true,
    false
  ),
  (
    'Kit Família',
    'kit-familia',
    'Livros práticos que fortalecem o casamento, a parentalidade e a família cristã.',
    105.00,
    85.00,
    true,
    false
  ),
  (
    'Kit Vida de Oração',
    'kit-vida-de-oracao',
    'Para quem quer aprofundar sua intimidade com Deus e entender o poder da oração.',
    105.00,
    83.00,
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;
