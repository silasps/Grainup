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
      .select("id, full_name, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient.from("user_roles").select("user_id, role"),
    adminClient.auth.admin.listUsers({ perPage: 500 }),
    adminClient.from("admin_user_creations").select("user_id, created_by_name"),
  ]);

  const roleMap = new Map(
    (userRolesData ?? []).map((r) => [r.user_id, r.role])
  );

  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const adminCreatedMap = new Map(
    (auditData ?? []).map((a) => [a.user_id, a.created_by_name as string])
  );

  const allUsers: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: (p.full_name as string | null) ?? null,
    email: emailMap.get(p.id) ?? null,
    phone: (p as { phone?: string | null }).phone ?? null,
    created_at: p.created_at as string,
    role: roleMap.get(p.id) ?? null,
    created_by_admin: adminCreatedMap.get(p.id) ?? null,
  }));

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
      <UsersTable users={users} isSuperAdmin={currentRole === "super_admin"} />
    </div>
  );
}
