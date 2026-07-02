"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  addBrasiliaCalendarMonths,
  brasiliaDateToUtcIso,
  getBrasiliaDateParts,
} from "@/lib/utils/brasilia-time";

const MONTH_NAMES_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Aqui as 3 métricas são identidades distintas lado a lado num mesmo gráfico
// (não uma sequência de funil), então usa 3 cores categóricas de verdade —
// uma por métrica. Validado com scripts/validate_palette.js
// "#0f74c5,#c87b00,#006430" --mode light (todos os checks passam; verde +
// terracota, a cor de acento da marca, falhava separação CVD).
const PURCHASE_CHART_COLOR = {
  view: "#0f74c5",
  add_to_cart: "#c87b00",
  purchase: "#006430",
} as const;

const METRIC_LABEL: Record<keyof typeof PURCHASE_CHART_COLOR, string> = {
  view: "Visualizações",
  add_to_cart: "Carrinho",
  purchase: "Compras",
};

export interface BookEventRow {
  book_id: string;
  event_type: string;
  created_at: string;
  books: { id: string; title: string; slug: string; cover_url: string | null } | null;
}

export function TopBooksByPurchaseChart({
  events,
  limit = 8,
}: {
  events: BookEventRow[];
  limit?: number;
}) {
  const now = new Date();

  // "all" | "15d" | "30d" | "90d" | "m:YYYY-MM" | "y:YYYY"
  const [period, setPeriod] = useState("all");

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

  const { fromIso, toIso } = useMemo(() => {
    if (period === "all") return { fromIso: null, toIso: null };
    if (period === "15d" || period === "30d" || period === "90d") {
      const days = { "15d": 15, "30d": 30, "90d": 90 }[period];
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return { fromIso: from.toISOString(), toIso: null };
    }
    if (period.startsWith("m:")) {
      const [y, m] = period.slice(2).split("-").map(Number);
      const nextMonth = addBrasiliaCalendarMonths({ year: y, month: m, day: 1 }, 1);
      return {
        fromIso: brasiliaDateToUtcIso(y, m, 1),
        toIso: brasiliaDateToUtcIso(nextMonth.year, nextMonth.month, nextMonth.day),
      };
    }
    if (period.startsWith("y:")) {
      const y = Number(period.slice(2));
      return { fromIso: brasiliaDateToUtcIso(y, 1, 1), toIso: brasiliaDateToUtcIso(y + 1, 1, 1) };
    }
    return { fromIso: null, toIso: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const topBooks = useMemo(() => {
    const scopedEvents =
      fromIso || toIso
        ? events.filter((e) => (!fromIso || e.created_at >= fromIso) && (!toIso || e.created_at < toIso))
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
      .slice(0, limit);
  }, [events, fromIso, toIso, limit]);

  const topBooksById = useMemo(() => new Map(topBooks.map((b) => [b.id, b])), [topBooks]);

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

  if (!events.some((e) => e.event_type === "purchase")) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Top livros por compra</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            {(["view", "add_to_cart", "purchase"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PURCHASE_CHART_COLOR[k] }} />
                {METRIC_LABEL[k]}
              </span>
            ))}
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
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
        {topBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">Nenhuma venda nesse período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topBooks} barGap={2} margin={{ top: 20, right: 8, left: -20, bottom: 4 }}>
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
                  METRIC_LABEL[k as keyof typeof METRIC_LABEL] ?? k,
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
  );
}
