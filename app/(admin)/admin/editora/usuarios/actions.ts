"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUserRoleAction(profileId: string, role: string | null) {
  const supabase = await createAdminClient();

  // Find user_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Usuário não encontrado" };

  // Remove existing role
  await supabase.from("user_roles").delete().eq("user_id", profile.user_id);

  // Insert new role if not null/cliente
  if (role && role !== "cliente") {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: role as never });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}

export async function deleteUserAction(profileId: string) {
  const supabase = await createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Usuário não encontrado" };

  const { error } = await supabase.auth.admin.deleteUser(profile.user_id);
  if (error) return { error: error.message };

  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}
