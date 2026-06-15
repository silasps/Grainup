import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { getMyTenantWithSettings } from "@/lib/actions/get-my-tenant";
import { TenantSettingsForm } from "@/components/ead/admin/tenant-settings-form";

export const metadata: Metadata = { title: "Configurações EAD" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const result = await getMyTenantWithSettings(user.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Configurações"
        subtitle={result?.tenant.name ?? "Configurações do tenant"}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <TenantSettingsForm
          tenant={result?.tenant ?? null}
          settings={result?.settings ?? null}
        />
      </main>
    </div>
  );
}
