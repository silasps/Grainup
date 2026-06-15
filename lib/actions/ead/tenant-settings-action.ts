"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMyTenant } from "@/lib/actions/get-my-tenant";

export async function upsertTenantSettingsAction(data: {
  logo_url?: string | null;
  primary_color?: string;
  email_from_name?: string | null;
  bunny_library_id?: string | null;
  bunny_token_key?: string | null;
  bunny_cdn_hostname?: string | null;
  mp_access_token?: string | null;
  mp_public_key?: string | null;
  community_link?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const tenant = await getMyTenant(user.id);
  if (!tenant) return { error: "Tenant não encontrado" };

  const db = await createAdminClient();
  const { error } = await db
    .from("tenant_settings")
    .upsert(
      {
        tenant_id:          tenant.id,
        logo_url:           data.logo_url ?? null,
        primary_color:      data.primary_color ?? "#000000",
        email_from_name:    data.email_from_name ?? null,
        email_from_domain:  null,
        bunny_library_id:   data.bunny_library_id ?? null,
        bunny_token_key:    data.bunny_token_key ?? null,
        bunny_cdn_hostname: data.bunny_cdn_hostname ?? null,
        mp_access_token:    data.mp_access_token ?? null,
        mp_public_key:      data.mp_public_key ?? null,
        community_link:     data.community_link ?? null,
      },
      { onConflict: "tenant_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/admin/ead/configuracoes");
  return { success: true };
}

export async function enrollStudentAction(data: {
  course_id: string;
  user_email: string;
  access_days?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const db = await createAdminClient();

  // Resolve user by email via admin auth API
  const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUser = users.find((u) => u.email?.toLowerCase() === data.user_email.trim().toLowerCase());
  if (!authUser) return { error: "Usuário não encontrado com este e-mail" };

  const course = await db
    .from("ead_courses")
    .select("access_days")
    .eq("id", data.course_id)
    .maybeSingle();

  const accessDays = data.access_days ?? (course.data?.access_days ?? 180);
  const expiresAt = accessDays > 0
    ? new Date(Date.now() + accessDays * 86_400_000).toISOString()
    : new Date(Date.now() + 180 * 86_400_000).toISOString();

  const { error } = await db
    .from("ead_enrollments")
    .upsert(
      {
        user_id:      authUser.id,
        course_id:    data.course_id,
        order_id:     null,
        status:       "ativa",
        expires_at:   expiresAt,
        completed_at: null,
        cancelled_at: null,
        notes:        data.notes ?? null,
      },
      { onConflict: "user_id,course_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/admin/ead/alunos");
  return { success: true };
}
