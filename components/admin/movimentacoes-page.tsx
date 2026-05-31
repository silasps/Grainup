"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown, X, ArrowLeft, Receipt, CircleMinus, Wallet, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { ExportMenu } from "@/components/admin/export-menu";

interface Movement {
  id: string;
  gross_amount: number;
  discount: number;
  shipping: number;
  gateway_fee: number;
  affiliate_commission: number;
  net_amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface Props {
  movements: Movement[];
}

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
  estornado: "Estornado",
  aguardando_pagamento: "Aguardando",
};

const STATUS_COLOR: Record<string, string> = {
  pago: "text-emerald-600 bg-emerald-50",
  pendente: "text-yellow-600 bg-yellow-50",
  cancelado: "text-red-600 bg-red-50",
  estornado: "text-orange-600 bg-orange-50",
  aguardando_pagamento: "text-blue-600 bg-blue-50",
};

const PAY_LABEL: Record<string, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  boleto: "Boleto",
};

export function MovimentacoesPage({ movements }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  type SortKey = "date" | "gross_amount" | "gateway_fee" | "net_amount" | "payment_method";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function handlePeriodChange(val: string) {
    setFilterPeriod(val);
    if (val !== "all") { setDateFrom(""); setDateTo(""); }
  }

  function handleDateChange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    if (from || to) setFilterPeriod("all");
  }

  const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "180d": 180 };

  const filtered = useMemo(() => {
    const cutoff = filterPeriod !== "all"
      ? new Date(Date.now() - periodDays[filterPeriod] * 86400000)
      : null;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

    return movements
      .filter((m) => {
        if (filterPayment !== "all" && m.payment_method !== filterPayment) return false;
        if (filterStatus !== "all" && m.status !== filterStatus) return false;
        const d = new Date(m.paid_at ?? m.created_at);
        if (cutoff && d < cutoff) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => {
        let va: number | string, vb: number | string;
        if (sortKey === "date") {
          va = new Date(a.paid_at ?? a.created_at).getTime();
          vb = new Date(b.paid_at ?? b.created_at).getTime();
        } else if (sortKey === "payment_method") {
          va = a.payment_method ?? "";
          vb = b.payment_method ?? "";
        } else {
          va = a[sortKey] as number;
          vb = b[sortKey] as number;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [movements, filterPayment, filterStatus, filterPeriod, dateFrom, dateTo, sortKey, sortDir]);

  const filteredTotals = useMemo(() => {
    const paid = filtered.filter((m) => m.status === "pago");
    return {
      gross: paid.reduce((s, m) => s + m.gross_amount, 0),
      net: paid.reduce((s, m) => s + m.net_amount, 0),
      fees: paid.reduce((s, m) => s + m.gateway_fee, 0),
    };
  }, [filtered]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-brand" />
      : <ChevronDown className="h-3 w-3 text-brand" />;
  }

  const paymentMethods = [...new Set(movements.map((m) => m.payment_method).filter(Boolean))];
  const statuses = [...new Set(movements.map((m) => m.status).filter(Boolean))];

  function buildFilterLabel() {
    const parts: string[] = [];
    if (filterPeriod !== "all") {
      const labels: Record<string, string> = { "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", "90d": "Últimos 90 dias", "180d": "Últimos 6 meses" };
      parts.push(labels[filterPeriod] ?? filterPeriod);
    }
    if (dateFrom || dateTo) {
      parts.push(`${dateFrom ? new Intl.DateTimeFormat("pt-BR").format(new Date(dateFrom)) : "início"} até ${dateTo ? new Intl.DateTimeFormat("pt-BR").format(new Date(dateTo)) : "hoje"}`);
    }
    if (filterPayment !== "all") parts.push(PAY_LABEL[filterPayment] ?? filterPayment);
    if (filterStatus !== "all") parts.push(STATUS_LABEL[filterStatus] ?? filterStatus);
    return parts.length > 0 ? parts.join(", ") : "Sem filtros (todos os registros)";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => startTransition(() => router.back())}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
          >
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ArrowLeft className="h-4 w-4" />
            }
            Voltar ao Financeiro
          </button>
          <span className="text-border select-none">|</span>
          <h1 className="text-sm font-semibold text-foreground">Movimentações</h1>
        </div>
        <ExportMenu movements={filtered} filterLabel={buildFilterLabel()} mode="movements" />
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-white flex-shrink-0 overflow-x-auto">
        {/* Registros */}
        <div className="flex-shrink-0 text-center">
          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Registros</p>
          <p className="text-sm font-semibold text-foreground leading-none">{filtered.length}</p>
        </div>

        <span className="text-border select-none flex-shrink-0">→</span>

        {/* Cobrado dos clientes */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
            <Receipt className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-blue-600/80 leading-none mb-0.5">Cobrado dos clientes</p>
            <p className="text-sm font-semibold text-blue-700 leading-none">{formatCurrency(filteredTotals.gross)}</p>
          </div>
        </div>

        {/* Taxas deduzidas */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100">
            <CircleMinus className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] text-orange-600/80 leading-none mb-0.5">Taxas deduzidas</p>
            <p className="text-sm font-semibold text-orange-600 leading-none">− {formatCurrency(filteredTotals.fees)}</p>
          </div>
        </div>

        <span className="text-border select-none flex-shrink-0">=</span>

        {/* Recebido no caixa */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100">
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-700/80 leading-none mb-0.5">Recebido no caixa</p>
            <p className="text-sm font-bold text-emerald-700 leading-none">{formatCurrency(filteredTotals.net)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border bg-white flex flex-wrap gap-2 flex-shrink-0">
        {/* Período rápido */}
        <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${filterPeriod !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
          <select
            value={filterPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer"
          >
            <option value="all">Todo período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="180d">Últimos 6 meses</option>
          </select>
          {filterPeriod !== "all" && (
            <button onClick={() => setFilterPeriod("all")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0" aria-label="Remover filtro de período">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="text-border self-center select-none">|</span>

        <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${dateFrom ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
          <span className="pl-2 pr-1 text-muted-foreground whitespace-nowrap">De</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="h-full bg-transparent pr-1 focus:outline-none cursor-pointer text-xs"
          />
          {dateFrom && (
            <button onClick={() => handleDateChange("", dateTo)} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0" aria-label="Remover data inicial">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${dateTo ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
          <span className="pl-2 pr-1 text-muted-foreground whitespace-nowrap">Até</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="h-full bg-transparent pr-1 focus:outline-none cursor-pointer text-xs"
          />
          {dateTo && (
            <button onClick={() => handleDateChange(dateFrom, "")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0" aria-label="Remover data final">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${filterPayment !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer"
          >
            <option value="all">Forma de pag.</option>
            {paymentMethods.map((p) => (
              <option key={p} value={p}>{PAY_LABEL[p] ?? p}</option>
            ))}
          </select>
          {filterPayment !== "all" && (
            <button onClick={() => setFilterPayment("all")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0" aria-label="Remover filtro de pagamento">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${filterStatus !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer"
          >
            <option value="all">Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
          {filterStatus !== "all" && (
            <button onClick={() => setFilterStatus("all")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0" aria-label="Remover filtro de status">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border shadow-sm">
              {([
                { key: "date", label: "Data", align: "left" },
                { key: "payment_method", label: "Pagamento", align: "left" },
                { key: "gross_amount", label: "Bruto", align: "right" },
                { key: "gateway_fee", label: "Taxa", align: "right" },
                { key: "net_amount", label: "Líquido", align: "right" },
              ] as { key: SortKey; label: string; align: string }[]).map(({ key, label, align }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-5 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors text-${align} bg-white`}
                >
                  <span className="inline-flex items-center gap-1">
                    {align === "right" && <SortIcon col={key} />}
                    {label}
                    {align === "left" && <SortIcon col={key} />}
                  </span>
                </th>
              ))}
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left bg-white">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(m.paid_at ?? m.created_at))}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground whitespace-nowrap">
                    {PAY_LABEL[m.payment_method] ?? m.payment_method?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                    {formatCurrency(m.gross_amount)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {formatCurrency(m.gateway_fee)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-brand whitespace-nowrap">
                    {formatCurrency(m.net_amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[m.status] ?? "text-muted-foreground bg-secondary"}`}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
