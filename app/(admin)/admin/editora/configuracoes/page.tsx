import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { ConfigDashboard } from "@/components/admin/config-dashboard";

export const metadata: Metadata = { title: "Configurações — Admin Editora Jocum" };
export const revalidate = 0;

async function getConfigData() {
  const supabase = await createAdminClient();
  const [{ data: contact }, { data: legalPages }] = await Promise.all([
    supabase.from("contact_settings").select("*").limit(1).maybeSingle(),
    supabase.from("legal_pages").select("*").order("type"),
  ]);
  return { contact, legalPages: legalPages ?? [] };
}

export default async function AdminConfigPage() {
  const { contact, legalPages } = await getConfigData();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Configurações" subtitle="Contato e páginas legais" />
      <ConfigDashboard contact={contact} legalPages={legalPages} />
    </div>
  );
}
