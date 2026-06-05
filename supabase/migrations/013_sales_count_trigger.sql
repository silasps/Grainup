-- Trigger que incrementa sales_count nos livros quando um pedido é aprovado.
-- Idempotente: só dispara na transição para 'aprovado', nunca duplica.
CREATE OR REPLACE FUNCTION fn_order_approved_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.payment_status = 'aprovado'
     AND (OLD.payment_status IS DISTINCT FROM 'aprovado') THEN
    UPDATE books b
    SET sales_count = b.sales_count + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.book_id = b.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_approved_sales
AFTER UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_order_approved_sales();
