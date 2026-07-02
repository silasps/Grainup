"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  BookOpen,
  Star,
  MessageSquare,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { buildRevenueBuckets, GRANULARITY_LABEL, GRANULARITY_SUBTITLE, type ChartGranularity, type MovementLike } from "@/lib/utils/revenue-chart";

type AnyRecord = Record<string, unknown>;

interface DashboardData {
  orders: AnyRecord[];
  thisMonthOrders: AnyRecord[];
  lastMonthOrders: AnyRecord[];
  recentOrders: AnyRecord[];
  topBooks: AnyRecord[];
  movements: AnyRecord[];
  reviews: AnyRecord[];
  leadsThisMonth: number;
  tickets: AnyRecord[];
  totalBooks: number;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-700",
  pago: "bg-blue-100 text-blue-700",
  separando: "bg-purple-100 text-purple-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregue: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

const STATUS_BAR_COLORS: Record<string, string> = {
  aguardando_pagamento: "#ca8a04",
  pago: "#16a34a",
  separando: "#7c3aed",
  enviado: "#2563eb",
  entregue: "#059669",
  cancelado: "#dc2626",
  reembolsado: "#ea580c",
};

function buildStatusPie(orders: AnyRecord[]) {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const status = o.status as string;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, value]) => ({
    name: ORDER_STATUS_LABELS[status] ?? status,
    value,
    color: STATUS_BAR_COLORS[status] ?? "#94a3b8",
  }));
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; label: string };
  icon: React.ElementType;
  href?: string;
}) {
  const isPositive = (trend?.pct ?? 0) >= 0;
  const card = (
    <div className="h-full bg-white rounded-xl border border-border p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand" />
        </div>
      </div>
      <div className="mb-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {/* sempre ocupa o espaço, mesmo sem trend */}
      <div className="h-4">
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-500")}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{isPositive ? "+" : ""}{trend.pct.toFixed(1)}% {trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link className="block h-full" href={href}>{card}</Link> : card;
}

export function AdminDashboard({ data }: { data: DashboardData }) {
  const now = new Date();
  const monthlyRevenue = buildRevenueBuckets(data.movements as unknown as MovementLike[], "month", now);
  const thisRevenue = monthlyRevenue.at(-1)?.receita ?? 0;
  const lastRevenue = monthlyRevenue.at(-2)?.receita ?? 0;
  const revenueTrend =
    lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 100;

  const thisCount = data.thisMonthOrders.length;
  const lastCount = data.lastMonthOrders.length;
  const ordersTrend = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 100;

  const pendingReviews = data.reviews.filter((r) => r.status === "pendente").length;
  const openTickets = data.tickets.filter((t) =>
    ["novo", "em_atendimento", "aguardando_cliente"].includes(t.status as string)
  ).length;

  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>("month");
  const chartData = useMemo(
    () => buildRevenueBuckets(data.movements as unknown as MovementLike[], chartGranularity, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.movements, chartGranularity]
  );
  const pieData = buildStatusPie(data.orders);

  return (
    <div className="flex flex-col gap-6">
      {/* Alertas */}
      {(pendingReviews > 0 || openTickets > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingReviews > 0 && (
            <Link
              href="/admin/editora/avaliacoes"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>{pendingReviews}</strong> avaliações aguardando aprovação
              </span>
            </Link>
          )}
          {openTickets > 0 && (
            <Link
              href="/admin/editora/sac"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>{openTickets}</strong> chamados SAC em aberto
              </span>
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita este mês"
          value={formatCurrency(thisRevenue)}
          sub={`${thisCount} pedidos`}
          trend={{ pct: revenueTrend, label: "vs mês anterior" }}
          icon={TrendingUp}
          href="/admin/editora/financeiro"
        />
        <KpiCard
          label="Pedidos este mês"
          value={thisCount.toString()}
          sub={`${data.thisMonthOrders.filter((o) => o.status === "entregue").length} entregues`}
          trend={{ pct: ordersTrend, label: "vs mês anterior" }}
          icon={ShoppingBag}
          href="/admin/editora/pedidos"
        />
        <KpiCard
          label="Livros no catálogo"
          value={data.totalBooks.toString()}
          sub="livros ativos"
          icon={BookOpen}
          href="/admin/editora/livros"
        />
        <KpiCard
          label="Leads este mês"
          value={data.leadsThisMonth.toString()}
          sub="novos contatos"
          icon={Users}
          href="/admin/editora/leads"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Receita por {GRANULARITY_LABEL[chartGranularity].toLowerCase()}</h2>
              <p className="text-xs text-muted-foreground">
                {GRANULARITY_SUBTITLE[chartGranularity]}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center rounded-md border border-border bg-secondary/40 p-0.5">
                {(Object.keys(GRANULARITY_LABEL) as ChartGranularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setChartGranularity(g)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      chartGranularity === g
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {GRANULARITY_LABEL[g]}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs text-brand h-7">
                <Link href="/admin/editora/financeiro">
                  Ver detalhes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
                interval={chartGranularity === "day" ? 2 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(v as number), "Receita"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#gradientReceita)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-foreground text-sm">Pedidos por status</h2>
            <p className="text-xs text-muted-foreground">Últimos 90 dias</p>
          </div>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido</p>
          ) : (() => {
            const total = pieData.reduce((s, d) => s + d.value, 0);
            return (
              <div className="flex flex-col gap-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(entry.value / total) * 100}%`, backgroundColor: entry.color }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right mt-1">{total} pedidos no total</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Pedidos recentes</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-brand h-7">
              <Link href="/admin/editora/pedidos">
                Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {data.recentOrders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                Nenhum pedido ainda.
              </p>
            ) : (
              data.recentOrders.map((order) => (
                <Link
                  key={order.id as string}
                  href={`/admin/editora/pedidos/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      #{order.order_number as string}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(order.customer_name as string) ?? "Cliente"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        STATUS_COLORS[order.status as string] ?? "bg-secondary"
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status as string] ?? order.status as string}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(order.total as number)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top books */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Livros mais vendidos</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-brand h-7">
              <Link href="/admin/editora/livros">
                Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {data.topBooks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                Nenhum livro ainda.
              </p>
            ) : (
              data.topBooks.map((book, i) => (
                <Link
                  key={book.id as string}
                  href={`/admin/editora/livros/${book.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="relative w-8 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url as string}
                        alt={book.title as string}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">📖</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {book.title as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {book.sales_count as number} vendas · {formatCurrency(book.price as number)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
