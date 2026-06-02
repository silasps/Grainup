"use client";

import { useState } from "react";
import { LeadsTable } from "./leads-table";
import { AnalyticsTab } from "./analytics-tab";
import { CampaignsTab } from "./campaigns-tab";

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

const TABS = [
  { id: "leads", label: "Leads" },
  { id: "analytics", label: "Analytics" },
  { id: "campanhas", label: "Campanhas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LeadsTabs({
  leads,
  origins,
  events,
  campaigns,
}: {
  leads: Lead[];
  origins: string[];
  events: BookEventRow[];
  campaigns: Campaign[];
}) {
  const [tab, setTab] = useState<TabId>("leads");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab bar */}
      <div className="px-4 md:px-6 border-b border-border bg-white">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "leads" && <LeadsTable leads={leads} origins={origins} />}
        {tab === "analytics" && <AnalyticsTab leads={leads} events={events} />}
        {tab === "campanhas" && (
          <CampaignsTab campaigns={campaigns} totalLeads={leads.length} consentLeads={leads.filter((l) => l.marketing_consent).length} />
        )}
      </div>
    </div>
  );
}
