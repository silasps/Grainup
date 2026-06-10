-- Nota Fiscal e rastreio Bling
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_number text,    -- número ou chave de acesso NF-e (44 dígitos)
  ADD COLUMN IF NOT EXISTS invoice_url    text;    -- link para DANFE / PDF (opcional)
