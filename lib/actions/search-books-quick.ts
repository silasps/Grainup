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

  const { data } = await supabase.rpc("search_books_quick", {
    query: query.trim(),
  });

  return (data ?? []) as QuickBook[];
}
