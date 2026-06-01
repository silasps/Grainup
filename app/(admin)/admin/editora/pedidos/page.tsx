import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { PedidosTable, type OrderRow } from "@/components/admin/pedidos-table";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Pedidos — Admin Editora Jocum" };
export const dynamic = "force-dynamic";


async function getOrders(): Promise<OrderRow[]> {
  const supabase = await createAdminClient();
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
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
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

        <PedidosTable orders={orders} />
      </main>
    </div>
  );
}
