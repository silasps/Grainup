"use server";

import { createClient } from "@/lib/supabase/server";

export type QuickBook = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  author: string | null;
};

const BOOK_COLS = "id, title, slug, cover_url, price, price_promotional, author_id";

type BookRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  author_id: string | null;
};

export async function searchBooksQuick(query: string): Promise<QuickBook[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [{ data: byTitle }, { data: matchingAuthors }] = await Promise.all([
    supabase
      .from("books")
      .select(BOOK_COLS)
      .eq("is_active", true)
      .ilike("title", pattern)
      .order("sales_count", { ascending: false })
      .limit(8),

    supabase
      .from("authors")
      .select("id, name")
      .ilike("name", pattern),
  ]);

  let byAuthor: BookRow[] = [];
  if (matchingAuthors?.length) {
    const ids = matchingAuthors.map((a) => a.id);
    const { data } = await supabase
      .from("books")
      .select(BOOK_COLS)
      .eq("is_active", true)
      .in("author_id", ids)
      .order("sales_count", { ascending: false })
      .limit(8);
    byAuthor = (data ?? []) as BookRow[];
  }

  // Merge and deduplicate (title matches first)
  const seen = new Set<string>();
  const merged: BookRow[] = [];
  for (const row of [...((byTitle ?? []) as BookRow[]), ...byAuthor]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
    if (merged.length >= 6) break;
  }

  // Build author name map from already-fetched authors
  const authorMap = new Map((matchingAuthors ?? []).map((a) => [a.id, a.name]));

  // Fetch names for authors not in the map (books matched by title)
  const missingIds = merged
    .map((b) => b.author_id)
    .filter((id): id is string => !!id && !authorMap.has(id));

  if (missingIds.length) {
    const { data: extra } = await supabase
      .from("authors")
      .select("id, name")
      .in("id", missingIds);
    for (const a of extra ?? []) authorMap.set(a.id, a.name);
  }

  return merged.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    cover_url: row.cover_url,
    price: row.price,
    price_promotional: row.price_promotional,
    author: row.author_id ? (authorMap.get(row.author_id) ?? null) : null,
  }));
}
