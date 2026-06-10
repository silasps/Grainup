"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setPromoPrice(bookId: string, price: number | null) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("books")
    .update({ price_promotional: price })
    .eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/ofertas");
  revalidatePath("/editora/ofertas");
  return { error: null };
}
