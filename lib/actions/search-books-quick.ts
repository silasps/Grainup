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

export async function searchBooksQuick(query: string): Promise<QuickBook[]> {
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  const q = `%${query.trim()}%`;

  const [{ data: byTitle }, { data: byAuthor }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, authors(name)")
      .eq("is_active", true)
      .ilike("title", q)
      .limit(5),

    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, authors!inner(name)")
      .eq("is_active", true)
      .filter("authors.name", "ilike", q)
      .limit(5),
  ]);

  const seen = new Set<string>();
  const results: QuickBook[] = [];

  type Row = { id: string; title: string; slug: string; cover_url: string | null; price: number; price_promotional: number | null; authors: { name: string } | null };
  const all = [...(byTitle ?? []), ...(byAuthor ?? [])] as Row[];

  for (const b of all) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    results.push({
      id: b.id,
      title: b.title,
      slug: b.slug,
      cover_url: b.cover_url,
      price: b.price,
      price_promotional: b.price_promotional,
      author: b.authors?.name ?? null,
    });
  }

  return results.slice(0, 5);
}
