"use client";

import { useMemo, useState } from "react";
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
  addBrasiliaCalendarMonths,
  brasiliaDateToUtcIso,
  formatBrasiliaDayMonth,
  getBrasiliaDateKey,
  getBrasiliaDateParts,
} from "@/lib/utils/brasilia-time";

const MONTH_NAMES_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

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

// Aqui as 3 métricas são identidades distintas lado a lado num mesmo gráfico
// (não uma sequência de funil), então usa 3 cores categóricas de verdade —
// uma por métrica — em vez da rampa ordinal de um hue só usada acima.
// Validado com scripts/validate_palette.js "#0f74c5,#c87b00,#006430"
// --mode light (todos os checks passam; verde+terracota falhava CVD, por
// isso o carrinho é âmbar aqui em vez da cor terracota da marca).
const PURCHASE_CHART_COLOR = {
  view: "#0f74c5",
  add_to_cart: "#c87b00",
  purchase: "#006430",
} as const;

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
  books: { id: string; title: string; slug: string; cover_url: string | null } | null;
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
  const now = new Date();

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

  // --- Filtro de período do "Top livros por compra" ---
  // "all" | "15d" | "30d" | "90d" | "m:YYYY-MM" | "y:YYYY"
  const [purchasePeriod, setPurchasePeriod] = useState("all");

  // Meses e anos com pelo menos um evento — só oferece no seletor o que
  // existe de fato, em vez de uma lista fixa (a maioria vazia).
  const { availableMonths, availableYears } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<number>();
    for (const e of events) {
      const parts = getBrasiliaDateParts(new Date(e.created_at));
      months.add(`${parts.year}-${String(parts.month).padStart(2, "0")}`);
      years.add(parts.year);
    }
    return {
      availableMonths: Array.from(months)
        .sort()
        .reverse()
        .map((key) => {
          const [y, m] = key.split("-").map(Number);
          return { key: `m:${key}`, label: `${MONTH_NAMES_FULL[m - 1]} de ${y}` };
        }),
      availableYears: Array.from(years)
        .sort((a, b) => b - a)
        .map((y) => ({ key: `y:${y}`, label: String(y) })),
    };
  }, [events]);

  const { purchaseFromIso, purchaseToIso } = useMemo(() => {
    if (purchasePeriod === "all") return { purchaseFromIso: null, purchaseToIso: null };
    if (purchasePeriod === "15d" || purchasePeriod === "30d" || purchasePeriod === "90d") {
      const days = { "15d": 15, "30d": 30, "90d": 90 }[purchasePeriod];
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return { purchaseFromIso: from.toISOString(), purchaseToIso: null };
    }
    if (purchasePeriod.startsWith("m:")) {
      const [y, m] = purchasePeriod.slice(2).split("-").map(Number);
      const nextMonth = addBrasiliaCalendarMonths({ year: y, month: m, day: 1 }, 1);
      return {
        purchaseFromIso: brasiliaDateToUtcIso(y, m, 1),
        purchaseToIso: brasiliaDateToUtcIso(nextMonth.year, nextMonth.month, nextMonth.day),
      };
    }
    if (purchasePeriod.startsWith("y:")) {
      const y = Number(purchasePeriod.slice(2));
      return {
        purchaseFromIso: brasiliaDateToUtcIso(y, 1, 1),
        purchaseToIso: brasiliaDateToUtcIso(y + 1, 1, 1),
      };
    }
    return { purchaseFromIso: null, purchaseToIso: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePeriod]);

  // --- Top livros por compra (ranking dedicado, ordenado por venda real) ---
  const topBooksByPurchase = useMemo(() => {
    const scopedEvents =
      purchaseFromIso || purchaseToIso
        ? events.filter(
            (e) =>
              (!purchaseFromIso || e.created_at >= purchaseFromIso) &&
              (!purchaseToIso || e.created_at < purchaseToIso)
          )
        : events;

    const map = new Map<
      string,
      { id: string; title: string; coverUrl: string | null; view: number; add_to_cart: number; purchase: number }
    >();
    for (const e of scopedEvents) {
      if (!e.books) continue;
      const key = e.book_id;
      if (!map.has(key)) {
        map.set(key, { id: key, title: e.books.title, coverUrl: e.books.cover_url, view: 0, add_to_cart: 0, purchase: 0 });
      }
      const entry = map.get(key)!;
      if (e.event_type === "view") entry.view++;
      else if (e.event_type === "add_to_cart") entry.add_to_cart++;
      else if (e.event_type === "purchase") entry.purchase++;
    }
    return Array.from(map.values())
      .filter((b) => b.purchase > 0)
      .sort((a, b) => b.purchase - a.purchase)
      .slice(0, 8);
  }, [events, purchaseFromIso, purchaseToIso]);

  const topBooksById = useMemo(
    () => new Map(topBooksByPurchase.map((b) => [b.id, b])),
    [topBooksByPurchase]
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

  // Eixo X customizado: capa do livro (igual à do site) + título embaixo,
  // no lugar do texto puro do nome. payload.value carrega o book id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function BookCoverTick(props: any) {
    const { x, y, payload } = props;
    const book = topBooksById.get(payload.value);
    if (!book) return null;
    const COVER_W = 34;
    const COVER_H = 48;
    const shortTitle = book.title.length > 20 ? book.title.slice(0, 20) + "…" : book.title;
    return (
      <g transform={`translate(${x},${y})`}>
        <clipPath id={`cover-clip-${book.id}`}>
          <rect x={-COVER_W / 2} y={8} width={COVER_W} height={COVER_H} rx={3} />
        </clipPath>
        {book.coverUrl ? (
          <image
            href={book.coverUrl}
            x={-COVER_W / 2}
            y={8}
            width={COVER_W}
            height={COVER_H}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#cover-clip-${book.id})`}
          />
        ) : (
          <rect x={-COVER_W / 2} y={8} width={COVER_W} height={COVER_H} rx={3} fill="var(--secondary)" />
        )}
        <rect x={-COVER_W / 2} y={8} width={COVER_W} height={COVER_H} rx={3} fill="none" stroke="var(--border)" />
        <title>{book.title}</title>
        <text x={0} y={8 + COVER_H + 13} textAnchor="middle" fontSize={9.5} fill="var(--muted-foreground)">
          {shortTitle}
        </text>
      </g>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-8">
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

      {/* Top livros por compra */}
      {events.some((e) => e.event_type === "purchase") && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-foreground">Top livros por compra</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                {(["view", "add_to_cart", "purchase"] as const).map((k) => (
                  <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PURCHASE_CHART_COLOR[k] }} />
                    {FUNNEL_LABEL[k]}
                  </span>
                ))}
              </div>
              <select
                value={purchasePeriod}
                onChange={(e) => setPurchasePeriod(e.target.value)}
                className="h-8 rounded-md border border-border bg-white pl-2.5 pr-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
              >
                <option value="all">Todo período</option>
                <option value="15d">Últimos 15 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                {availableMonths.length > 0 && (
                  <optgroup label="Por mês">
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableYears.length > 0 && (
                  <optgroup label="Por ano">
                    {availableYears.map((y) => (
                      <option key={y.key} value={y.key}>
                        {y.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            {topBooksByPurchase.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Nenhuma venda nesse período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topBooksByPurchase}
                  barGap={2}
                  margin={{ top: 20, right: 8, left: -20, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3" vertical={false} stroke="#eee" />
                  <XAxis
                    dataKey="id"
                    tick={BookCoverTick}
                    interval={0}
                    height={76}
                    axisLine={{ stroke: "#eee" }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                    formatter={(v, k) => [
                      typeof v === "number" ? v.toLocaleString("pt-BR") : v,
                      FUNNEL_LABEL[k as keyof typeof FUNNEL_LABEL] ?? k,
                    ]}
                    labelFormatter={(id) => topBooksById.get(id as string)?.title ?? ""}
                  />
                  <Bar dataKey="view" name="view" fill={PURCHASE_CHART_COLOR.view} radius={[3, 3, 0, 0]} maxBarSize={16}>
                    <LabelList dataKey="view" position="top" formatter={(v) => (typeof v === "number" && v > 0 ? v : "")} style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="add_to_cart" name="add_to_cart" fill={PURCHASE_CHART_COLOR.add_to_cart} radius={[3, 3, 0, 0]} maxBarSize={16}>
                    <LabelList dataKey="add_to_cart" position="top" formatter={(v) => (typeof v === "number" && v > 0 ? v : "")} style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="purchase" name="purchase" fill={PURCHASE_CHART_COLOR.purchase} radius={[3, 3, 0, 0]} maxBarSize={16}>
                    <LabelList dataKey="purchase" position="top" formatter={(v) => (typeof v === "number" && v > 0 ? v : "")} style={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
