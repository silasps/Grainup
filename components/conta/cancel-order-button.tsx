"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestCancellationAction } from "@/app/(conta)/minha-conta/pedidos/[id]/actions";
import type { OrderStatus } from "@/types/database";

const REASONS = [
  "Arrependimento de compra",
  "Preço encontrado mais barato",
  "Endereço de entrega incorreto",
  "Pedido duplicado",
  "Prazo de entrega muito longo",
  "Outro",
];

interface Props {
  orderId: string;
  status: OrderStatus;
}

export function CancelOrderButton({ orderId, status }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isImmediate = status === "aguardando_pagamento";

  function handleConfirm() {
    if (!reason) return;
    startTransition(async () => {
      const { error } = await requestCancellationAction(orderId, reason);
      if (error) {
        toast.error(error);
        return;
      }
      setOpen(false);
      if (isImmediate) {
        toast.success("Pedido cancelado com sucesso.");
      } else {
        toast.success("Solicitação enviada. Você receberá um e-mail em até 1 dia útil.");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={() => setOpen(true)}
      >
        Cancelar pedido
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              {isImmediate
                ? "O pedido ainda não foi pago e será cancelado imediatamente."
                : "Sua solicitação será analisada pela nossa equipe em até 1 dia útil."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-2">Motivo do cancelamento</p>
            <Select value={reason} onValueChange={(v) => v && setReason(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!reason || isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Enviando…" : isImmediate ? "Cancelar pedido" : "Enviar solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
