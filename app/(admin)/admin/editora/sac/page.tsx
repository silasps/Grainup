import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { TicketsTable } from "./tickets-table";

export const metadata: Metadata = { title: "SAC — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

interface Ticket {
  id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

async function getTickets(): Promise<Ticket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("id, customer_name, customer_email, subject, category, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as Ticket[];
}

export default async function AdminSACPage() {
  const tickets = await getTickets();

  const counts = {
    novo: tickets.filter((t) => t.status === "novo").length,
    em_atendimento: tickets.filter((t) => t.status === "em_atendimento").length,
    aguardando: tickets.filter((t) => t.status === "aguardando_cliente").length,
    resolvido: tickets.filter((t) => t.status === "resolvido").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="SAC" subtitle={`${tickets.length} chamados`} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Novos", value: counts.novo, color: "text-red-600" },
            { label: "Em atendimento", value: counts.em_atendimento, color: "text-blue-600" },
            { label: "Aguardando cliente", value: counts.aguardando, color: "text-yellow-600" },
            { label: "Resolvidos", value: counts.resolvido, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tickets list */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <TicketsTable tickets={tickets} />
        </div>
      </main>
    </div>
  );
}
