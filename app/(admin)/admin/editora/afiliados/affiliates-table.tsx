"use client";

import { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { Search, X, CheckCircle, Ban, ChevronDown, ChevronUp, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

type AffiliateStatus = "pendente" | "ativo" | "suspenso" | "rejeitado";

interface Affiliate {
  id: string;
  type: "jocum" | "diretor";
  name: string;
  email: string;
  cpf: string;
  phone: string;
  status: AffiliateStatus;
  commission_rate: number;
  balance: number;
  balance_pending: number;
  leader_name: string | null;
  serving_location: string | null;
  last_confirmed_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  ativos: number;
  pendentes: number;
  suspensos: number;
  balancePending: number;
}

const STATUS_LABEL: Record<AffiliateStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  suspenso: "Suspenso",
  rejeitado: "Rejeitado",
};

const STATUS_CLASS: Record<AffiliateStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  ativo: "bg-emerald-100 text-emerald-700",
  suspenso: "bg-red-100 text-red-700",
  rejeitado: "bg-gray-100 text-gray-500",
};

const TYPE_LABEL: Record<string, string> = {
  jocum: "JOCUM",
  diretor: "Diretor",
};

export function AffiliatosTable({
  affiliates: initial,
  salesByAffiliate,
  stats,
}: {
  affiliates: Affiliate[];
  salesByAffiliate: Record<string, { total: number; confirmed: number }>;
  stats: Stats;
}) {
  const [affiliates, setAffiliates] = useState(initial);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AffiliateStatus | "all">("all");
  const [filterType, setFilterType] = useState<"all" | "jocum" | "diretor">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return affiliates.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterType !== "all" && a.type !== filterType) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [affiliates, query, filterStatus, filterType]);

  async function updateStatus(id: string, status: AffiliateStatus) {
    const supabase = createClient();
    const { error } = await supabase.from("affiliates").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAffiliates((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    toast.success(`Afiliado ${STATUS_LABEL[status].toLowerCase()}`);
    startTransition(() => {});
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Ativos", value: stats.ativos, color: "text-emerald-600" },
          { label: "Pendentes", value: stats.pendentes, color: "text-yellow-600" },
          { label: "Suspensos", value: stats.suspensos, color: "text-red-600" },
          { label: "Saldo a pagar", value: formatCurrency(stats.balancePending), color: "text-brand" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color ?? "text-foreground"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {(["all", "pendente", "ativo", "suspenso", "rejeitado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                filterStatus === s
                  ? "bg-brand border-brand text-white"
                  : "bg-white border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_LABEL[s]}
              {s === "pendente" && stats.pendentes > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1 rounded-full">{stats.pendentes}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(["all", "jocum", "diretor"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                filterType === t
                  ? "bg-foreground border-foreground text-white"
                  : "bg-white border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "Todos tipos" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {(query || filterStatus !== "all" || filterType !== "all") && (
          <span className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Afiliado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Comissão</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Vendas</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Saldo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
                <th className="px-5 py-3 bg-white" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    {query || filterStatus !== "all" || filterType !== "all"
                      ? "Nenhum afiliado encontrado."
                      : "Nenhum afiliado ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const salesData = salesByAffiliate[a.id];
                  const isExpanded = expanded === a.id;
                  return (
                    <>
                      <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs">{TYPE_LABEL[a.type]}</Badge>
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell text-sm font-medium">
                          {(a.commission_rate * 100).toFixed(0)}%
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                          {salesData?.total ?? 0}
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell">
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(a.balance)}</p>
                            {a.balance_pending > 0 && (
                              <p className="text-xs text-yellow-600">+{formatCurrency(a.balance_pending)} pendente</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className={`text-xs ${STATUS_CLASS[a.status]}`}>
                            {STATUS_LABEL[a.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 justify-end">
                            {a.status === "pendente" && (
                              <>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  title="Aprovar" onClick={() => updateStatus(a.id, "ativo")}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 cursor-pointer"
                                  title="Rejeitar" onClick={() => updateStatus(a.id, "rejeitado")}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {a.status === "ativo" && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 cursor-pointer"
                                title="Suspender" onClick={() => updateStatus(a.id, "suspenso")}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {a.status === "suspenso" && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                title="Reativar" onClick={() => updateStatus(a.id, "ativo")}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 cursor-pointer"
                              onClick={() => setExpanded(isExpanded ? null : a.id)}
                              title={isExpanded ? "Fechar" : "Ver detalhes"}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${a.id}-detail`} className="bg-secondary/20">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div className="flex flex-col gap-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
                                <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand">
                                  <Mail className="h-3.5 w-3.5" /> {a.email}
                                </a>
                                <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand">
                                  <Phone className="h-3.5 w-3.5" /> {a.phone}
                                </a>
                                <p className="text-xs text-muted-foreground">CPF: {a.cpf}</p>
                              </div>
                              {a.serving_location && (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atuação</p>
                                  <p className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" /> {a.serving_location}
                                  </p>
                                </div>
                              )}
                              {a.leader_name && (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Líder</p>
                                  <p className="text-muted-foreground">{a.leader_name}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
