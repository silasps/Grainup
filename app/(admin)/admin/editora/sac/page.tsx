import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "SAC — Admin Editora Jocum" };
export const revalidate = 30;

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-red-100 text-red-700 border-red-200",
  em_atendimento: "bg-blue-100 text-blue-700 border-blue-200",
  aguardando_cliente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolvido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  fechado: "bg-gray-100 text-gray-500 border-gray-200",
};

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Assunto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Categoria</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Aberto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Nenhum chamado ainda.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <p className="font-medium">{ticket.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.customer_email}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {ticket.category}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_COLORS[ticket.status])}
                      >
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatRelativeTime(ticket.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
