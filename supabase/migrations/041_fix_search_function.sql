-- Drops the old RPC that depended on unaccent (which may not be available)
-- The quick search is now handled client-side via direct Supabase queries,
-- but keep a simpler version here for any future direct use.

drop function if exists search_books_quick(text);

create or replace function search_books_quick(query text)
returns table (
  id                uuid,
  title             text,
  slug              text,
  cover_url         text,
  price             numeric,
  price_promotional numeric,
  author            text
)
language sql
stable
as $$
  select
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
      b.title ilike '%' || query || '%'
      or a.name ilike '%' || query || '%'
    )
  order by b.sales_count desc nulls last
  limit 6;
$$;
