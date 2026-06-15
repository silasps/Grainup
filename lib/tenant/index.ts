import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { Tenant, TenantSettings } from "@/types/ead";

// Resolve um tenant a partir do hostname da requisição.
// Tenta primeiro pelo custom_domain, depois pelo slug (primeiro segmento do hostname).
async function fetchTenantByHostname(hostname: string): Promise<Tenant | null> {
  const supabase = await createAdminClient();
  const host = hostname.split(":")[0]; // remove porta (desenvolvimento)
  const slug = host.split(".")[0];     // ex: "eifol" de "eifol.grainup.com.br"

  const { data } = await supabase
    .from("tenants")
    .select("*")
    .or(`custom_domain.eq.${host},slug.eq.${slug}`)
    .eq("is_active", true)
    .maybeSingle();

  return data ?? null;
}

export const getTenantFromHostname = unstable_cache(
  fetchTenantByHostname,
  ["tenant-by-hostname"],
  { revalidate: 300 } // 5 minutos de cache
);

async function fetchTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data ?? null;
}

export const getTenantSettings = unstable_cache(
  fetchTenantSettings,
  ["tenant-settings"],
  { revalidate: 300 }
);

// Retorna email remetente para o tenant.
// Se não tiver domínio próprio configurado, usa o domínio GrainUp.
export function getTenantEmailFrom(settings: TenantSettings | null, tenantName: string): string {
  const name = settings?.email_from_name ?? tenantName;
  const domain = settings?.email_from_domain ?? "grainup.com.br";
  return `"${name}" <noreply@${domain}>`;
}
