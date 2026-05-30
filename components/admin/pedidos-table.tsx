"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  created_at: string;
  customer_name: string;
  order_items: Array<{ id: string }>;
}

export function PedidosTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return orders.filter((o) => {
      if (q && !o.customer_name?.toLowerCase().includes(q) && !o.order_number?.toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      const d = new Date(o.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [orders, search, filterStatus, dateFrom, dateTo]);

  const hasFilter = search || filterStatus !== "all" || dateFrom || dateTo;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pedidos</h3>
          <span className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
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
      <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border shadow-sm">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Pedido</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Cliente</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Data</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Pagamento</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  {hasFilter ? "Nenhum pedido encontrado para os filtros aplicados." : "Nenhum pedido ainda."}
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const itemCount = Array.isArray(order.order_items) ? order.order_items.length : 0;
                return (
                  <tr key={order.id} onClick={() => router.push(`/admin/editora/pedidos/${order.id}`)} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "itens"}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{order.customer_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[order.status])}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground capitalize hidden md:table-cell">
                      {order.payment_method?.replace("_", " ") ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(order.total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
