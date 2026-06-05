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
  const patch: { is_featured?: boolean; is_bestseller?: boolean; is_new?: boolean } = {};
  patch[flag] = value;
  const { error } = await supabase
    .from("books")
    .update(patch)
    .eq("id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/editora/livros/vitrine");
  revalidatePath("/editora");
}

export async function saveVitrineOrder(flag: BookFlag, ids: string[]) {
  const supabase = await createAdminClient();
  const col = positionCol[flag];
  type PosCol = "featured_position" | "bestseller_position" | "new_position";
  const patchPos = (pos: number): { featured_position?: number; bestseller_position?: number; new_position?: number } => ({
    [col as PosCol]: pos,
  });
  await Promise.all(ids.map((id, i) => supabase.from("books").update(patchPos(i + 1)).eq("id", id)));
  revalidatePath("/editora");
}
