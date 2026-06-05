"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

type BookFlag = "is_featured" | "is_bestseller" | "is_new";

const positionCol = {
  is_featured:    "featured_position",
  is_bestseller:  "bestseller_position",
  is_new:         "new_position",
} as const;

export async function toggleBookFlag(bookId: string, flag: BookFlag, value: boolean) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("books")
    .update({ [flag]: value })
    .eq("id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/editora/livros/vitrine");
  revalidatePath("/editora");
}

export async function saveVitrineOrder(flag: BookFlag, ids: string[]) {
  const supabase = await createAdminClient();
  const col = positionCol[flag];
  await Promise.all(
    ids.map((id, i) => supabase.from("books").update({ [col]: i + 1 }).eq("id", id))
  );
  revalidatePath("/editora");
}
