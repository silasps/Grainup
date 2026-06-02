"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp, Eye, ShoppingCart, CreditCard, Users } from "lucide-react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    const views = events.filter((e) => e.event_type === "view").length;
    const carts = events.filter((e) => e.event_type === "add_to_cart").length;
    const purchases = events.filter((e) => e.event_type === "purchase").length;
    const cartRate = views > 0 ? ((carts / views) * 100).toFixed(1) : "0";
    const purchaseRate = views > 0 ? ((purchases / views) * 100).toFixed(1) : "0";
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
        title: b.title.length > 22 ? b.title.slice(0, 22) + "…" : b.title,
        taxa: b.view > 0 ? ((b.purchase / b.view) * 100).toFixed(1) + "%" : "0%",
      }));
  }, [events]);

  // --- Leads por dia (últimos 30 dias) ---
  const leadsByDay = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const day = lead.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return {
        day: format(d, "dd/MM", { locale: ptBR }),
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
            sub={`${funnel.cartRate}% das visualizações`}
          />
          <StatCard
            label="Compraram"
            value={funnel.purchases.toLocaleString("pt-BR")}
            icon={CreditCard}
            sub={`${funnel.purchaseRate}% das visualizações`}
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
                  { name: "Visualizações", valor: funnel.views, fill: "#6366f1" },
                  { name: "Carrinho", valor: funnel.carts, fill: "#8b5cf6" },
                  { name: "Compras", valor: funnel.purchases, fill: "#10b981" },
                ]}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {[
                    { fill: "#6366f1" },
                    { fill: "#8b5cf6" },
                    { fill: "#10b981" },
                  ].map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top livros */}
      {topBooks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Top livros por visualização</h2>
          <div className="bg-white rounded-xl border border-border p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topBooks}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={140} />
                <Tooltip
                  formatter={(v, name) => [
                    typeof v === "number" ? v.toLocaleString("pt-BR") : v,
                    name === "view"
                      ? "Visualizações"
                      : name === "add_to_cart"
                      ? "Carrinho"
                      : "Compras",
                  ]}
                />
                <Legend
                  formatter={(v) =>
                    v === "view" ? "Visualizações" : v === "add_to_cart" ? "Carrinho" : "Compras"
                  }
                />
                <Bar dataKey="view" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="add_to_cart" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="purchase" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de conversão por livro */}
          <div className="mt-4 bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Livro</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Views</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Carrinho</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Compras</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Taxa conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topBooks.map((b) => (
                  <tr key={b.title} className="hover:bg-secondary/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{b.title}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{b.view.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{b.add_to_cart.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{b.purchase.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold ${parseFloat(b.taxa) >= 5 ? "text-emerald-600" : parseFloat(b.taxa) >= 1 ? "text-amber-600" : "text-muted-foreground"}`}>
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
