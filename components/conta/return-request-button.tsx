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
import { requestReturnAction } from "@/app/(conta)/minha-conta/pedidos/[id]/actions";

const REASONS = [
  "Produto com defeito",
  "Produto diferente do anunciado",
  "Produto danificado no transporte",
  "Arrependimento de compra",
  "Recebi o produto errado",
  "Outro",
];

interface Props {
  orderId: string;
}

export function ReturnRequestButton({ orderId }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"reembolso" | "troca">("reembolso");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!reason) return;
    startTransition(async () => {
      const { error } = await requestReturnAction(orderId, type, reason);
      if (error) {
        toast.error(error);
        return;
      }
      setOpen(false);
      toast.success("Solicitação aberta. Nossa equipe entrará em contato em breve.");
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Solicitar devolução / troca
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Devolução ou troca</DialogTitle>
            <DialogDescription>
              Você tem até 30 dias após a compra para solicitar. Nossa equipe entrará em contato para orientar o processo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">O que deseja?</p>
              <div className="flex gap-2">
                <Button
                  variant={type === "reembolso" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setType("reembolso")}
                >
                  Reembolso
                </Button>
                <Button
                  variant={type === "troca" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setType("troca")}
                >
                  Troca
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Motivo</p>
              <Select value={reason} onValueChange={setReason}>
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
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button
              disabled={!reason || isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Enviando…" : "Abrir solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
