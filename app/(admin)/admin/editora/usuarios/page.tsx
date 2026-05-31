import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { UsersTable, type UserRow } from "./users-table";

export const metadata: Metadata = { title: "Usuários — Admin Editora Jocum" };
export const revalidate = 0;

const BLOCKED_ROLES_FOR_EDITORA = new Set(["admin_ead", "admin_eifol", "super_admin"]);

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentRole = roleData?.role;
  if (currentRole !== "super_admin" && currentRole !== "admin_editora") {
    redirect("/admin/editora");
  }

  const adminClient = await createAdminClient();

  const [{ data: profiles }, { data: userRolesData }, { data: authData }, { data: auditData }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, user_id, full_name, phone, created_at")
      .limit(500),
    adminClient.from("user_roles").select("user_id, role"),
    adminClient.auth.admin.listUsers({ perPage: 500 }),
    adminClient.from("admin_user_creations").select("user_id, created_by_name"),
  ]);

  const roleMap = new Map(
    (userRolesData ?? []).map((r) => [r.user_id, r.role])
  );

  // profile keyed by user_id (or id as fallback for legacy rows)
  const profileMap = new Map(
    (profiles ?? []).map((p) => [(p.user_id as string | null) ?? p.id, p])
  );

  const adminCreatedMap = new Map(
    ((auditData ?? []) as { user_id: string; created_by_name: string }[]).map((a) => [a.user_id, a.created_by_name])
  );

  // Auth users are the source of truth — everyone appears, with or without a profile
  const allUsers: UserRow[] = (authData?.users ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((authUser) => {
      const p = profileMap.get(authUser.id);
      return {
        id: p?.id ?? authUser.id,
        user_id: authUser.id,
        full_name: (p?.full_name as string | null) ?? (authUser.user_metadata?.full_name as string | null) ?? null,
        email: authUser.email ?? null,
        phone: (p as { phone?: string | null } | undefined)?.phone ?? null,
        created_at: authUser.created_at,
        role: roleMap.get(authUser.id) ?? null,
        created_by_admin: adminCreatedMap.get(authUser.id) ?? null,
      };
    });

  const users =
    currentRole === "super_admin"
      ? allUsers
      : allUsers.filter((u) => !u.role || !BLOCKED_ROLES_FOR_EDITORA.has(u.role));

  const subtitle =
    currentRole === "super_admin"
      ? `${users.length} usuário${users.length !== 1 ? "s" : ""} em todas as áreas`
      : `${users.length} usuário${users.length !== 1 ? "s" : ""} da editora`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Usuários" subtitle={subtitle} />
      <UsersTable users={users} isSuperAdmin={currentRole === "super_admin"} currentUserId={user.id} currentUserRole={currentRole ?? null} />
    </div>
  );
}
