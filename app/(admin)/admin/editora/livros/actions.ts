"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

export async function updateBookStockAction(bookId: string, stock: number) {
  if (stock < 0 || !Number.isInteger(stock)) return { error: "Estoque inválido." };
  const supabase = await createAdminClient();
  const { error } = await supabase.from("books").update({ stock }).eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/livros");
  return { error: null };
}

export async function revalidateBookPages() {
  revalidatePath("/editora/livros", "layout");
  revalidatePath("/editora/combos", "layout");
}
