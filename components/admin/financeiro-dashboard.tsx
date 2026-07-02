"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChevronUp, ChevronDown, ChevronsUpDown, X, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { ExportMenu } from "@/components/admin/export-menu";
import { FinanceiroBackfillButton } from "@/components/admin/financeiro-backfill-button";

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

const PAY_COLORS: Record<string, string> = {
  pix: "#10b981",
  credito: "#3b82f6",
  debito: "#8b5cf6",
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function FinanceiroDashboard({ movements }: Props) {
  const router = useRouter();
  const paid = movements.filter((m) => m.status === "pago");

  const totals = {
    gross: paid.reduce((s, m) => s + m.gross_amount, 0),
    net: paid.reduce((s, m) => s + m.net_amount, 0),
    fees: paid.reduce((s, m) => s + m.gateway_fee, 0),
    shipping: paid.reduce((s, m) => s + m.shipping, 0),
    commissions: paid.reduce((s, m) => s + m.affiliate_commission, 0),
  };

  // Monthly breakdown for last 6 months
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthMoves = paid.filter((m) => {
      const mDate = m.paid_at || m.created_at;
      return mDate.startsWith(key);
    });
    return {
      name: MONTH_NAMES[d.getMonth()],
      receita: Math.round(monthMoves.reduce((s, m) => s + m.net_amount, 0)),
      bruto: Math.round(monthMoves.reduce((s, m) => s + m.gross_amount, 0)),
    };
  });

  // Payment method breakdown
  const payBreakdown = ["pix", "credito", "debito"].map((method) => {
    const total = paid
      .filter((m) => m.payment_method === method)
      .reduce((s, m) => s + m.net_amount, 0);
    return { name: method.toUpperCase(), value: Math.round(total) };
  });

  const STATUS_LABEL: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    cancelado: "Cancelado",
    estornado: "Estornado",
  };
  const STATUS_COLOR: Record<string, string> = {
    pago: "text-emerald-600 bg-emerald-50",
    pendente: "text-yellow-600 bg-yellow-50",
    cancelado: "text-red-600 bg-red-50",
    estornado: "text-orange-600 bg-orange-50",
  };

  const PAY_LABEL: Record<string, string> = {
    pix: "Pix",
    credito: "Crédito",
    debito: "Débito",
    boleto: "Boleto",
  };

  // Granularidade do gráfico de receita (drill-down estilo Power BI)
  type ChartGranularity = "day" | "week" | "month" | "year";
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>("month");

  const GRANULARITY_LABEL: Record<ChartGranularity, string> = {
    day: "Dia", week: "Semana", month: "Mês", year: "Ano",
  };
  const GRANULARITY_BUCKETS: Record<ChartGranularity, number> = {
    day: 30, week: 12, month: 6, year: 5,
  };

  const startOfWeek = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOffset = (d.getDay() + 6) % 7; // 0 = segunda-feira
    d.setDate(d.getDate() - dayOffset);
    return d;
  };

  const chartData = useMemo(() => {
    const count = GRANULARITY_BUCKETS[chartGranularity];
    const buckets: { key: string; name: string; end: Date | null }[] = [];

    if (chartGranularity === "day") {
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        buckets.push({ key, name: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, end: null });
      }
    } else if (chartGranularity === "week") {
      const thisWeekStart = startOfWeek(now);
      for (let i = count - 1; i >= 0; i--) {
        const start = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - i * 7);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
        const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        buckets.push({ key, name: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`, end });
      }
    } else if (chartGranularity === "month") {
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.push({ key, name: MONTH_NAMES[d.getMonth()], end: null });
      }
    } else {
      for (let i = count - 1; i >= 0; i--) {
        const y = now.getFullYear() - i;
        buckets.push({ key: String(y), name: String(y), end: null });
      }
    }

    return buckets.map(({ key, name, end }) => {
      const matches = paid.filter((m) => {
        const moveDate = m.paid_at ?? m.created_at;
        if (end) {
          const d = new Date(moveDate);
          return d >= new Date(key) && d < end;
        }
        return moveDate.startsWith(key);
      });
      return {
        name,
        receita: Math.round(matches.reduce((s, m) => s + m.net_amount, 0)),
        bruto: Math.round(matches.reduce((s, m) => s + m.gross_amount, 0)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, chartGranularity]);

  // Filter + sort state
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

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-brand" />
      : <ChevronDown className="h-3 w-3 text-brand" />;
  }

  const paymentMethods = [...new Set(movements.map((m) => m.payment_method).filter(Boolean))];
  const statuses = [...new Set(movements.map((m) => m.status).filter(Boolean))];

  const fmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(iso));
  const dates = paid.map((m) => m.paid_at ?? m.created_at).sort();
  const periodLabel = dates.length > 0 ? `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}` : null;

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KPI cards */}
      <div className="flex items-center justify-between">
        {periodLabel
          ? <p className="text-xs text-muted-foreground">Totais pagos · {periodLabel}</p>
          : <span />
        }
        <div className="flex items-center gap-2">
          <FinanceiroBackfillButton />
          <ExportMenu movements={movements} mode="dashboard" monthlyData={monthlyData} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Receita Bruta", value: formatCurrency(totals.gross) },
          { label: "Receita Líquida", value: formatCurrency(totals.net) },
          { label: "Frete Cobrado", value: formatCurrency(totals.shipping) },
          { label: "Taxas Gateway", value: formatCurrency(totals.fees) },
          { label: "Comissões Afiliados", value: formatCurrency(totals.commissions) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Receita por {GRANULARITY_LABEL[chartGranularity].toLowerCase()} (líquida)</h3>
            <div className="flex items-center rounded-md border border-border bg-secondary/40 p-0.5">
              {(Object.keys(GRANULARITY_LABEL) as ChartGranularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setChartGranularity(g)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    chartGranularity === g
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {GRANULARITY_LABEL[g]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.54 0.135 152)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="oklch(0.54 0.135 152)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={chartGranularity === "day" ? 2 : 0} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(v as number), "Líquido"]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="oklch(0.54 0.135 152)"
                strokeWidth={2}
                fill="url(#netGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Forma de pagamento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={payBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {payBreakdown.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PAY_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v, entry) => (
                  <span className="text-xs text-foreground">
                    {v}
                    <span className="ml-1 text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format((entry as any).payload?.value ?? 0)}
                    </span>
                  </span>
                )}
              />
              <Tooltip formatter={(v) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)), ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Movements table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header + filters */}
        <div className="px-5 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Movimentações</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
              <button
                onClick={() => router.push("/admin/editora/financeiro/movimentacoes")}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-white text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Ver todas
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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

            {/* Separador */}
            <span className="text-border self-center select-none">|</span>

            {/* De */}
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

            {/* Até */}
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

            {/* Forma de pagamento */}
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

            {/* Status */}
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
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-520px)] min-h-[200px]">
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
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
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
    </main>
  );
}
