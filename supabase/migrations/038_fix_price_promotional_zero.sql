-- price_promotional = 0 é inválido — significa "sem promoção" e deve ser NULL.
-- Um preço promocional zero causava o produto aparecer com R$ 0,00 publicamente.
update books set price_promotional = null where price_promotional = 0;
