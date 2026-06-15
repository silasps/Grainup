-- Habilita a extensão unaccent para busca sem acentos
create extension if not exists unaccent;

-- Função de busca de livros com normalização de acentos e case
create or replace function search_books_quick(query text)
returns table (
  id        uuid,
  title     text,
  slug      text,
  cover_url text,
  price     numeric,
  price_promotional numeric,
  author    text
)
language sql
stable
as $$
  select distinct on (b.id)
    b.id,
    b.title,
    b.slug,
    b.cover_url,
    b.price,
    b.price_promotional,
    a.name as author
  from books b
  left join authors a on a.id = b.author_id
  where b.is_active = true
    and (
      unaccent(lower(b.title))  ilike '%' || unaccent(lower(query)) || '%'
      or unaccent(lower(a.name)) ilike '%' || unaccent(lower(query)) || '%'
    )
  limit 5;
$$;
