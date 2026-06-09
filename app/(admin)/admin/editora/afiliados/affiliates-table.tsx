"use client";

import React, { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import {
  Search, X, CheckCircle, Ban, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Plus, RefreshCw, Wallet, Clock,
  CheckCircle2, XCircle, ArrowLeft, User, BarChart3, Tag, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CreateAffiliateDialog } from "./create-affiliate-dialog";
import { approveAndCreateLinkAction, updateWithdrawalStatusAction } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────
export type AffiliateStatus = "pendente" | "ativo" | "suspenso" | "rejeitado";
export type AffiliateType   = "geral" | "jocum" | "diretor";

export interface Affiliate {
  id: string; user_id: string; type: AffiliateType; name: string; email: string;
  cpf: string; phone: string; status: AffiliateStatus; commission_rate: number;
  balance: number; balance_pending: number; total_confirmed_sales?: number;
  leader_name: string | null; leader_email: string | null; leader_phone: string | null;
  serving_location: string | null; last_confirmed_at: string | null;
  requires_review?: boolean; next_review_at?: string | null; created_at: string;
}

export interface Withdrawal {
  id: string; affiliate_id: string; amount: number;
  status: "pendente" | "processando" | "pago" | "recusado";
  pix_key: string | null; pix_key_type: string | null;
  notes: string | null; requested_at: string | null; paid_at: string | null; created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<AffiliateStatus, string> = { pendente: "Pendente", ativo: "Ativo", suspenso: "Suspenso", rejeitado: "Rejeitado" };
const STATUS_CLASS: Record<AffiliateStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-700", ativo: "bg-emerald-100 text-emerald-700",
  suspenso: "bg-red-100 text-red-700",       rejeitado: "bg-gray-100 text-gray-500",
};
const TYPE_LABEL: Record<AffiliateType, string> = { geral: "Parceiro Geral", jocum: "JOCUM", diretor: "Diretor" };
const TYPE_CLASS: Record<AffiliateType, string> = {
  geral: "bg-blue-100 text-blue-700", jocum: "bg-brand-100 text-brand", diretor: "bg-purple-100 text-purple-700",
};

const TIERS = [
  { min: 0,   max: 9,   label: "Explorador",      margin: 30, color: "text-gray-500" },
  { min: 10,  max: 24,  label: "Colaborador",      margin: 35, color: "text-blue-600" },
  { min: 25,  max: 49,  label: "Parceiro",         margin: 40, color: "text-emerald-600" },
  { min: 50,  max: 99,  label: "Embaixador",       margin: 45, color: "text-orange-500" },
  { min: 100, max: Infinity, label: "Embaixador Elite", margin: 50, color: "text-brand" },
];

function getTier(sales: number) {
  return TIERS.find((t) => sales >= t.min && sales <= t.max) ?? TIERS[0];
}

function getMargin(aff: Affiliate) {
  if (aff.type !== "geral") return 50;
  return getTier(aff.total_confirmed_sales ?? 0).margin;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date); d.setMonth(d.getMonth() + months); return d;
}

const WD_STATUS: Record<string, { label: string; cls: string }> = {
  pendente:     { label: "Pendente",     cls: "bg-yellow-100 text-yellow-700" },
  processando:  { label: "Processando",  cls: "bg-blue-100 text-blue-700" },
  pago:         { label: "Pago",         cls: "bg-emerald-100 text-emerald-700" },
  recusado:     { label: "Recusado",     cls: "bg-red-100 text-red-700" },
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
function AffiliateDetail({
  affiliate, salesData, withdrawals,
  onBack, onStatusChange, onReviewTrigger,
}: {
  affiliate: Affiliate;
  salesData?: { total: number; confirmed: number };
  withdrawals: Withdrawal[];
  onBack: () => void;
  onStatusChange: (id: string, s: AffiliateStatus) => void;
  onReviewTrigger: (a: Affiliate) => void;
}) {
  const [, startT] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [requiresReview, setRequiresReview] = useState(affiliate.requires_review ?? affiliate.type === "jocum");
  const [approving, setApproving] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [wdNote, setWdNote] = useState<Record<string, string>>({});
  const [processingWd, setProcessingWd] = useState<string | null>(null);

  const myWithdrawals = withdrawals.filter((w) => w.affiliate_id === affiliate.id);
  const margin = getMargin(affiliate);
  const tier = affiliate.type === "geral" ? getTier(affiliate.total_confirmed_sales ?? 0) : null;

  const reviewDays = affiliate.requires_review && affiliate.next_review_at
    ? Math.ceil((new Date(affiliate.next_review_at).getTime() - Date.now()) / 86_400_000) : null;
  const reviewExpired = reviewDays !== null && reviewDays < 0;
  const reviewUrgent  = reviewDays !== null && reviewDays <= 30;

  async function confirmApprove() {
    setApproving(true);
    const supabase = createClient();
    const now = new Date();
    const next_review_at = requiresReview ? addMonths(now, 6).toISOString() : null;
    const { error } = await supabase.from("affiliates").update({
      status: "ativo", requires_review: requiresReview, next_review_at, last_confirmed_at: now.toISOString(),
    }).eq("id", affiliate.id);
    setApproving(false);
    if (error) { toast.error(error.message); return; }
    approveAndCreateLinkAction(affiliate.id).catch(() => {});
    onStatusChange(affiliate.id, "ativo");
    setApproveOpen(false);
    toast.success("Afiliado aprovado ✓");
  }

  async function handleWd(wd: Withdrawal, status: "processando" | "pago" | "recusado") {
    setProcessingWd(wd.id);
    try {
      await updateWithdrawalStatusAction(wd.id, status, wdNote[wd.id]);
      toast.success(status === "pago" ? "Pagamento confirmado" : status === "recusado" ? "Saque recusado" : "Em processamento");
      startT(() => {});
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessingWd(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground text-lg">{affiliate.name}</h2>
            <Badge className={`text-xs ${TYPE_CLASS[affiliate.type]}`}>{TYPE_LABEL[affiliate.type]}</Badge>
            <Badge className={`text-xs ${STATUS_CLASS[affiliate.status]}`}>{STATUS_LABEL[affiliate.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{affiliate.email}</p>
        </div>
        {/* Ações principais */}
        <div className="flex gap-2">
          {affiliate.status === "pendente" && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setApproveOpen(true)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => onStatusChange(affiliate.id, "rejeitado")}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
              </Button>
            </>
          )}
          {affiliate.status === "ativo" && (
            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => onStatusChange(affiliate.id, "suspenso")}>
              <Ban className="h-3.5 w-3.5 mr-1" /> Suspender
            </Button>
          )}
          {affiliate.status === "suspenso" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onStatusChange(affiliate.id, "ativo")}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Reativar
            </Button>
          )}
        </div>
      </div>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Aprovar {affiliate.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <p className="text-sm text-muted-foreground">
              Tipo: <strong>{TYPE_LABEL[affiliate.type]}</strong> ·
              Margem inicial: <strong>{margin}%</strong>
            </p>
            {affiliate.type !== "geral" && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                <input type="checkbox" checked={requiresReview} onChange={(e) => setRequiresReview(e.target.checked)} className="mt-0.5 accent-brand" />
                <div>
                  <p className="text-sm font-medium">Requer avaliação periódica (6 meses)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Obrigatório para JOCUM.</p>
                </div>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmApprove} disabled={approving}>
              {approving ? "Aprovando…" : "Confirmar aprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-3 gap-4">
        {/* KPIs */}
        {[
          { label: "Saldo disponível", value: formatCurrency(affiliate.balance ?? 0), icon: Wallet, color: "text-brand" },
          { label: "Saldo pendente",   value: formatCurrency(affiliate.balance_pending ?? 0), icon: Clock, color: "text-yellow-600" },
          { label: "Vendas confirmadas", value: (affiliate.total_confirmed_sales ?? 0).toString(), icon: BarChart3, color: "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="bg-secondary p-2 rounded-lg"><Icon className={`h-4 w-4 ${color}`} /></div>
            <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-lg font-bold ${color}`}>{value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Informações */}
        <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><User className="h-3.5 w-3.5" /> Dados cadastrais</p>
          <Separator />
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><a href={`mailto:${affiliate.email}`} className="hover:text-brand">{affiliate.email}</a></div>
            {affiliate.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span>{affiliate.phone}</span></div>}
            <div className="text-muted-foreground">CPF: <span className="text-foreground">{affiliate.cpf}</span></div>
            {affiliate.serving_location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span>{affiliate.serving_location}</span></div>}
            <div className="text-muted-foreground">Desde: <span className="text-foreground">{new Date(affiliate.created_at).toLocaleDateString("pt-BR")}</span></div>
          </div>
          {affiliate.leader_name && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Líder</p>
              <div className="text-sm text-muted-foreground">
                <p>{affiliate.leader_name}</p>
                {affiliate.leader_email && <a href={`mailto:${affiliate.leader_email}`} className="flex items-center gap-1 hover:text-brand text-xs mt-0.5"><Mail className="h-3 w-3" />{affiliate.leader_email}</a>}
              </div>
            </>
          )}
        </div>

        {/* Tier / Margem */}
        <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Margem & Tier</p>
          <Separator />
          {affiliate.type === "geral" && tier ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-lg ${tier.color}`}>{tier.label}</span>
                <span className="font-bold text-xl text-brand">{tier.margin}%</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {TIERS.map((t, i) => {
                  const sales = affiliate.total_confirmed_sales ?? 0;
                  const active = sales >= t.min && (t.max === Infinity || sales <= t.max);
                  const past   = sales > t.max;
                  return (
                    <div key={i} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${active ? "bg-brand-50 font-semibold" : past ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                      <span>{t.label}</span>
                      <span>{t.min === 100 ? "100+" : `${t.min}–${t.max}`} vendas → {t.margin}%</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Vendas confirmadas: <strong className="text-foreground">{affiliate.total_confirmed_sales ?? 0}</strong></p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Margem fixa para {TYPE_LABEL[affiliate.type]}:</p>
              <p className="text-3xl font-bold text-brand">50%</p>
              {affiliate.requires_review && affiliate.next_review_at && (
                <div className={`text-xs p-2 rounded-lg ${reviewExpired ? "bg-red-50 text-red-600" : reviewUrgent ? "bg-orange-50 text-orange-600" : "bg-secondary text-muted-foreground"}`}>
                  Avaliação: {reviewExpired ? "⚠ Vencida" : reviewUrgent ? `⏰ em ${reviewDays}d` : `em ${reviewDays}d`}
                  {affiliate.requires_review && (
                    <button onClick={() => onReviewTrigger(affiliate)} className="ml-2 underline">Renovar</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saques */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <CreditCard className="h-3.5 w-3.5" /> Solicitações de saque
        </p>
        <Separator />
        {myWithdrawals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma solicitação de saque.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myWithdrawals.map((wd) => {
              const ws = WD_STATUS[wd.status] ?? WD_STATUS.pendente;
              return (
                <div key={wd.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{formatCurrency(wd.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {wd.pix_key_type && `${wd.pix_key_type}: `}{wd.pix_key ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xs ${ws.cls}`}>{ws.label}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(wd.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  {wd.notes && <p className="text-xs text-muted-foreground italic">{wd.notes}</p>}
                  {wd.status === "pendente" && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-border">
                      <Input
                        value={wdNote[wd.id] ?? ""}
                        onChange={(e) => setWdNote((p) => ({ ...p, [wd.id]: e.target.value }))}
                        placeholder="Observação (opcional)"
                        className="h-7 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white flex-1"
                          disabled={processingWd === wd.id}
                          onClick={() => handleWd(wd, "processando")}>
                          Em processamento
                        </Button>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                          disabled={processingWd === wd.id}
                          onClick={() => handleWd(wd, "pago")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar pagamento
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                          disabled={processingWd === wd.id}
                          onClick={() => handleWd(wd, "recusado")}>
                          Recusar
                        </Button>
                      </div>
                    </div>
                  )}
                  {wd.status === "processando" && (
                    <div className="flex gap-2 pt-1 border-t border-border">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={processingWd === wd.id}
                        onClick={() => handleWd(wd, "pago")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar pagamento
                      </Button>
                    </div>
                  )}
                  {wd.paid_at && <p className="text-xs text-emerald-600">Pago em {new Date(wd.paid_at).toLocaleDateString("pt-BR")}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Table ────────────────────────────────────────────────────────────────
export function AffiliatosTable({
  affiliates: initial, salesByAffiliate, withdrawals: initialWd, stats: initialStats,
}: {
  affiliates: Affiliate[];
  salesByAffiliate: Record<string, { total: number; confirmed: number }>;
  withdrawals: Withdrawal[];
  stats: { total: number; ativos: number; pendentes: number; suspensos: number; balancePending: number; withdrawalsPending: number };
}) {
  const [affiliates, setAffiliates] = useState(initial);
  const [withdrawals] = useState(initialWd);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AffiliateStatus | "all">("all");
  const [filterType, setFilterType] = useState<"all" | AffiliateType>("all");
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [, startT] = useTransition();

  const stats = useMemo(() => ({
    total: affiliates.length,
    ativos: affiliates.filter((a) => a.status === "ativo").length,
    pendentes: affiliates.filter((a) => a.status === "pendente").length,
    suspensos: affiliates.filter((a) => a.status === "suspenso").length,
    balancePending: affiliates.reduce((s, a) => s + (a.balance ?? 0), 0),
    withdrawalsPending: withdrawals.filter((w) => w.status === "pendente").length,
  }), [affiliates, withdrawals]);

  const filtered = useMemo(() => affiliates.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [affiliates, query, filterStatus, filterType]);

  function handleStatusChange(id: string, status: AffiliateStatus) {
    const supabase = createClient();
    supabase.from("affiliates").update({ status }).eq("id", id).then(({ error }) => {
      if (error) { toast.error(error.message); return; }
      setAffiliates((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected((p) => p ? { ...p, status } : null);
      toast.success(`Status: ${STATUS_LABEL[status]}`);
      startT(() => {});
    });
  }

  async function triggerReview(a: Affiliate) {
    const supabase = createClient();
    const now = new Date();
    const next_review_at = addMonths(now, 6).toISOString();
    await supabase.from("affiliates").update({ last_confirmed_at: now.toISOString(), next_review_at }).eq("id", a.id);
    if (a.leader_email) {
      const subject = encodeURIComponent("Confirmação de vínculo JOCUM");
      const body = encodeURIComponent(`Olá ${a.leader_name ?? "Líder"},\n\n${a.name} precisa de confirmação de vínculo JOCUM.\n\nObrigado,\nEditora Jocum`);
      window.open(`mailto:${a.leader_email}?subject=${subject}&body=${body}`);
    }
    toast.success("Renovação registrada — próxima em 6 meses");
  }

  // Se um afiliado está selecionado, mostra o detalhe
  if (selected) {
    const live = affiliates.find((a) => a.id === selected.id) ?? selected;
    return (
      <AffiliateDetail
        affiliate={live}
        salesData={salesByAffiliate[live.id]}
        withdrawals={withdrawals}
        onBack={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onReviewTrigger={triggerReview}
      />
    );
  }

  return (
    <>
      <CreateAffiliateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(a) => setAffiliates((prev) => [a as Affiliate, ...prev])}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total",         value: stats.total },
            { label: "Ativos",        value: stats.ativos,        color: "text-emerald-600" },
            { label: "Pendentes",     value: stats.pendentes,     color: "text-yellow-600" },
            { label: "Suspensos",     value: stats.suspensos,     color: "text-red-600" },
            { label: "Saldo total",   value: formatCurrency(stats.balancePending), color: "text-brand" },
            { label: "Saques pend.",  value: stats.withdrawalsPending, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color ?? "text-foreground"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nome ou e-mail…" className="pl-9 pr-9" />
            {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-1">
            {(["all", "pendente", "ativo", "suspenso", "rejeitado"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${filterStatus === s ? "bg-brand border-brand text-white" : "bg-white border-border text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? "Todos" : STATUS_LABEL[s]}
                {s === "pendente" && stats.pendentes > 0 && <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1 rounded-full">{stats.pendentes}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all", "geral", "jocum", "diretor"] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${filterType === t ? "bg-foreground border-foreground text-white" : "bg-white border-border text-muted-foreground hover:text-foreground"}`}>
                {t === "all" ? "Todos tipos" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <Button size="sm" className="bg-brand hover:bg-brand-700 text-white ml-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar afiliado
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-360px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Afiliado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Margem</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Vendas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Saldo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
                  <th className="px-5 py-3 bg-white" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Nenhum afiliado encontrado.</td></tr>
                ) : filtered.map((a) => {
                  const margin = getMargin(a);
                  const tier = a.type === "geral" ? getTier(a.total_confirmed_sales ?? 0) : null;
                  const pendingWds = withdrawals.filter((w) => w.affiliate_id === a.id && w.status === "pendente").length;
                  return (
                    <tr key={a.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelected(a)}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                        {pendingWds > 0 && <span className="text-xs text-orange-600 font-medium">💰 {pendingWds} saque{pendingWds > 1 ? "s" : ""} pendente{pendingWds > 1 ? "s" : ""}</span>}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <Badge className={`text-xs ${TYPE_CLASS[a.type]}`}>{TYPE_LABEL[a.type]}</Badge>
                        {tier && <p className={`text-[10px] mt-0.5 ${tier.color}`}>{tier.label}</p>}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-sm font-medium">{margin}%</td>
                      <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground text-sm">{a.total_confirmed_sales ?? 0}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <p className="text-sm font-medium">{formatCurrency(a.balance ?? 0)}</p>
                        {(a.balance_pending ?? 0) > 0 && <p className="text-xs text-yellow-600">+{formatCurrency(a.balance_pending)} pend.</p>}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
