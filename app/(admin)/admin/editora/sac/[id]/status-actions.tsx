"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateTicketStatusAction } from "./actions";
import type { TicketStatus } from "@/types/database";

const TRANSITIONS: Record<TicketStatus, { label: string; next: TicketStatus; variant?: "default" | "outline" | "destructive" }[]> = {
  novo: [
    { label: "Iniciar atendimento", next: "em_atendimento" },
  ],
  em_atendimento: [
    { label: "Aguardar cliente", next: "aguardando_cliente", variant: "outline" },
    { label: "Marcar como resolvido", next: "resolvido" },
  ],
  aguardando_cliente: [
    { label: "Retomar atendimento", next: "em_atendimento", variant: "outline" },
    { label: "Marcar como resolvido", next: "resolvido" },
  ],
  resolvido: [
    { label: "Fechar chamado", next: "fechado", variant: "outline" },
    { label: "Reabrir", next: "em_atendimento", variant: "outline" },
  ],
  fechado: [
    { label: "Reabrir chamado", next: "em_atendimento", variant: "outline" },
  ],
};

export function StatusActions({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const [loading, setLoading] = useState<TicketStatus | null>(null);
  const transitions = TRANSITIONS[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  async function handleTransition(nextStatus: TicketStatus) {
    setLoading(nextStatus);
    const result = await updateTicketStatusAction(ticketId, nextStatus);
    if (result.error) {
      toast.error("Erro ao atualizar status: " + result.error);
    } else {
      toast.success("Status atualizado.");
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {transitions.map((t) => (
        <Button
          key={t.next}
          variant={t.variant ?? "default"}
          size="sm"
          className="w-full"
          disabled={loading !== null}
          onClick={() => handleTransition(t.next)}
        >
          {loading === t.next ? "Salvando…" : t.label}
        </Button>
      ))}
    </div>
  );
}
