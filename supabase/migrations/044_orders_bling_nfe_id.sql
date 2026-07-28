-- Guarda o ID da NF-e criada no Bling assim que POST /nfe retorna, antes mesmo da
-- autorização SEFAZ. Sem isso, o botão "reenviar" não conseguia localizar a nota já
-- criada (o vínculo pedido→notaFiscal no Bling propaga com atraso) e acabava gerando
-- uma segunda NF-e via endpoint antigo (gerar-nfe), duplicando o registro no Bling.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bling_nfe_id bigint;
