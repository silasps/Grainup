-- Função para incrementar sales_count de um livro de forma atômica
CREATE OR REPLACE FUNCTION increment_sales_count(book_id UUID, amount INT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE books
  SET sales_count = sales_count + amount
  WHERE id = book_id;
$$;
