import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { LeadsTabs } from "./leads-tabs";

export const metadata: Metadata = { title: "Leads — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

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

interface BookEventRow {
  book_id: string;
  event_type: string;
  created_at: string;
  books: { id: string; title: string; slug: string } | null;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  segment: string;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}

async function getData() {
  const supabase = await createClient();

  const [leadsRes, eventsRes, campaignsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, email, phone, origin, book_id, marketing_consent, created_at, books(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("book_events")
      .select("book_id, event_type, created_at, books(id, title, slug)")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("campaigns")
      .select("id, title, subject, body, segment, status, sent_count, sent_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  return {
    leads: (leadsRes.data ?? []) as unknown as Lead[],
    events: (eventsRes.data ?? []) as unknown as BookEventRow[],
    campaigns: (campaignsRes.data ?? []) as Campaign[],
  };
}

export default async function AdminLeadsPage() {
  const { leads, events, campaigns } = await getData();

  const withConsent = leads.filter((l) => l.marketing_consent).length;
  const origins = [...new Set(leads.map((l) => l.origin).filter(Boolean))];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Leads & Analytics"
        subtitle={`${leads.length} leads · ${withConsent} aceitaram marketing`}
      />
      <LeadsTabs
        leads={leads}
        origins={origins}
        events={events}
        campaigns={campaigns}
      />
    </div>
  );
}
