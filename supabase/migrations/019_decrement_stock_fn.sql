-- Decrementa estoque de um livro de forma atômica, mínimo 0
CREATE OR REPLACE FUNCTION decrement_book_stock(p_book_id uuid, p_qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.books
  SET stock = GREATEST(0, stock - p_qty)
  WHERE id = p_book_id;
$$;
