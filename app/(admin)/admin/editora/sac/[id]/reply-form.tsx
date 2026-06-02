"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { sendAdminReplyAction } from "./actions";
import type { TicketStatus } from "@/types/database";

interface ReplyFormProps {
  ticketId: string;
  customerEmail: string;
  ticketSubject: string;
  currentStatus: TicketStatus;
}

const STATUS_AFTER_REPLY_LABELS: Record<TicketStatus | "keep", string> = {
  keep: "Não alterar status",
  novo: "Novo",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export function ReplyForm({ ticketId, customerEmail, ticketSubject, currentStatus }: ReplyFormProps) {
  const [subject, setSubject] = useState(`Re: ${ticketSubject}`);
  const [body, setBody] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | "keep">("keep");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Escreva uma mensagem antes de enviar.");
      return;
    }
    setLoading(true);
    const result = await sendAdminReplyAction(
      ticketId,
      subject,
      body,
      newStatus === "keep" ? null : newStatus
    );
    if (result.error) {
      toast.error("Erro ao enviar resposta: " + result.error);
    } else {
      toast.success("Resposta registrada. E-mail será enviado quando Resend estiver configurado.");
      setBody("");
      setNewStatus("keep");
    }
    setLoading(false);
  }

  const statusOptions = [
    { value: "keep", label: STATUS_AFTER_REPLY_LABELS.keep },
    { value: "em_atendimento", label: STATUS_AFTER_REPLY_LABELS.em_atendimento },
    { value: "aguardando_cliente", label: STATUS_AFTER_REPLY_LABELS.aguardando_cliente },
    { value: "resolvido", label: STATUS_AFTER_REPLY_LABELS.resolvido },
  ].filter((opt) => opt.value === "keep" || opt.value !== currentStatus);
  const selectedStatusLabel = STATUS_AFTER_REPLY_LABELS[newStatus];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Para</Label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm">
          {customerEmail}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="reply-subject" className="text-xs text-muted-foreground">Assunto</Label>
        <Input
          id="reply-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="reply-body" className="text-xs text-muted-foreground">Mensagem</Label>
        <Textarea
          id="reply-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva sua resposta ao cliente…"
          rows={6}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="reply-status" className="text-xs text-muted-foreground">
            Status após envio
          </Label>
          <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TicketStatus | "keep")}>
            <SelectTrigger id="reply-status" className="h-10 w-full text-sm">
              <SelectValue>{selectedStatusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="max-w-[calc(100vw-2rem)]"
            >
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="min-h-10 py-2">
                  <span className="whitespace-normal leading-snug">
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          disabled={loading || !body.trim()}
          className="w-full gap-2 sm:w-auto sm:shrink-0"
        >
          <Send className="h-4 w-4" />
          {loading ? "Enviando…" : "Enviar resposta"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        O e-mail será enviado automaticamente quando o Resend estiver integrado.
      </p>
    </form>
  );
}
