import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { LeadsTable } from "./leads-table";

export const metadata: Metadata = { title: "Leads — Admin Editora Jocum" };
export const revalidate = 60;

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  origin: string;
  book_id: string | null;
  marketing_consent: boolean;
  created_at: string;
  books: { title: string } | null;
}

async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, name, email, phone, origin, book_id, marketing_consent, created_at, books(title)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Lead[];
}

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  const withConsent = leads.filter((l) => l.marketing_consent).length;
  const origins = [...new Set(leads.map((l) => l.origin).filter(Boolean))];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Leads"
        subtitle={`${leads.length} leads · ${withConsent} aceitaram marketing`}
      />
      <LeadsTable leads={leads} origins={origins} />
    </div>
  );
}
