"use client";

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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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

function calcRevenue(orders: AnyRecord[]) {
  return orders
    .filter((o) => !["cancelado", "aguardando_pagamento"].includes(o.status as string))
    .reduce((sum, o) => sum + (o.total as number), 0);
}

function buildMonthlyChart(movements: AnyRecord[]) {
  const now = new Date();
  const months: Record<string, number> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    months[key] = 0;
  }

  for (const m of movements) {
    if (m.type !== "receita") continue;
    const d = new Date(m.created_at as string);
    const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    if (key in months) months[key] += m.amount as number;
  }

  return Object.entries(months).map(([mes, receita]) => ({ mes, receita }));
}

function buildStatusPie(orders: AnyRecord[]) {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const status = o.status as string;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  const COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#ea580c", "#ca8a04", "#dc2626"];
  return Object.entries(counts).map(([status, value], i) => ({
    name: ORDER_STATUS_LABELS[status] ?? status,
    value,
    color: COLORS[i % COLORS.length],
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
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-500")}>
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span>
            {isPositive ? "+" : ""}{trend.pct.toFixed(1)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export function AdminDashboard({ data }: { data: DashboardData }) {
  const thisRevenue = calcRevenue(data.thisMonthOrders);
  const lastRevenue = calcRevenue(data.lastMonthOrders);
  const revenueTrend =
    lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 100;

  const thisCount = data.thisMonthOrders.length;
  const lastCount = data.lastMonthOrders.length;
  const ordersTrend = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 100;

  const pendingReviews = data.reviews.filter((r) => r.status === "pendente").length;
  const openTickets = data.tickets.filter((t) =>
    ["novo", "em_atendimento", "aguardando_cliente"].includes(t.status as string)
  ).length;

  const chartData = buildMonthlyChart(data.movements);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Receita mensal</h2>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-brand h-7">
              <Link href="/admin/editora/financeiro">
                Ver detalhes <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
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
                dataKey="mes"
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
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

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-foreground text-sm">Pedidos por status</h2>
            <p className="text-xs text-muted-foreground">Últimos 90 dias</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: "#555" }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
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
