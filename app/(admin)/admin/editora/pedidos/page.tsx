import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos — Admin Editora Jocum" };
export const revalidate = 30;

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

async function getOrders(): Promise<OrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at, customer_name, order_items(id)")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as OrderRow[];
}

export default async function AdminPedidosPage() {
  const orders = await getOrders();

  const stats = {
    total: orders.length,
    entregue: orders.filter((o) => o.status === "entregue").length,
    enviado: orders.filter((o) => o.status === "enviado").length,
    aguardando: orders.filter((o) => o.status === "aguardando_pagamento").length,
    receita: orders
      .filter((o) => !["cancelado", "aguardando_pagamento"].includes(o.status))
      .reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Pedidos" subtitle={`${stats.total} pedidos recentes`} />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total (últimos 50)", value: stats.total },
            { label: "Entregues", value: stats.entregue },
            { label: "Enviados", value: stats.enviado },
            { label: "Receita", value: formatCurrency(stats.receita) },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Pedido</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Pagamento</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum pedido ainda.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                                const itemCount = Array.isArray(order.order_items)
                      ? order.order_items.length
                      : 0;
                    return (
                      <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3 font-medium">
                          #{order.order_number}
                          <span className="text-xs text-muted-foreground ml-2">
                            {itemCount} {itemCount === 1 ? "item" : "itens"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {order.customer_name ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", STATUS_COLORS[order.status])}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground capitalize">
                          {order.payment_method?.replace("_", " ") ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                            <Link href={`/admin/editora/pedidos/${order.id}`}>
                              Ver
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
