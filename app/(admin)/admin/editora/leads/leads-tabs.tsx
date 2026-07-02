"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { LeadsTable } from "./leads-table";
import { AnalyticsTab } from "./analytics-tab";
import { AnalyticsTabLegacy } from "./analytics-tab-legacy";
import { CampaignsTab } from "./campaigns-tab";
import { UxGate } from "@/components/admin/ux-gate";
import type { UxUpgradeInfo } from "@/lib/actions/ux-upgrades";

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
  books: { id: string; title: string; slug: string; cover_url: string | null } | null;
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
  uxInfo,
}: {
  leads: Lead[];
  origins: string[];
  events: BookEventRow[];
  campaigns: Campaign[];
  uxInfo: UxUpgradeInfo | null;
}) {
  const [tab, setTab] = useState<TabId>("leads");
  // Vive aqui (não dentro do UxGate) pra sobreviver à troca de aba — o
  // conteúdo da aba "analytics" desmonta quando você sai dela, então um
  // estado local ali seria perdido e o aviso reapareceria sozinho, sem
  // querer, ao voltar. Fechar de propósito precisa ficar fechado até a
  // pessoa clicar no badge de volta.
  const [uxBannerDismissed, setUxBannerDismissed] = useState(false);

  const showUxBadge =
    !!uxInfo &&
    !uxInfo.superAdminPreview &&
    (uxInfo.status === "none" || uxInfo.status === "expired") &&
    uxBannerDismissed;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="px-4 md:px-6 border-b border-border bg-white flex items-center justify-between">
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
        {showUxBadge && (
          <button
            onClick={() => {
              setUxBannerDismissed(false);
              setTab("analytics");
            }}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-brand-50 border border-brand-200 text-brand text-xs font-medium hover:bg-brand-100 transition-colors flex-shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Atualização disponível
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {tab === "leads" && <LeadsTable leads={leads} origins={origins} />}
        {tab === "analytics" && (
          <UxGate
            info={uxInfo}
            newVersion={<AnalyticsTab leads={leads} events={events} />}
            oldVersion={<AnalyticsTabLegacy leads={leads} events={events} />}
            dismissed={uxBannerDismissed}
            onDismiss={() => setUxBannerDismissed(true)}
          />
        )}
        {tab === "campanhas" && (
          <CampaignsTab campaigns={campaigns} totalLeads={leads.length} consentLeads={leads.filter((l) => l.marketing_consent).length} />
        )}
      </div>
    </div>
  );
}
