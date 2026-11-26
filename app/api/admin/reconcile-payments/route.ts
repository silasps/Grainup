/**
 * Cron: concilia pedidos "aguardando pagamento" com o Mercado Pago.
 *
 * Rede de segurança pro webhook /api/mp-webhook. Em 2026-11 o webhook ficou meses sem
 * receber nada (a URL de notificação respondia 308 e o MP não segue redirect), e pedidos Pix
 * pagos ficaram presos — só eram aprovados se o comprador ficasse com a tela do checkout
 * aberta. Este cron consulta o MP direto e aprova (via processApprovedPayment, com todas as
 * verificações de valor/pedido) o que já foi pago, sem depender do webhook nem do navegador.
 *
 * Só olha pedidos recentes (JANELA_DIAS): o QR Code Pix expira em 24h, então depois disso
 * nenhum pagamento novo pode chegar. Pedidos antigos presos são tratados manualmente pelo
 * botão "Verificar pagamento no MP" no detalhe do pedido.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processApprovedPayment } from "@/lib/orders/process-approved-payment";
import { verifyOrderPayment } from "@/lib/mercadopago/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

const JANELA_DIAS = 3;
const BATCH_LIMIT = 40;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("status", "aguardando_pagamento")
    .in("payment_status", ["pendente", "recusado"])
    .like("notes", "MP:%")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("[reconcile-payments]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const approved: string[] = [];
  const blocked: string[] = [];
  const errors: string[] = [];

  for (const order of pending ?? []) {
    const v = await verifyOrderPayment(order.id);
    if (v.transient) {
      errors.push(`${order.order_number}: ${v.reason}`);
      continue;
    }
    if (!v.verified || !v.payment) {
      // Pagamento aprovado no MP mas recusado pela verificação (ex.: valor menor que o
      // pedido) — não aprova, só registra pra investigação.
      if (v.payment?.status === "approved") blocked.push(`${order.order_number}: ${v.reason}`);
      continue;
    }
    const result = await processApprovedPayment(order.id, v.payment.id, v.payment);
    if (result.ok) approved.push(order.order_number);
    else blocked.push(`${order.order_number}: ${result.reason}`);
  }

  if (approved.length) console.log(`[reconcile-payments] Aprovados pela conciliação: ${approved.join(", ")}`);
  if (blocked.length) console.error(`[reconcile-payments] BLOQUEADOS (pagamento não confere com o pedido): ${blocked.join(" | ")}`);
  if (errors.length) console.error(`[reconcile-payments] Falha ao consultar MP: ${errors.join(" | ")}`);

  return NextResponse.json({ ok: true, checked: pending?.length ?? 0, approved, blocked, errors });
}
