"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitBetaFeedback } from "@/lib/actions/beta-feedback";

export function BetaFeedbackButtonClient() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!message.trim()) return;
    startTransition(async () => {
      try {
        await submitBetaFeedback(pathname, message);
        toast.success("Sugestão enviada! Obrigado pelo feedback.");
        setMessage("");
        setOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error(`Não foi possível enviar: ${msg}`);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Enviar sugestão de melhoria"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand/30 transition-all hover:bg-brand/90 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <MessageSquarePlus className="h-4 w-4 flex-shrink-0" />
        <span>Sugerir melhoria</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugerir melhoria</DialogTitle>
            <DialogDescription>
              Você está em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {pathname}
              </code>
              . Descreva o que você gostaria de ver diferente nesta página.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Ex: Gostaria que a listagem tivesse filtro por data..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isPending}
          />

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
