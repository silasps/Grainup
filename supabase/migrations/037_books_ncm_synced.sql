-- Rastreia quais livros já tiveram dados fiscais (NCM/CSOSN) sincronizados com o Bling.
-- Evita re-enviar dados para produtos que já estão corretos.
alter table books add column if not exists bling_ncm_synced boolean default false not null;
