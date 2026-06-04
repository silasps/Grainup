"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

const STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pago: "bg-blue-100 text-blue-700 border-blue-200",
  separando: "bg-purple-100 text-purple-700 border-purple-200",
  enviado: "bg-indigo-100 text-indigo-700 border-indigo-200",
  entregue: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  shipping_cost: number;
  created_at: string;
  customer_name: string;
  shipping_address: Record<string, string> | null;
  order_items: Array<{ id: string; title: string; quantity: number; books: { sku: string | null } | null }>;
}

type SortEntry = { key: string; dir: "asc" | "desc" };

function getVal(o: OrderRow, key: string): string | number {
  if (key === "order_number") return o.order_number ?? "";
  if (key === "customer_name") return o.customer_name ?? "";
  if (key === "created_at") return o.created_at ?? "";
  if (key === "status") return o.status ?? "";
  if (key === "total") return o.total;
  return "";
}

function applySorts(rows: OrderRow[], sorts: SortEntry[]): OrderRow[] {
  if (!sorts.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const av = getVal(a, key);
      const bv = getVal(b, key);
      const cmp = typeof av === "number" ? av - (bv as number) : (av as string).localeCompare(bv as string);
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

function SortTh({ label, sortKey, sorts, onSort, className }: {
  label: string; sortKey: string; sorts: SortEntry[];
  onSort: (k: string, ctrl: boolean) => void; className?: string;
}) {
  const idx = sorts.findIndex((s) => s.key === sortKey);
  const active = idx >= 0 ? sorts[idx] : null;
  return (
    <th
      onClick={(e) => onSort(sortKey, e.ctrlKey)}
      className={cn("px-5 py-3 text-xs font-semibold bg-white cursor-pointer select-none group", active ? "text-foreground" : "text-muted-foreground hover:text-foreground", className)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active ? (
          active.dir === "asc" ? <ChevronUp className="h-3 w-3 text-brand" /> : <ChevronDown className="h-3 w-3 text-brand" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
        {sorts.length > 1 && idx >= 0 && (
          <span className="text-[9px] font-bold text-brand leading-none">{idx + 1}</span>
        )}
      </span>
    </th>
  );
}

interface StatRow { status: string; total: number; shipping_cost: number; shipping_address: Record<string, string> | null }

export function PedidosTable({ initialOrders, initialStats, onRefresh, onRefreshStats }: {
  initialOrders: OrderRow[];
  initialStats: StatRow[];
  onRefresh: () => Promise<OrderRow[]>;
  onRefreshStats: () => Promise<StatRow[]>;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [allStats, setAllStats] = useState(initialStats);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    async function refresh() {
      const [fresh, freshStats] = await Promise.all([onRefresh(), onRefreshStats()]);
      setOrders(fresh);
      setAllStats(freshStats);
      setLastRefresh(new Date());
    }
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [onRefresh, onRefreshStats]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCarrier, setFilterCarrier] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sorts, setSorts] = useState<SortEntry[]>([{ key: "created_at", dir: "desc" }]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const carriers = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const m = o.shipping_address?.method;
      if (m) set.add(m);
    }
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return orders.filter((o) => {
      if (q && !o.customer_name?.toLowerCase().includes(q) && !o.order_number?.toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterCarrier !== "all" && (o.shipping_address?.method ?? "") !== filterCarrier) return false;
      const d = new Date(o.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [orders, search, filterStatus, filterCarrier, dateFrom, dateTo]);

  const sorted = useMemo(() => applySorts(filtered, sorts), [filtered, sorts]);

  const stats = useMemo(() => ({
    total: allStats.length,
    entregue: allStats.filter((o) => o.status === "entregue").length,
    enviado: allStats.filter((o) => o.status === "enviado").length,
    aguardando: allStats.filter((o) => o.status === "aguardando_pagamento").length,
    receita: allStats
      .filter((o) => !["cancelado", "aguardando_pagamento"].includes(o.status))
      .reduce((s, o) => s + o.total, 0),
    frete: allStats
      .filter((o) => o.status !== "cancelado")
      .reduce((s, o) => s + (o.shipping_cost ?? 0), 0),
  }), [allStats]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filtered]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((n) => Math.min(n + PAGE_SIZE, sorted.length));
    }
  }, [sorted.length]);

  function handleSort(key: string, ctrl: boolean) {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (ctrl) {
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { key, dir: prev[idx].dir === "asc" ? "desc" : "asc" };
          return next;
        }
        return [...prev, { key, dir: "asc" }];
      }
      if (idx === 0 && prev.length === 1) return [{ key, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
      return [{ key, dir: "asc" }];
    });
  }

  const hasFilter = search || filterStatus !== "all" || filterCarrier !== "all" || dateFrom || dateTo;
  const visible = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Pedidos", value: stats.total, title: undefined },
          { label: "Aguardando", value: stats.aguardando, title: undefined },
          { label: "Enviados", value: stats.enviado, title: undefined },
          { label: "Entregues", value: stats.entregue, title: undefined },
          { label: "Receita", value: formatCurrencyShort(stats.receita), title: formatCurrency(stats.receita) },
          { label: "Frete total", value: formatCurrencyShort(stats.frete), title: formatCurrency(stats.frete) },
        ].map((s) => (
          <div key={s.label} title={s.title} className="bg-white rounded-xl border border-border p-3 cursor-default">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Pedidos</h3>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-muted-foreground">
                  atualizado às {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="flex items-center gap-1.5 h-8 rounded-md border border-border bg-secondary/40 px-2 flex-1 min-w-40 focus-within:ring-1 focus-within:ring-brand focus-within:border-brand">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Nome ou nº do pedido"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-full bg-transparent text-xs focus:outline-none w-full"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status */}
            <div className={`flex items-center h-8 rounded-md border text-xs focus-within:ring-1 focus-within:ring-brand ${filterStatus !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer">
                <option value="all">Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {filterStatus !== "all" && (
                <button onClick={() => setFilterStatus("all")} className="ml-0.5 text-brand hover:text-brand-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Transportadora */}
            {carriers.length > 0 && (
              <div className={`flex items-center h-8 rounded-md border text-xs focus-within:ring-1 focus-within:ring-brand ${filterCarrier !== "all" ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
                <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)} className="h-full bg-transparent pl-2 pr-1 focus:outline-none cursor-pointer">
                  <option value="all">Transportadora</option>
                  {carriers.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {filterCarrier !== "all" && (
                  <button onClick={() => setFilterCarrier("all")} className="ml-0.5 text-brand hover:text-brand-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* De */}
            <div className={`flex items-center h-8 rounded-md border text-xs focus-within:ring-1 focus-within:ring-brand ${dateFrom ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <span className="pl-2 pr-1 text-muted-foreground">De</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="h-full bg-transparent pr-1 text-xs focus:outline-none cursor-pointer" />
              {dateFrom && <button onClick={() => setDateFrom("")} className="ml-0.5 text-brand hover:text-brand-700"><X className="h-3.5 w-3.5" /></button>}
            </div>

            {/* Até */}
            <div className={`flex items-center h-8 rounded-md border text-xs focus-within:ring-1 focus-within:ring-brand ${dateTo ? "border-brand bg-brand-50 pr-1" : "border-border bg-secondary/40"}`}>
              <span className="pl-2 pr-1 text-muted-foreground">Até</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="h-full bg-transparent pr-1 text-xs focus:outline-none cursor-pointer" />
              {dateTo && <button onClick={() => setDateTo("")} className="ml-0.5 text-brand hover:text-brand-700"><X className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div ref={scrollRef} onScroll={handleScroll} className="overflow-auto max-h-[calc(100vh-360px)]">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <SortTh label="Pedido" sortKey="order_number" sorts={sorts} onSort={handleSort} className="text-left" />
                <SortTh label="Cliente" sortKey="customer_name" sorts={sorts} onSort={handleSort} className="text-left" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white whitespace-nowrap">Produtos / SKU</th>
                <SortTh label="Status" sortKey="status" sorts={sorts} onSort={handleSort} className="text-left" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white whitespace-nowrap">Envio / Pgto</th>
                <SortTh label="Total" sortKey="total" sorts={sorts} onSort={handleSort} className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    {hasFilter ? "Nenhum pedido encontrado para os filtros aplicados." : "Nenhum pedido ainda."}
                  </td>
                </tr>
              ) : (
                visible.map((order) => {
                  const items = Array.isArray(order.order_items) ? order.order_items : [];
                  const addr = order.shipping_address;
                  const cityState = addr?.city && addr?.state ? `${addr.city} / ${addr.state}` : addr?.city ?? null;
                  const shippingMethod = addr?.method ?? null;
                  const extraItems = items.length > 4 ? items.length - 4 : 0;
                  return (
                    <tr key={order.id} onClick={() => router.push(`/admin/editora/pedidos/${order.id}`)} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm whitespace-nowrap">{order.customer_name ?? "—"}</p>
                        {cityState && <p className="text-xs text-muted-foreground whitespace-nowrap">{cityState}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {items.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div>
                            {items.slice(0, 4).map((item) => (
                              <div key={item.id} className="flex items-baseline gap-2">
                                <p className="text-xs text-muted-foreground whitespace-nowrap">{item.quantity}× {item.title}</p>
                                {item.books?.sku && <p className="text-xs font-mono text-muted-foreground/70 whitespace-nowrap">{item.books.sku}</p>}
                              </div>
                            ))}
                            {extraItems > 0 && <p className="text-xs text-muted-foreground">+{extraItems} mais</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[order.status])}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground capitalize">{order.payment_method?.replace(/_/g, " ") ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{shippingMethod ?? (order.shipping_cost === 0 ? "Frete grátis" : "—")}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(order.total)}</td>
                    </tr>
                  );
                })
              )}
              {visibleCount < sorted.length && (
                <tr>
                  <td colSpan={6} className="text-center py-3 text-xs text-muted-foreground">
                    Mostrando {visibleCount} de {sorted.length} — role para carregar mais
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
