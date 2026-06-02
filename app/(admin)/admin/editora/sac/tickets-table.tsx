"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format";

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
}

export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border shadow-sm">
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Cliente</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Assunto</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Categoria</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Aberto</th>
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
              <tr
                key={ticket.id}
                onClick={() => router.push(`/admin/editora/sac/${ticket.id}`)}
                className="hover:bg-secondary/30 transition-colors cursor-pointer"
              >
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
  );
}
