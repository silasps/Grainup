"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  FileCheck2,
  FileClock,
  FileX2,
  AlertTriangle,
  Download,
  ExternalLink,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { FiscalOrder, FinancialMovement } from "@/app/(admin)/admin/editora/fiscal/page";

const FISCAL_LABEL: Record<string, string> = {
  nao_emitida: "Não emitida",
  aguardando_emissao: "Ag. emissão",
  emitida: "Emitida",
  autorizada: "Autorizada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  erro_emissao: "Erro de emissão",
  pendencia_fiscal: "Pendência fiscal",
};

const FISCAL_COLOR: Record<string, string> = {
  nao_emitida: "text-slate-500 bg-slate-50",
  aguardando_emissao: "text-yellow-600 bg-yellow-50",
  emitida: "text-blue-600 bg-blue-50",
  autorizada: "text-emerald-600 bg-emerald-50",
  rejeitada: "text-red-600 bg-red-50",
  cancelada: "text-orange-600 bg-orange-50",
  erro_emissao: "text-red-600 bg-red-50",
  pendencia_fiscal: "text-amber-600 bg-amber-50",
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function exportCsv(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  orders: FiscalOrder[];
  movements: FinancialMovement[];
}

export function FiscalDashboard({ orders, movements }: Props) {
  return (
    <Tabs defaultValue="notas" className="flex-1 overflow-hidden">
      <div className="border-b border-border bg-white px-4 md:px-6">
        <TabsList variant="line" className="h-10 -mb-px">
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="notas" className="overflow-y-auto h-full">
        <NotasFiscaisTab orders={orders} />
      </TabsContent>

      <TabsContent value="relatorios" className="overflow-y-auto h-full">
        <RelatoriosTab orders={orders} movements={movements} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Notas Fiscais Tab ─────────────────────────────────────────────────────

function NotasFiscaisTab({ orders }: { orders: FiscalOrder[] }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  type SortKey = "date" | "order_number" | "total" | "fiscal_status";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const kpis = useMemo(() => ({
    naoEmitida: orders.filter((o) => o.fiscal_status === "nao_emitida").length,
    aguardando: orders.filter((o) => o.fiscal_status === "aguardando_emissao").length,
    ok: orders.filter((o) => ["emitida", "autorizada"].includes(o.fiscal_status)).length,
    pendencia: orders.filter((o) =>
      ["rejeitada", "erro_emissao", "pendencia_fiscal", "cancelada"].includes(o.fiscal_status)
    ).length,
  }), [orders]);

  const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "180d": 180 };

  const filtered = useMemo(() => {
    const cutoff = filterPeriod !== "all"
      ? new Date(Date.now() - periodDays[filterPeriod] * 86400000)
      : null;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const q = search.toLowerCase();

    return orders
      .filter((o) => {
        if (filterStatus !== "all" && o.fiscal_status !== filterStatus) return false;
        const d = new Date(o.created_at);
        if (cutoff && d < cutoff) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (q && !o.order_number.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q) && !o.customer_email.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let va: number | string, vb: number | string;
        if (sortKey === "date") {
          va = new Date(a.created_at).getTime();
          vb = new Date(b.created_at).getTime();
        } else if (sortKey === "total") {
          va = a.total; vb = b.total;
        } else if (sortKey === "order_number") {
          va = a.order_number; vb = b.order_number;
        } else {
          va = a.fiscal_status; vb = b.fiscal_status;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [orders, filterStatus, filterPeriod, dateFrom, dateTo, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-brand" />
      : <ChevronDown className="h-3 w-3 text-brand" />;
  }

  function handleExportCsv() {
    const headers = ["Pedido", "Cliente", "E-mail", "CPF", "Valor", "Status Fiscal", "Tipo NF", "Número NF", "Data Emissão", "Data Pedido"];
    const rows = filtered.map((o) => {
      const doc = o.fiscal_documents?.[0];
      return [
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.customer_cpf ?? "",
        o.total.toFixed(2).replace(".", ","),
        FISCAL_LABEL[o.fiscal_status] ?? o.fiscal_status,
        doc?.document_type ?? "",
        doc?.document_number ?? "",
        doc?.issued_at ? new Date(doc.issued_at).toLocaleDateString("pt-BR") : "",
        new Date(o.created_at).toLocaleDateString("pt-BR"),
      ];
    });
    exportCsv(`fiscal_${new Date().toISOString().slice(0, 10)}.csv`, rows, headers);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Não emitida", value: kpis.naoEmitida, color: "text-slate-500", bg: "bg-slate-50" },
          { icon: FileClock, label: "Ag. emissão", value: kpis.aguardando, color: "text-yellow-600", bg: "bg-yellow-50" },
          { icon: FileCheck2, label: "Emitida / Autorizada", value: kpis.ok, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: FileX2, label: "Pendência / Erro", value: kpis.pendencia, color: "text-red-600", bg: "bg-red-50" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
            <div className={`${bg} rounded-lg p-2 shrink-0`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Documentos Fiscais</h3>
              <span className="text-xs text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${search ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                placeholder="Buscar pedido ou cliente…"
                className="h-full bg-transparent pl-3 pr-1 focus:outline-none w-44"
              />
              {search && (
                <button onClick={() => setSearch("")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status fiscal */}
            <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${filterStatus !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); }}
                className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os status</option>
                {Object.entries(FISCAL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {filterStatus !== "all" && (
                <button onClick={() => setFilterStatus("all")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Período */}
            <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${filterPeriod !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <select
                value={filterPeriod}
                onChange={(e) => { setFilterPeriod(e.target.value); setDateFrom(""); setDateTo(""); }}
                className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="all">Todo período</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="180d">Últimos 6 meses</option>
              </select>
              {filterPeriod !== "all" && (
                <button onClick={() => setFilterPeriod("all")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <span className="text-border self-center select-none">|</span>

            {/* De */}
            <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${dateFrom ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <span className="pl-2 pr-1 text-muted-foreground whitespace-nowrap">De</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => { setDateFrom(e.target.value); setFilterPeriod("all"); }}
                className="h-full bg-transparent pr-1 focus:outline-none cursor-pointer text-xs"
              />
              {dateFrom && (
                <button onClick={() => setDateFrom("")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Até */}
            <div className={`flex items-center h-8 rounded-md border text-xs text-foreground focus-within:ring-1 focus-within:ring-brand ${dateTo ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <span className="pl-2 pr-1 text-muted-foreground whitespace-nowrap">Até</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => { setDateTo(e.target.value); setFilterPeriod("all"); }}
                className="h-full bg-transparent pr-1 focus:outline-none cursor-pointer text-xs"
              />
              {dateTo && (
                <button onClick={() => setDateTo("")} className="ml-0.5 text-brand hover:text-brand-700 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[calc(100vh-420px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                {([
                  { key: "order_number", label: "Pedido", align: "left" },
                  { key: "date", label: "Data", align: "left" },
                  { key: "total", label: "Valor", align: "right" },
                  { key: "fiscal_status", label: "Status Fiscal", align: "left" },
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
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left bg-white">NF / Chave</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left bg-white">Emitida em</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right bg-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const doc = o.fiscal_documents?.[0];
                  const hasError = ["rejeitada", "erro_emissao", "pendencia_fiscal"].includes(o.fiscal_status);
                  return (
                    <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground text-xs">{o.order_number}</p>
                        <p className="text-muted-foreground text-xs truncate max-w-[140px]">{o.customer_name}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(o.created_at))}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-xs whitespace-nowrap">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${FISCAL_COLOR[o.fiscal_status] ?? "text-muted-foreground bg-secondary"}`}>
                            {FISCAL_LABEL[o.fiscal_status] ?? o.fiscal_status}
                          </span>
                          {hasError && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" aria-label={doc?.error_message ?? "Erro fiscal"} />
                          )}
                        </div>
                        {hasError && doc?.error_message && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-[180px] truncate">{doc.error_message}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {doc?.document_number ? (
                          <span className="font-mono">{doc.document_type ? `${doc.document_type} ` : ""}{doc.document_number}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {doc?.issued_at
                          ? new Intl.DateTimeFormat("pt-BR").format(new Date(doc.issued_at))
                          : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {doc?.document_url && (
                            <a
                              href={doc.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver NF-e (PDF)"
                              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-700 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              PDF
                            </a>
                          )}
                          {doc?.xml_url && (
                            <a
                              href={doc.xml_url}
                              download
                              title="Baixar XML"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              XML
                            </a>
                          )}
                          {!doc?.document_url && !doc?.xml_url && (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ─── Relatórios Tab ───────────────────────────────────────────────────────

function RelatoriosTab({ orders, movements }: { orders: FiscalOrder[]; movements: FinancialMovement[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = useMemo(() => {
    const all = new Set<number>();
    movements.forEach((m) => all.add(new Date(m.paid_at ?? m.created_at).getFullYear()));
    orders.forEach((o) => all.add(new Date(o.created_at).getFullYear()));
    if (!all.has(currentYear)) all.add(currentYear);
    return Array.from(all).sort((a, b) => b - a);
  }, [movements, orders, currentYear]);

  const paid = movements.filter((m) => m.status === "pago");

  const monthlyData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const key = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const monthOrders = orders.filter((o) => o.created_at.startsWith(key));
      const monthMoves = paid.filter((m) => (m.paid_at ?? m.created_at).startsWith(key));
      return {
        month: MONTH_NAMES[i],
        pedidos: monthOrders.length,
        bruto: monthMoves.reduce((s, m) => s + m.gross_amount, 0),
        taxas: monthMoves.reduce((s, m) => s + m.gateway_fee, 0),
        comissoes: monthMoves.reduce((s, m) => s + m.affiliate_commission, 0),
        frete: monthMoves.reduce((s, m) => s + m.shipping, 0),
        liquido: monthMoves.reduce((s, m) => s + m.net_amount, 0),
      };
    }), [selectedYear, orders, paid]);

  const annual = useMemo(() => monthlyData.reduce(
    (acc, m) => ({
      pedidos: acc.pedidos + m.pedidos,
      bruto: acc.bruto + m.bruto,
      taxas: acc.taxas + m.taxas,
      comissoes: acc.comissoes + m.comissoes,
      frete: acc.frete + m.frete,
      liquido: acc.liquido + m.liquido,
    }),
    { pedidos: 0, bruto: 0, taxas: 0, comissoes: 0, frete: 0, liquido: 0 }
  ), [monthlyData]);

  function exportMonthly() {
    const headers = ["Mês", "Pedidos", "Receita Bruta", "Taxas Gateway", "Comissões", "Frete", "Receita Líquida"];
    const rows = monthlyData.map((m) => [
      `${m.month}/${selectedYear}`,
      String(m.pedidos),
      m.bruto.toFixed(2).replace(".", ","),
      m.taxas.toFixed(2).replace(".", ","),
      m.comissoes.toFixed(2).replace(".", ","),
      m.frete.toFixed(2).replace(".", ","),
      m.liquido.toFixed(2).replace(".", ","),
    ]);
    exportCsv(`relatorio_${selectedYear}.csv`, rows, headers);
  }

  function exportPedidos() {
    const headers = ["Pedido", "Cliente", "E-mail", "CPF", "Total", "Status", "Forma Pag.", "Status Fiscal", "Data"];
    const yearOrders = orders.filter((o) => new Date(o.created_at).getFullYear() === selectedYear);
    const rows = yearOrders.map((o) => [
      o.order_number,
      o.customer_name,
      o.customer_email,
      o.customer_cpf ?? "",
      o.total.toFixed(2).replace(".", ","),
      o.status,
      o.payment_method ?? "",
      FISCAL_LABEL[o.fiscal_status] ?? o.fiscal_status,
      new Date(o.created_at).toLocaleDateString("pt-BR"),
    ]);
    exportCsv(`pedidos_${selectedYear}.csv`, rows, headers);
  }

  const dreRows = [
    { label: "(+) Receita Bruta", value: annual.bruto, bold: false, positive: true },
    { label: "(−) Taxas de Gateway", value: -annual.taxas, bold: false, positive: false },
    { label: "(−) Comissões de Afiliados", value: -annual.comissoes, bold: false, positive: false },
    { label: "(=) Resultado Líquido Estimado", value: annual.liquido, bold: true, positive: annual.liquido >= 0 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Ano:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportMonthly}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-brand text-xs text-brand font-medium bg-brand-50 hover:bg-brand hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Relatório mensal CSV
          </button>
          <button
            onClick={exportPedidos}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-brand text-xs text-brand font-medium bg-brand-50 hover:bg-brand hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Pedidos CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Faturamento mensal — {selectedYear}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Mês", "Pedidos", "Rec. Bruta", "Taxas", "Comissões", "Rec. Líquida"].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-muted-foreground bg-white ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyData.map((m) => (
                  <tr key={m.month} className={`hover:bg-secondary/30 transition-colors ${m.bruto === 0 ? "opacity-40" : ""}`}>
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{m.month}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{m.pedidos}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium">{formatCurrency(m.bruto)}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-red-500">{m.taxas > 0 ? `−${formatCurrency(m.taxas)}` : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-red-500">{m.comissoes > 0 ? `−${formatCurrency(m.comissoes)}` : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-brand">{formatCurrency(m.liquido)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30">
                  <td className="px-4 py-3 text-xs font-bold text-foreground">Total {selectedYear}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold">{annual.pedidos}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold">{formatCurrency(annual.bruto)}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold text-red-600">−{formatCurrency(annual.taxas)}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold text-red-600">−{formatCurrency(annual.comissoes)}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold text-brand">{formatCurrency(annual.liquido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* DRE simplificado */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">DRE Simplificado</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedYear} · valores pagos</p>
          </div>
          <div className="p-5 space-y-3">
            {dreRows.map(({ label, value, bold, positive }) => (
              <div key={label} className={`flex justify-between items-center gap-2 ${bold ? "pt-3 border-t border-border" : ""}`}>
                <span className={`text-xs ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
                <span className={`text-xs font-mono whitespace-nowrap ${bold ? "font-bold text-base" : ""} ${positive ? "text-emerald-600" : "text-red-500"}`}>
                  {value >= 0 ? formatCurrency(value) : `−${formatCurrency(Math.abs(value))}`}
                </span>
              </div>
            ))}

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Faturamento acumulado</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(annual.bruto)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {annual.bruto > 0
                  ? `Margem líquida: ${((annual.liquido / annual.bruto) * 100).toFixed(1)}%`
                  : "Sem movimentação no período"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
