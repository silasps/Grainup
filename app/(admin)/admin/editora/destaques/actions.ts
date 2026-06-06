"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DestaquesInsert = Database["public"]["Tables"]["destaques"]["Insert"] & {
  video_url?: string | null;
  image_mobile_url?: string | null;
  focal_x?: number;
  focal_y?: number;
};

export async function saveDestaque(data: DestaquesInsert & { id?: string }) {
  const supabase = await createAdminClient();
  const { id, ...fields } = data;

  if (id) {
    const { error } = await supabase.from("destaques").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("destaques").insert(fields);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/editora/destaques");
  revalidatePath("/editora");
  return { error: null };
}

export async function deleteDestaque(id: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("destaques").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/destaques");
  revalidatePath("/editora");
  return { error: null };
}

export async function toggleDestaque(id: string, isActive: boolean) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("destaques").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/destaques");
  revalidatePath("/editora");
  return { error: null };
}
