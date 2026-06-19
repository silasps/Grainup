-- relevance é uma métrica interna do admin (1=baixa a 5=alta) para precificação em lote.
-- Não é exposta no storefront.
ALTER TABLE books ADD COLUMN relevance SMALLINT CHECK (relevance BETWEEN 1 AND 5);
COMMENT ON COLUMN books.relevance IS 'Visível só ao admin: relevância editorial de 1 (baixa) a 5 (alta), usada para precificação em lote';
