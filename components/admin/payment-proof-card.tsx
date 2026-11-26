import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentSyncButton } from "@/components/admin/payment-sync-button";
import { fetchMpAccount, pixEndToEndId, verifyOrderPayment } from "@/lib/mercadopago/payments";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * Rastreio do pagamento: consulta o Mercado Pago ao vivo e mostra a prova do recebimento
 * (ID do pagamento, ID fim-a-fim do Pix, conta recebedora, valor líquido, liberação).
 * Também alerta quando o status do pedido e o do MP não batem.
 */
export async function PaymentProofCard({
  orderId,
  paymentStatus,
  orderStatus,
}: {
  orderId: string;
  paymentStatus: string | null;
  orderStatus: string;
}) {
  const [v, account] = await Promise.all([verifyOrderPayment(orderId), fetchMpAccount()]);
  const p = v.payment;
  const dbApproved = paymentStatus === "aprovado";
  const fee = p?.fee_details?.reduce((sum, f) => sum + (f.amount ?? 0), 0) ?? 0;
  const e2e = p ? pixEndToEndId(p) : null;
  const accountLabel = account?.nickname ?? (p?.collector_id ? `#${p.collector_id}` : null);

  let tone: "ok" | "warn" | "danger" | "neutral";
  let title: string;
  let message: string | null = null;

  if (v.transient) {
    tone = "neutral";
    title = "Não foi possível consultar o Mercado Pago agora";
    message = "Recarregue a página em instantes.";
  } else if (v.verified && dbApproved) {
    tone = "ok";
    title = "Pagamento confirmado pelo Mercado Pago";
  } else if (v.verified && !dbApproved) {
    tone = "warn";
    title = "Pago no Mercado Pago, mas o pedido não foi atualizado";
    message = "Clique em “Verificar pagamento no MP” para registrar o pagamento.";
  } else if (dbApproved) {
    tone = "danger";
    title = v.reversed ? "Pagamento estornado no Mercado Pago" : "Pedido marcado como pago, mas o Mercado Pago NÃO confirma";
    message = `${v.reason ?? "Sem detalhe."} Não emita nota fiscal nem envie antes de conferir.`;
  } else if (orderStatus !== "aguardando_pagamento" && orderStatus !== "cancelado") {
    tone = "danger";
    title = "Pedido avançou sem pagamento confirmado";
    message = `${v.reason ?? "Sem detalhe."} Confira no Mercado Pago antes de emitir nota ou enviar.`;
  } else {
    tone = "neutral";
    title = "Pagamento ainda não confirmado";
    message = v.reason;
  }

  const toneClass = {
    ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    neutral: "bg-muted/50 border-border text-foreground",
  }[tone];
  const Icon = { ok: CheckCircle2, warn: AlertTriangle, danger: XCircle, neutral: HelpCircle }[tone];

  const rows: Array<[string, string | null, boolean?]> = p
    ? [
        ["ID do pagamento (MP)", String(p.id), true],
        ["ID Pix (fim-a-fim)", e2e, true],
        ["Status no MP", [p.status, p.status_detail].filter(Boolean).join(" / ") || null],
        ["Valor pago", p.transaction_amount != null ? formatCurrency(p.transaction_amount) : null],
        ["Taxa Mercado Pago", fee ? formatCurrency(fee) : null],
        ["Valor líquido recebido", p.transaction_details?.net_received_amount != null ? formatCurrency(p.transaction_details.net_received_amount) : null],
        ["Aprovado em", p.date_approved ? formatDateTime(p.date_approved) : null],
        [
          "Dinheiro na conta",
          p.status === "approved"
            ? p.money_release_status === "released"
              ? "Liberado (disponível no saldo)"
              : p.money_release_date
                ? `A liberar em ${formatDateTime(p.money_release_date)}`
                : "A liberar"
            : null,
        ],
        ["Conta recebedora", accountLabel ? `Mercado Pago · ${accountLabel}` : null],
      ]
    : [];

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-3">
      <h3 className="text-sm font-semibold">Comprovação do pagamento</h3>

      <div className={cn("flex gap-2 px-3 py-2 rounded-lg border text-sm", toneClass)}>
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-medium">{title}</p>
          {message && <p className="text-xs opacity-90">{message}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="text-sm divide-y divide-border">
          {rows
            .filter(([, value]) => value)
            .map(([label, value, mono]) => (
              <div key={label} className="py-1.5 flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn("font-medium break-all", mono && "font-mono text-xs")}>{value}</dd>
              </div>
            ))}
        </dl>
      )}

      {v.verified && !dbApproved && <PaymentSyncButton orderId={orderId} />}

      {p?.payment_method_id === "pix" && p.status === "approved" && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pix recebido pelo Mercado Pago entra no <strong>saldo da conta Mercado Pago</strong> acima, não direto
          no banco. Para achar: app do Mercado Pago → Atividade → busque pelo ID do pagamento. Para levar ao
          banco, é preciso transferir/retirar o saldo.
        </p>
      )}
    </div>
  );
}

export function PaymentProofCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
