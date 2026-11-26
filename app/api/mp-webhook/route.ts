import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processApprovedPayment } from "@/lib/orders/process-approved-payment";
import { fetchMpPayment } from "@/lib/mercadopago/payments";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || body.type !== "payment") return NextResponse.json({ ok: true });

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  // Nunca confia no corpo do webhook: o status vem da consulta direta à API do MP.
  let payment;
  try {
    payment = await fetchMpPayment(paymentId);
  } catch (e) {
    console.error("[mp-webhook] falha ao consultar MP:", e);
    // 500 faz o MP reenviar a notificação mais tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!payment) return NextResponse.json({ ok: true });

  const orderId = payment.external_reference ?? undefined;
  if (!orderId) return NextResponse.json({ ok: true });

  const supabase = await createAdminClient();

  if (payment.status === "approved") {
    const result = await processApprovedPayment(orderId, paymentId, payment);
    if (!result.ok) console.error(`[mp-webhook] pagamento ${paymentId} recusado pela verificação: ${result.reason}`);
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    // Só marca recusado se o pedido ainda não foi pago por outro pagamento (ex.: o cliente
    // gerou um Pix novo e pagou; o antigo expira como "cancelled" depois).
    await supabase
      .from("orders")
      .update({ payment_status: "recusado", notes: `MP:${paymentId}` })
      .eq("id", orderId)
      .neq("payment_status", "aprovado");
  }

  return NextResponse.json({ ok: true });
}
