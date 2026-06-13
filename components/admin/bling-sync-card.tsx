"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Package, Send, Unlink, TriangleAlert } from "lucide-react";
import { syncBlingOrderAction, pushOrderToBlingAction, resetBlingLinkAction } from "@/app/(admin)/admin/editora/pedidos/actions";
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

interface Props {
  orderId: string;
  blingOrderId: number | null;
  orderStatus?: string;
  initialSituacao?: string | null;
}

export function BlingSyncCard({ orderId, blingOrderId: initialBlingOrderId, orderStatus, initialSituacao }: Props) {
  const [loading, setLoading] = useState(false);
  const [blingOrderId, setBlingOrderId] = useState(initialBlingOrderId);
  const [situacao, setSituacao] = useState(initialSituacao ?? null);
  const [numeroBling, setNumeroBling] = useState<number | null>(null);
  const [synced, setSynced] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSync() {
    setLoading(true);
    const result = await syncBlingOrderAction(orderId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.situacao) setSituacao(result.situacao);
    if (result.numeroBling) setNumeroBling(result.numeroBling);
    setSynced(true);

    if (result.invoiceNumber) {
      toast.success("NF-e sincronizada com sucesso");
    } else {
      toast.info("Sincronizado — NF-e ainda não emitida no Bling");
    }
  }

  async function handlePush() {
    setLoading(true);
    const result = await pushOrderToBlingAction(orderId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Pedido enviado ao Bling com sucesso");
    window.location.reload();
  }

  async function confirmReset() {
    setConfirmOpen(false);
    setLoading(true);
    const result = await resetBlingLinkAction(orderId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Vínculo removido. Agora você pode reenviar o pedido ao Bling.");
    window.location.reload();
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Bling ERP</h3>
        </div>
        {blingOrderId ? (
          <button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        ) : (
          <button
            onClick={handlePush}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className={`h-3 w-3 ${loading ? "animate-pulse" : ""}`} />
            Enviar ao Bling
          </button>
        )}
      </div>

      {blingOrderId ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pedido Bling</span>
            <a
              href="https://www.bling.com.br/vendas.php"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs hover:underline text-foreground"
            >
              {numeroBling ? `Nº ${numeroBling}` : `ID ${blingOrderId}`}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>
          {!numeroBling && (
            <p className="text-[11px] text-amber-600">
              Clique em "Sincronizar" para obter o número do pedido no Bling.
            </p>
          )}

          {situacao && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Situação</span>
              <span className="flex items-center gap-1 text-xs font-medium">
                {synced ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : null}
                {situacao}
              </span>
            </div>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center mt-1"
          >
            <Unlink className="h-3 w-3" />
            Desvincular do Bling e apagar NF
          </button>
        </div>
      ) : orderStatus === "pago" || orderStatus === "separando" || orderStatus === "enviado" || orderStatus === "entregue" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Pedido pago sem registro no Bling</p>
              <p className="text-red-600 mt-0.5">Clique em "Enviar ao Bling" acima para registrar este pedido. Sem isso, nenhuma NF-e pode ser emitida.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Pedido ainda não registrado no Bling.</span>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <TriangleAlert className="h-5 w-5 shrink-0" />
              Desvincular do Bling
            </DialogTitle>
            <DialogDescription className="sr-only">Confirme a remoção do vínculo com o Bling</DialogDescription>
            <div className="space-y-3 pt-1 text-sm text-foreground">
              <p>Esta ação vai apagar os seguintes dados deste pedido:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Vínculo com o pedido de venda no Bling</li>
                <li>Número e link da nota fiscal salva</li>
              </ul>
              <p className="text-muted-foreground">
                Use isso quando o pedido no Bling foi deletado ou está incorreto e você precisa
                enviá-lo novamente do zero. Após desvincular, clique em{" "}
                <strong className="text-foreground">Enviar ao Bling</strong> para recriar o pedido.
              </p>
              <p className="font-medium text-red-600">
                Atenção: se houver uma NF-e válida emitida no Bling para este pedido, ela não será
                cancelada — apenas o vínculo na plataforma será removido.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReset} disabled={loading}>
              {loading ? "Removendo…" : "Sim, desvincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
