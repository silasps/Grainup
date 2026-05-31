"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
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

export async function createUserAction(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
}) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Não autorizado" };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  const currentRole = roleData?.role;
  if (currentRole !== "super_admin" && currentRole !== "admin_editora") {
    return { error: "Sem permissão para criar usuários" };
  }

  const adminClient = await createAdminClient();

  const { data: creatorProfile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", currentUser.id)
    .maybeSingle();

  const creatorName = (creatorProfile?.full_name as string | null) ?? currentUser.email ?? "Admin";

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (createError || !newUser.user) {
    return { error: createError?.message ?? "Erro ao criar usuário" };
  }

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: newUser.user.id,
        user_id: newUser.user.id,
        full_name: data.full_name,
        phone: data.phone ?? null,
        cpf: null,
        avatar_url: null,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    // Revert auth user creation to avoid orphaned auth records
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return { error: `Erro ao salvar perfil: ${upsertError.message}` };
  }

  if (data.role && data.role !== "cliente") {
    await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: data.role as never });
  }

  await (adminClient.from("admin_user_creations") as ReturnType<typeof adminClient.from>).insert({
    user_id: newUser.user.id,
    created_by: currentUser.id,
    created_by_name: creatorName,
    created_by_role: currentRole,
  } as never);

  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}

export async function updateUserAction(data: {
  userId: string;
  full_name: string;
  phone?: string;
  role: string;
  newPassword?: string;
}) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Não autorizado" };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  const currentRole = roleData?.role;
  if (currentRole !== "super_admin" && currentRole !== "admin_editora") {
    return { error: "Sem permissão para editar usuários" };
  }

  const adminClient = await createAdminClient();

  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_id", data.userId)
    .maybeSingle();

  const profilePayload = { full_name: data.full_name, phone: data.phone ?? null };
  const { error: profileError } = existingProfile
    ? await adminClient.from("profiles").update(profilePayload).eq("user_id", data.userId)
    : await adminClient.from("profiles").insert({
        id: data.userId,
        user_id: data.userId,
        ...profilePayload,
        cpf: null,
        avatar_url: null,
      });
  if (profileError) return { error: profileError.message };

  await adminClient.from("user_roles").delete().eq("user_id", data.userId);
  if (data.role && data.role !== "cliente") {
    const { error } = await adminClient
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as never });
    if (error) return { error: error.message };
  }

  if (data.newPassword) {
    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}

export async function deleteUserAction(userId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}
