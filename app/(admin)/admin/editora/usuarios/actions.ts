"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";
import {
  canAccessUsersFlow,
  canAssignRoleInUsersFlow,
  canEditRole,
  isKnownRole,
  type UsersAdminRole,
} from "./role-access";

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

type UsersAdminContext =
  | {
      ok: true;
      adminClient: AdminClient;
      currentRole: UsersAdminRole;
      currentUser: User;
    }
  | { ok: false; error: string };

async function getUsersAdminContext(permissionMessage: string): Promise<UsersAdminContext> {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { ok: false, error: "Não autorizado" };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .limit(1)
    .maybeSingle();

  const currentRole = roleData?.role ?? null;
  if (!canAccessUsersFlow(currentRole)) {
    return { ok: false, error: permissionMessage };
  }

  const adminClient = await createAdminClient();
  return { ok: true, adminClient, currentRole, currentUser };
}

async function getUserRole(adminClient: AdminClient, userId: string): Promise<UserRole | null> {
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return data?.role ?? null;
}

function parseRequestedRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  return isKnownRole(role) ? role : null;
}

export async function updateUserRoleAction(profileId: string, role: string | null) {
  const context = await getUsersAdminContext("Sem permissão para editar usuários");
  if (!context.ok) return { error: context.error };

  // Find user_id from profile
  const { data: profile } = await context.adminClient
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Usuário não encontrado" };

  const nextRole = parseRequestedRole(role ?? "cliente");
  if (!nextRole) return { error: "Papel inválido" };

  const targetRole = await getUserRole(context.adminClient, profile.user_id);
  const isSelf = profile.user_id === context.currentUser.id;
  if ((!isSelf && !canEditRole(context.currentRole, targetRole)) || (isSelf && context.currentRole !== "super_admin")) {
    return { error: "Sem permissão para editar esse usuário" };
  }

  if (!canAssignRoleInUsersFlow(context.currentRole, nextRole)) {
    return { error: "Sem permissão para atribuir esse papel" };
  }

  // Remove existing role
  await context.adminClient.from("user_roles").delete().eq("user_id", profile.user_id);

  // Insert new role if not null/cliente
  if (nextRole !== "cliente") {
    const { error } = await context.adminClient
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: nextRole });
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
  const context = await getUsersAdminContext("Sem permissão para criar usuários");
  if (!context.ok) return { error: context.error };

  const requestedRole = parseRequestedRole(data.role);
  if (!requestedRole) return { error: "Papel inválido" };

  if (!canAssignRoleInUsersFlow(context.currentRole, requestedRole)) {
    return { error: "Sem permissão para criar usuário nesse nível" };
  }

  const { data: creatorProfile } = await context.adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", context.currentUser.id)
    .maybeSingle();

  const creatorName = (creatorProfile?.full_name as string | null) ?? context.currentUser.email ?? "Admin";

  const { data: newUser, error: createError } = await context.adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (createError || !newUser.user) {
    return { error: createError?.message ?? "Erro ao criar usuário" };
  }

  const { error: upsertError } = await context.adminClient
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
    await context.adminClient.auth.admin.deleteUser(newUser.user.id);
    return { error: `Erro ao salvar perfil: ${upsertError.message}` };
  }

  if (requestedRole !== "cliente") {
    await context.adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: requestedRole });
  }

  await (context.adminClient.from("admin_user_creations") as ReturnType<typeof context.adminClient.from>).insert({
    user_id: newUser.user.id,
    created_by: context.currentUser.id,
    created_by_name: creatorName,
    created_by_role: context.currentRole,
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
  const context = await getUsersAdminContext("Sem permissão para editar usuários");
  if (!context.ok) return { error: context.error };

  const nextRole = parseRequestedRole(data.role);
  if (!nextRole) return { error: "Papel inválido" };

  const targetRole = await getUserRole(context.adminClient, data.userId);
  const isSelf = data.userId === context.currentUser.id;
  if ((!isSelf && !canEditRole(context.currentRole, targetRole)) || (isSelf && context.currentRole !== "super_admin")) {
    return { error: "Sem permissão para editar esse usuário" };
  }

  if (!canAssignRoleInUsersFlow(context.currentRole, nextRole)) {
    return { error: "Sem permissão para atribuir esse papel" };
  }

  const { data: existingProfile } = await context.adminClient
    .from("profiles")
    .select("id")
    .eq("user_id", data.userId)
    .maybeSingle();

  const profilePayload = { full_name: data.full_name, phone: data.phone ?? null };
  const { error: profileError } = existingProfile
    ? await context.adminClient.from("profiles").update(profilePayload).eq("user_id", data.userId)
    : await context.adminClient.from("profiles").insert({
        id: data.userId,
        user_id: data.userId,
        ...profilePayload,
        cpf: null,
        avatar_url: null,
      });
  if (profileError) return { error: profileError.message };

  await context.adminClient.from("user_roles").delete().eq("user_id", data.userId);
  if (nextRole !== "cliente") {
    const { error } = await context.adminClient
      .from("user_roles")
      .insert({ user_id: data.userId, role: nextRole });
    if (error) return { error: error.message };
  }

  if (data.newPassword) {
    const { error } = await context.adminClient.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}

export async function deleteUserAction(userId: string) {
  const context = await getUsersAdminContext("Sem permissão para excluir usuários");
  if (!context.ok) return { error: context.error };

  if (userId === context.currentUser.id) {
    return { error: "Você não pode excluir o próprio usuário" };
  }

  const targetRole = await getUserRole(context.adminClient, userId);
  if (!canEditRole(context.currentRole, targetRole)) {
    return { error: "Sem permissão para excluir esse usuário" };
  }

  const { error } = await context.adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/usuarios");
  return { error: null };
}
