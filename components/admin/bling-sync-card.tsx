"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Package, Send } from "lucide-react";
import { syncBlingOrderAction, pushOrderToBlingAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import { toast } from "sonner";

interface Props {
  orderId: string;
  blingOrderId: number | null;
  initialSituacao?: string | null;
}

export function BlingSyncCard({ orderId, blingOrderId: initialBlingOrderId, initialSituacao }: Props) {
  const [loading, setLoading] = useState(false);
  const [blingOrderId, setBlingOrderId] = useState(initialBlingOrderId);
  const [situacao, setSituacao] = useState(initialSituacao ?? null);
  const [synced, setSynced] = useState(false);

  async function handleSync() {
    setLoading(true);
    const result = await syncBlingOrderAction(orderId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.situacao) setSituacao(result.situacao);
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
    // Recarrega a página para buscar o novo bling_order_id
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
              href={`https://www.bling.com.br/vendas.php#list/page=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs hover:underline text-foreground"
            >
              #{blingOrderId}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>

          {situacao && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Situação</span>
              <span className="flex items-center gap-1 text-xs font-medium">
                {synced ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : null}
                {situacao}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Pedido ainda não registrado no Bling.</span>
        </div>
      )}
    </div>
  );
}
