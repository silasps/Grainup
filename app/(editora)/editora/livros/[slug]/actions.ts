"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function submitReviewAction(input: {
  bookId: string;
  rating: number;
  title: string;
  body: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para avaliar." };

  if (input.rating < 1 || input.rating > 5) return { error: "Nota inválida." };

  // Verifica se já avaliou este livro
  const admin = await createAdminClient();
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("book_id", input.bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Você já avaliou este livro." };

  // Verifica se comprou o livro (opcional — pode remover para permitir qualquer avaliação)
  const { data: orderItem } = await admin
    .from("order_items")
    .select("id, orders!inner(user_id, status)")
    .eq("book_id", input.bookId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("orders.user_id" as any, user.id)
    .maybeSingle();

  if (!orderItem) return { error: "Apenas compradores podem avaliar este livro." };

  const { error } = await admin.from("reviews").insert({
    book_id: input.bookId,
    user_id: user.id,
    order_id: null,
    rating: input.rating,
    title: input.title || null,
    body: input.body || null,
    status: "pendente",
  });

  if (error) return { error: error.message };
  return { error: null };
}
