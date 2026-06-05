"use client";

import React, { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import {
  Search, X, CheckCircle, Ban, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Plus, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CreateAffiliateDialog } from "./create-affiliate-dialog";
import { approveAndCreateLinkAction } from "./actions";

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
  leader_email: string | null;
  serving_location: string | null;
  last_confirmed_at: string | null;
  requires_review?: boolean;
  next_review_at?: string | null;
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

const TYPE_LABEL: Record<string, string> = { jocum: "JOCUM", diretor: "Diretor" };

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function AffiliatosTable({
  affiliates: initial,
  salesByAffiliate,
  stats: initialStats,
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
  const [createOpen, setCreateOpen] = useState(false);

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<Affiliate | null>(null);
  const [requiresReview, setRequiresReview] = useState(false);
  const [approving, setApproving] = useState(false);

  const stats = useMemo(() => ({
    total: affiliates.length,
    ativos: affiliates.filter((a) => a.status === "ativo").length,
    pendentes: affiliates.filter((a) => a.status === "pendente").length,
    suspensos: affiliates.filter((a) => a.status === "suspenso").length,
    balancePending: affiliates.reduce((s, a) => s + a.balance_pending, 0),
  }), [affiliates]);

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

  function openApproveDialog(a: Affiliate) {
    setApproveTarget(a);
    setRequiresReview(a.type === "jocum");
  }

  async function confirmApprove() {
    if (!approveTarget) return;
    setApproving(true);
    const supabase = createClient();
    const now = new Date();
    const next_review_at = requiresReview ? addMonths(now, 6).toISOString() : null;

    const { error } = await supabase
      .from("affiliates")
      .update({
        status: "ativo",
        requires_review: requiresReview,
        next_review_at,
        last_confirmed_at: now.toISOString(),
      })
      .eq("id", approveTarget.id);

    setApproving(false);
    if (error) { toast.error(error.message); return; }

    // Create default affiliate link if none exists
    approveAndCreateLinkAction(approveTarget.id).catch(() => {});

    setAffiliates((prev) =>
      prev.map((a) =>
        a.id === approveTarget.id
          ? { ...a, status: "ativo", requires_review: requiresReview, next_review_at }
          : a
      )
    );
    toast.success("Afiliado aprovado");
    setApproveTarget(null);
    startTransition(() => {});
  }

  async function updateStatus(id: string, status: AffiliateStatus) {
    const supabase = createClient();
    const { error } = await supabase.from("affiliates").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAffiliates((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    toast.success(`Afiliado ${STATUS_LABEL[status].toLowerCase()}`);
    startTransition(() => {});
  }

  async function triggerReview(a: Affiliate) {
    const supabase = createClient();
    const now = new Date();
    const next_review_at = addMonths(now, 6).toISOString();
    const { error } = await supabase
      .from("affiliates")
      .update({ last_confirmed_at: now.toISOString(), next_review_at })
      .eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setAffiliates((prev) =>
      prev.map((af) => af.id === a.id ? { ...af, last_confirmed_at: now.toISOString(), next_review_at } : af)
    );
    // Open mail client to leader
    if (a.leader_email) {
      const subject = encodeURIComponent("Confirmação de vínculo JOCUM — Afiliado Editora Jocum");
      const body = encodeURIComponent(
        `Olá ${a.leader_name ?? "Líder"},\n\n` +
        `${a.name} está cadastrado(a) como afiliado(a) da Editora Jocum e precisa de sua confirmação de que continua servindo em JOCUM.\n\n` +
        `Por favor, responda este e-mail confirmando ou negando o vínculo atual.\n\n` +
        `Obrigado,\nEquipe Editora Jocum`
      );
      window.open(`mailto:${a.leader_email}?subject=${subject}&body=${body}`);
    }
    toast.success("Renovação registrada — próxima em 6 meses");
  }

  return (
    <>
      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aprovar afiliado</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="flex flex-col gap-4 py-1">
              <p className="text-sm text-muted-foreground">
                Aprovando <span className="font-medium text-foreground">{approveTarget.name}</span> como afiliado{" "}
                <span className="font-medium">{TYPE_LABEL[approveTarget.type]}</span>.
              </p>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="mt-0.5 accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Requer avaliação periódica (6 meses)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A cada 6 meses, o líder receberá um e-mail de confirmação de vínculo.
                    Obrigatório para afiliados JOCUM.
                  </p>
                </div>
              </label>
              {requiresReview && (
                <p className="text-xs text-muted-foreground bg-brand-50 border border-brand-100 rounded-lg p-3">
                  Próxima avaliação será em{" "}
                  <span className="font-medium text-brand">
                    {addMonths(new Date(), 6).toLocaleDateString("pt-BR")}
                  </span>.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={confirmApprove}
              disabled={approving}
            >
              {approving ? "Aprovando…" : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <CreateAffiliateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(a) => setAffiliates((prev) => [a as Affiliate, ...prev])}
      />

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

        {/* Filters + Create */}
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

          <Button
            size="sm"
            className="bg-brand hover:bg-brand-700 text-white ml-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar afiliado
          </Button>
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

                    // Review status
                    const reviewDays = a.requires_review && a.next_review_at
                      ? Math.ceil((new Date(a.next_review_at).getTime() - Date.now()) / 86_400_000)
                      : null;
                    const reviewUrgent = reviewDays !== null && reviewDays <= 30;
                    const reviewExpired = reviewDays !== null && reviewDays < 0;

                    return (
                      <React.Fragment key={a.id}>
                        <tr className="hover:bg-secondary/30 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground">{a.name}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                            {reviewExpired && (
                              <span className="text-xs text-red-600 font-medium">⚠ Avaliação vencida</span>
                            )}
                            {!reviewExpired && reviewUrgent && (
                              <span className="text-xs text-orange-600 font-medium">⏰ Renovar em {reviewDays}d</span>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs">{TYPE_LABEL[a.type]}</Badge>
                            {a.requires_review && (
                              <span className="ml-1 text-[10px] text-muted-foreground">· revisão</span>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell text-sm font-medium">
                            {a.commission_rate}%
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
                                    title="Aprovar" onClick={() => openApproveDialog(a)}
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
                                <>
                                  {a.requires_review && (
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7 text-brand hover:bg-brand-50 cursor-pointer"
                                      title="Enviar e-mail ao líder / renovar" onClick={() => triggerReview(a)}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 cursor-pointer"
                                    title="Suspender" onClick={() => updateStatus(a.id, "suspenso")}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </>
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
                          <tr className="bg-secondary/20">
                            <td colSpan={7} className="px-5 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
                                  <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand">
                                    <Mail className="h-3.5 w-3.5" /> {a.email}
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
                                    {a.leader_email && (
                                      <a href={`mailto:${a.leader_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand text-xs">
                                        <Mail className="h-3 w-3" /> {a.leader_email}
                                      </a>
                                    )}
                                  </div>
                                )}
                                {a.requires_review && a.next_review_at && (
                                  <div className="sm:col-span-3 flex flex-col gap-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliação periódica</p>
                                    <p className="text-xs text-muted-foreground">
                                      Última confirmação: {a.last_confirmed_at ? new Date(a.last_confirmed_at).toLocaleDateString("pt-BR") : "—"}
                                      {" · "}
                                      Próxima: <span className={reviewExpired ? "text-red-600 font-medium" : reviewUrgent ? "text-orange-600 font-medium" : "text-foreground"}>
                                        {new Date(a.next_review_at).toLocaleDateString("pt-BR")}
                                        {reviewDays !== null && ` (${reviewDays >= 0 ? `em ${reviewDays} dias` : `${Math.abs(reviewDays)} dias atrás`})`}
                                      </span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
