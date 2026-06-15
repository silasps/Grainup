"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Tenant, TenantSettings } from "@/types/ead";

// Retorna o tenant associado ao usuário (via tenant_admins).
// Super admins não têm tenant próprio — precisam selecionar um.
export async function getMyTenant(userId: string): Promise<Tenant | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("tenant_admins")
    .select("tenants(*)")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.tenants as unknown as Tenant) ?? null;
}

export async function getMyTenantWithSettings(
  userId: string
): Promise<{ tenant: Tenant; settings: TenantSettings | null } | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("tenant_admins")
    .select("tenants(*, tenant_settings(*))")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.tenants) return null;
  const row = data.tenants as unknown as Tenant & { tenant_settings: TenantSettings | null };
  return { tenant: row, settings: row.tenant_settings };
}
