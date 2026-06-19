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

const COLS = "id, title, slug, cover_url, price, price_promotional, authors(name)";

type BookRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  authors: { name: string } | null;
};

function toQuickBook(row: BookRow): QuickBook {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    cover_url: row.cover_url,
    price: row.price,
    price_promotional: row.price_promotional,
    author: row.authors?.name ?? null,
  };
}

export async function searchBooksQuick(query: string): Promise<QuickBook[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const pattern = `%${q}%`;

  // Run title search and author lookup in parallel
  const [{ data: byTitle }, { data: matchingAuthors }] = await Promise.all([
    supabase
      .from("books")
      .select(COLS)
      .eq("is_active", true)
      .ilike("title", pattern)
      .order("sales_count", { ascending: false })
      .limit(8),

    supabase
      .from("authors")
      .select("id")
      .ilike("name", pattern),
  ]);

  // Fetch books by matching authors (separate query avoids RPC dependency)
  let byAuthor: BookRow[] = [];
  if (matchingAuthors?.length) {
    const ids = matchingAuthors.map((a) => a.id);
    const { data } = await supabase
      .from("books")
      .select(COLS)
      .eq("is_active", true)
      .in("author_id", ids)
      .order("sales_count", { ascending: false })
      .limit(8);
    byAuthor = (data ?? []) as BookRow[];
  }

  // Merge: title matches first, then author-only matches, deduplicated
  const seen = new Set<string>();
  const results: QuickBook[] = [];

  for (const row of [...((byTitle ?? []) as BookRow[]), ...byAuthor]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    results.push(toQuickBook(row));
    if (results.length >= 6) break;
  }

  return results;
}
