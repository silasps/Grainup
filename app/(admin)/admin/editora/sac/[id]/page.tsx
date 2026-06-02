import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";
import { ArrowLeft } from "lucide-react";
import { ReplyForm } from "./reply-form";
import { StatusActions } from "./status-actions";
import type { TicketStatus } from "@/types/database";

export const metadata: Metadata = { title: "Chamado SAC — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

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

const CATEGORY_LABELS: Record<string, string> = {
  pedido: "Pedido",
  produto: "Produto",
  devolucao: "Devolução",
  parceria: "Parceria",
  imprensa: "Imprensa",
  outros: "Outros",
};

interface Message {
  id: string;
  sender_name: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  order_id: string | null;
  category: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  support_messages: Message[];
}

async function getTicket(id: string): Promise<TicketDetail | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(
      `id, ticket_number, customer_name, customer_email, customer_phone,
       order_id, category, subject, status, created_at, updated_at,
       support_messages(id, sender_name, body, is_admin, created_at)`
    )
    .eq("id", id)
    .order("created_at", { ascending: true, referencedTable: "support_messages" })
    .single();
  return data as unknown as TicketDetail | null;
}

export default async function AdminSACDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const messages = ticket.support_messages ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title={`Chamado #${ticket.ticket_number}`}
        subtitle={`${ticket.customer_name} · ${STATUS_LABELS[ticket.status] ?? ticket.status}`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild className="w-fit -mt-2">
          <Link href="/admin/editora/sac">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar aos chamados
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: thread + reply */}
          <div className="lg:col-span-2 space-y-5">
            {/* Message thread */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Conversa</h3>
              </div>
              <div className="p-5 space-y-4 min-h-[120px]">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma mensagem ainda.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-1 max-w-[85%]",
                        msg.is_admin ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                          msg.is_admin
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.body}
                      </div>
                      <p className="text-[11px] text-muted-foreground px-1">
                        {msg.sender_name} · {formatDateTime(msg.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reply form */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Enviar resposta</h3>
              </div>
              <div className="p-5">
                <ReplyForm
                  ticketId={ticket.id}
                  customerEmail={ticket.customer_email}
                  ticketSubject={ticket.subject}
                  currentStatus={ticket.status}
                />
              </div>
            </div>
          </div>

          {/* Right: info + status */}
          <div className="space-y-5">
            {/* Status card */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Status atual</h3>
                <Badge
                  variant="outline"
                  className={cn("text-xs", STATUS_COLORS[ticket.status])}
                >
                  {STATUS_LABELS[ticket.status] ?? ticket.status}
                </Badge>
              </div>
              <StatusActions ticketId={ticket.id} currentStatus={ticket.status} />
            </div>

            {/* Ticket info card */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Informações</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Protocolo</p>
                  <p className="font-medium">#{ticket.ticket_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assunto</p>
                  <p>{ticket.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aberto em</p>
                  <p>{formatDateTime(ticket.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última atualização</p>
                  <p>{formatDateTime(ticket.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Customer card */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Cliente</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{ticket.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <a
                    href={`mailto:${ticket.customer_email}`}
                    className="text-primary hover:underline break-all"
                  >
                    {ticket.customer_email}
                  </a>
                </div>
                {ticket.customer_phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p>{ticket.customer_phone}</p>
                  </div>
                )}
                {ticket.order_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Pedido vinculado</p>
                    <Link
                      href={`/admin/editora/pedidos/${ticket.order_id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver pedido →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
