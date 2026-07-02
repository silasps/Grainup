"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, Eye, ShoppingCart, CreditCard, Users } from "lucide-react";
import {
  addBrasiliaCalendarDays,
  brasiliaDateToUtcIso,
  formatBrasiliaDayMonth,
  getBrasiliaDateKey,
  getBrasiliaDateParts,
} from "@/lib/utils/brasilia-time";

// book_events só passou a ser gravado de forma confiável a partir desta data
// (antes disso a tabela nem existia em produção — ver system_architecture.md,
// seção 13). Os 35 eventos de "purchase" anteriores a essa data são um
// backfill reconstruído de pedidos pagos, sem visualização/carrinho
// correspondentes — por isso ficam de fora do cálculo de taxa de conversão
// (senão a % ficaria artificialmente alta/quebrada), mas continuam contando
// no número absoluto de "Compraram", que é real.
const TRACKING_RELIABLE_SINCE = brasiliaDateToUtcIso(2026, 7, 2);

// Visualização → carrinho → compra é uma sequência (cada estágio é um
// subconjunto do anterior), não identidades soltas — por isso usa uma rampa
// ordinal de um hue só (claro→escuro = fundo→fundo do funil) em vez de 3
// cores categóricas arbitrárias. Validado com scripts/validate_palette.js
// "#6bb983,#228a4e,#006430" --mode light --ordinal (todos os checks passam).
const FUNNEL_COLOR = {
  view: "oklch(0.72 0.11 153)",
  add_to_cart: "oklch(0.56 0.13 153)",
  purchase: "oklch(0.44 0.12 153)",
} as const;

const FUNNEL_LABEL: Record<keyof typeof FUNNEL_COLOR, string> = {
  view: "Visualizações",
  add_to_cart: "Carrinho",
  purchase: "Compras",
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 min-w-[48px] rounded-full bg-secondary overflow-hidden">
        {value > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
          />
        )}
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums w-5 text-right flex-shrink-0">
        {value}
      </span>
    </div>
  );
}

interface BookEventRow {
  book_id: string;
  event_type: string;
  created_at: string;
  books: { id: string; title: string; slug: string } | null;
}

interface Lead {
  id: string;
  origin: string;
  created_at: string;
  marketing_consent: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-brand/10">
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AnalyticsTab({
  events,
  leads,
}: {
  events: BookEventRow[];
  leads: Lead[];
}) {
  // --- Funil global ---
  const funnel = useMemo(() => {
    // Números absolutos: todo evento registrado, incluindo o backfill de
    // compras anteriores ao tracking (é a contagem real de vendas).
    const views = events.filter((e) => e.event_type === "view").length;
    const carts = events.filter((e) => e.event_type === "add_to_cart").length;
    const purchases = events.filter((e) => e.event_type === "purchase").length;

    // Taxas de conversão: só eventos gravados organicamente (a partir de
    // TRACKING_RELIABLE_SINCE), pra não misturar compras retroativas sem
    // visualização/carrinho correspondentes e inflar a % artificialmente.
    const trackedEvents = events.filter((e) => e.created_at >= TRACKING_RELIABLE_SINCE);
    const trackedViews = trackedEvents.filter((e) => e.event_type === "view").length;
    const trackedCarts = trackedEvents.filter((e) => e.event_type === "add_to_cart").length;
    const trackedPurchases = trackedEvents.filter((e) => e.event_type === "purchase").length;
    const cartRate = trackedViews > 0 ? ((trackedCarts / trackedViews) * 100).toFixed(1) : "0";
    const purchaseRate = trackedViews > 0 ? ((trackedPurchases / trackedViews) * 100).toFixed(1) : "0";

    return { views, carts, purchases, cartRate, purchaseRate };
  }, [events]);

  // --- Top 10 livros por visualizações ---
  const topBooks = useMemo(() => {
    const map = new Map<string, { title: string; view: number; add_to_cart: number; purchase: number }>();
    for (const e of events) {
      if (!e.books) continue;
      const key = e.book_id;
      if (!map.has(key)) {
        map.set(key, { title: e.books.title, view: 0, add_to_cart: 0, purchase: 0 });
      }
      const entry = map.get(key)!;
      if (e.event_type === "view") entry.view++;
      else if (e.event_type === "add_to_cart") entry.add_to_cart++;
      else if (e.event_type === "purchase") entry.purchase++;
    }
    return Array.from(map.values())
      .sort((a, b) => b.view - a.view)
      .slice(0, 10)
      .map((b) => ({
        ...b,
        taxa: b.view > 0 ? ((b.purchase / b.view) * 100).toFixed(1) + "%" : "0%",
      }));
  }, [events]);

  // Cada coluna escala contra o próprio máximo — livros com 0 visualizações
  // ainda mostram barras de carrinho/compra proporcionais, em vez de tudo
  // achatado contra um eixo compartilhado com valores de escalas diferentes.
  const topBooksMax = useMemo(
    () => ({
      view: Math.max(1, ...topBooks.map((b) => b.view)),
      add_to_cart: Math.max(1, ...topBooks.map((b) => b.add_to_cart)),
      purchase: Math.max(1, ...topBooks.map((b) => b.purchase)),
    }),
    [topBooks]
  );

  // --- Leads por dia (últimos 30 dias) ---
  const leadsByDay = useMemo(() => {
    const today = getBrasiliaDateParts(new Date());
    const days = Array.from({ length: 30 }, (_, i) => addBrasiliaCalendarDays(today, i - 29));
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const day = getBrasiliaDateKey(lead.created_at);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return days.map((d) => {
      const key = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
      return {
        day: formatBrasiliaDayMonth(d),
        leads: counts.get(key) ?? 0,
      };
    });
  }, [leads]);

  // --- Leads por origem (últimos 30 dias) ---
  const leadsByOrigin = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      map.set(l.origin, (map.get(l.origin) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([origin, count]) => ({ origin, count }));
  }, [leads]);

  const ORIGIN_LABELS: Record<string, string> = {
    newsletter: "Newsletter",
    livro: "Livro",
    home: "Home",
    checkout: "Checkout",
    cadastro: "Cadastro",
    novidades: "Novidades",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
      {/* KPIs do funil */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Funil de conversão — todos os livros</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Visualizações" value={funnel.views.toLocaleString("pt-BR")} icon={Eye} />
          <StatCard
            label="Adicionaram ao carrinho"
            value={funnel.carts.toLocaleString("pt-BR")}
            icon={ShoppingCart}
            sub={`${funnel.cartRate}% das visualizações (desde 02/07)`}
          />
          <StatCard
            label="Compraram"
            value={funnel.purchases.toLocaleString("pt-BR")}
            icon={CreditCard}
            sub={`${funnel.purchaseRate}% das visualizações (desde 02/07)`}
          />
          <StatCard label="Total de leads" value={leads.length.toLocaleString("pt-BR")} icon={Users} />
          <StatCard
            label="Consentiram marketing"
            value={leads.filter((l) => l.marketing_consent).length.toLocaleString("pt-BR")}
            icon={TrendingUp}
            sub={`${leads.length > 0 ? ((leads.filter((l) => l.marketing_consent).length / leads.length) * 100).toFixed(0) : 0}% do total`}
          />
        </div>
      </div>

      {/* Funil visual simples */}
      {funnel.views > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Funil visual</h2>
          <div className="bg-white rounded-xl border border-border p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { key: "view" as const, name: "Visualizações", valor: funnel.views },
                  { key: "add_to_cart" as const, name: "Carrinho", valor: funnel.carts },
                  { key: "purchase" as const, name: "Compras", valor: funnel.purchases },
                ]}
                margin={{ top: 20, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: "#eee" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {(["view", "add_to_cart", "purchase"] as const).map((k) => (
                    <Cell key={k} fill={FUNNEL_COLOR[k]} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="top"
                    formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)}
                    style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top livros */}
      {topBooks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Top livros — funil de conversão</h2>
            <div className="flex items-center gap-3">
              {(["view", "add_to_cart", "purchase"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUNNEL_COLOR[k] }} />
                  {FUNNEL_LABEL[k]}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Livro</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">Visualizações</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">Carrinho</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">Compras</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topBooks.map((b, i) => (
                  <tr key={b.title} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px] truncate" title={b.title}>
                      {b.title}
                    </td>
                    <td className="px-4 py-2.5">
                      <MiniBar value={b.view} max={topBooksMax.view} color={FUNNEL_COLOR.view} />
                    </td>
                    <td className="px-4 py-2.5">
                      <MiniBar value={b.add_to_cart} max={topBooksMax.add_to_cart} color={FUNNEL_COLOR.add_to_cart} />
                    </td>
                    <td className="px-4 py-2.5">
                      <MiniBar value={b.purchase} max={topBooksMax.purchase} color={FUNNEL_COLOR.purchase} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold tabular-nums ${parseFloat(b.taxa) >= 5 ? "text-emerald-600" : parseFloat(b.taxa) >= 1 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {b.taxa}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads por dia */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Captação de leads — últimos 30 dias</h2>
        <div className="bg-white rounded-xl border border-border p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsByDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                interval={6}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads por origem */}
      {leadsByOrigin.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Leads por origem</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {leadsByOrigin.map((o) => (
              <div key={o.origin} className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">{ORIGIN_LABELS[o.origin] ?? o.origin}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{o.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && leads.length === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Ainda não há dados suficientes. Assim que usuários visitarem livros, os dados aparecem aqui.
        </div>
      )}
    </div>
  );
}
