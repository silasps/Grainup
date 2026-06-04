import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/header";
import { PedidosTable } from "@/components/admin/pedidos-table";
import { fetchOrdersAction, fetchStatsAction } from "./actions";

export const metadata: Metadata = { title: "Pedidos — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const [orders, stats] = await Promise.all([fetchOrdersAction(), fetchStatsAction()]);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Pedidos" subtitle="Atualiza a cada 15s" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <PedidosTable
          initialOrders={orders}
          initialStats={stats}
          onRefresh={fetchOrdersAction}
          onRefreshStats={fetchStatsAction}
        />
      </main>
    </div>
  );
}
