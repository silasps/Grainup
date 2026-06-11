"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewCancellationAction, adminCancelOrderAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import { AlertTriangle, XCircle } from "lucide-react";
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

const CANCEL_REASONS = [
  "Produto fora de estoque",
  "Erro no pedido",
  "Solicitação do cliente",
  "Problema de pagamento",
  "Endereço inválido",
  "Outro",
];

interface PendingCancellation {
  id: string;
  reason: string;
  created_at: string;
}

interface Props {
  orderId: string;
  orderStatus: string;
  pendingCancellation: PendingCancellation | null;
  isPaid: boolean;
}

export function CancellationReviewCard({ orderId, orderStatus, pendingCancellation, isPaid }: Props) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [adminCancelOpen, setAdminCancelOpen] = useState(false);
  const [denyNotes, setDenyNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [issueRefund, setIssueRefund] = useState(isPaid);
  const [isPending, startTransition] = useTransition();

  const isCancelRequested = orderStatus === "cancelamento_solicitado";
  const isCancelled = orderStatus === "cancelado" || orderStatus === "reembolsado";

  function handleApprove() {
    if (!pendingCancellation) return;
    startTransition(async () => {
      const { error } = await reviewCancellationAction(pendingCancellation.id, orderId, true);
      if (error) { toast.error(error); return; }
      setApproveOpen(false);
      toast.success("Cancelamento aprovado e reembolso iniciado.");
    });
  }

  function handleDeny() {
    if (!pendingCancellation) return;
    startTransition(async () => {
      const { error } = await reviewCancellationAction(pendingCancellation.id, orderId, false, denyNotes);
      if (error) { toast.error(error); return; }
      setDenyOpen(false);
      toast.success("Solicitação negada. Cliente notificado.");
    });
  }

  function handleAdminCancel() {
    if (!cancelReason) return;
    startTransition(async () => {
      const { error } = await adminCancelOrderAction(orderId, cancelReason, issueRefund);
      if (error) { toast.error(error); return; }
      setAdminCancelOpen(false);
      toast.success(issueRefund ? "Pedido cancelado e reembolso iniciado." : "Pedido cancelado.");
    });
  }

  if (isCancelled) return null;

  return (
    <>
      {isCancelRequested && pendingCancellation && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-900">Cancelamento solicitado</h3>
          </div>
          <p className="text-sm text-orange-700">
            <span className="font-medium">Motivo:</span> {pendingCancellation.reason}
          </p>
          <p className="text-xs text-orange-500">
            {new Date(pendingCancellation.created_at).toLocaleString("pt-BR")}
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => setApproveOpen(true)} disabled={isPending}>
              Aprovar e reembolsar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDenyOpen(true)} disabled={isPending} className="text-destructive border-destructive/30 hover:bg-destructive/5">
              Negar
            </Button>
          </div>
        </div>
      )}

      {!isCancelRequested && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Cancelar pedido</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setAdminCancelOpen(true)}
          >
            Cancelar este pedido
          </Button>
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aprovar cancelamento</DialogTitle>
            <DialogDescription>
              O pedido será cancelado e o reembolso enviado automaticamente via Mercado Pago.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setApproveOpen(false)} disabled={isPending}>Voltar</Button>
            <Button onClick={handleApprove} disabled={isPending}>
              {isPending ? "Processando…" : "Confirmar e reembolsar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny dialog */}
      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Negar cancelamento</DialogTitle>
            <DialogDescription>O cliente será notificado por e-mail.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-2">Motivo (opcional, será enviado ao cliente)</p>
            <textarea
              className="w-full border border-border rounded-md p-3 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Ex: Pedido já em processo de separação…"
              value={denyNotes}
              onChange={(e) => setDenyNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDenyOpen(false)} disabled={isPending}>Voltar</Button>
            <Button variant="destructive" onClick={handleDeny} disabled={isPending}>
              {isPending ? "Enviando…" : "Negar solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin cancel dialog */}
      <Dialog open={adminCancelOpen} onOpenChange={setAdminCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>O cliente será notificado por e-mail.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Motivo do cancelamento</p>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isPaid && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="issue-refund"
                  checked={issueRefund}
                  onChange={(e) => setIssueRefund(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="issue-refund" className="text-sm">
                  Emitir reembolso automático via MP
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAdminCancelOpen(false)} disabled={isPending}>Voltar</Button>
            <Button variant="destructive" onClick={handleAdminCancel} disabled={!cancelReason || isPending}>
              {isPending ? "Processando…" : "Cancelar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
