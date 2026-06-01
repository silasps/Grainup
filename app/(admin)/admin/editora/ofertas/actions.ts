"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export async function saveOffer(data: OfferInsert, id?: string) {
  const supabase = getAdminClient();

  if (id) {
    const { error } = await supabase.from("offers").update(data).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("offers").insert(data);
    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function deleteOffer(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("offers").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function toggleOffer(id: string, isActive: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("offers")
    .update({ is_active: isActive })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function importPromotionalBooks() {
  const supabase = getAdminClient();

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title, price, price_promotional")
    .not("price_promotional", "is", null)
    .eq("is_active", true);

  if (booksError) return { error: booksError.message, imported: 0 };
  if (!books || books.length === 0) return { error: null, imported: 0 };

  const { data: existing } = await supabase
    .from("offers")
    .select("book_id")
    .eq("type", "book")
    .not("book_id", "is", null);

  const existingBookIds = new Set((existing ?? []).map((o) => o.book_id));

  const toInsert = books
    .filter((b) => !existingBookIds.has(b.id))
    .map((b) => ({
      name: `Promoção — ${b.title}`,
      type: "book" as const,
      book_id: b.id,
      combo_id: null,
      category_id: null,
      discount_type: "fixed" as const,
      discount_value: Number((b.price - b.price_promotional!).toFixed(2)),
      min_order_value: null,
      starts_at: null,
      ends_at: null,
      is_active: true,
    }));

  if (toInsert.length === 0) return { error: null, imported: 0 };

  const { error } = await supabase.from("offers").insert(toInsert);
  if (error) return { error: error.message, imported: 0 };

  return { error: null, imported: toInsert.length };
}
