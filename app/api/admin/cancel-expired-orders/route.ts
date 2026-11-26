import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyOrderPayment } from "@/lib/mercadopago/payments";
import { processApprovedPayment } from "@/lib/orders/process-approved-payment";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "aguardando_pagamento")
    .eq("payment_status", "recusado")
    .lt("created_at", cutoff);

  if (error) {
    console.error("[cancel-expired-orders]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  // Antes de cancelar, confere no Mercado Pago: um Pix gerado de novo (nova tentativa) pode
  // ter sido pago mesmo com uma tentativa anterior recusada/expirada. Pedido pago nunca é
  // cancelado aqui — é aprovado.
  const ids: string[] = [];
  let approved = 0;
  for (const o of expired) {
    const v = await verifyOrderPayment(o.id);
    if (v.transient) continue; // MP indisponível: decide no próximo ciclo
    if (v.verified && v.payment) {
      const r = await processApprovedPayment(o.id, v.payment.id, v.payment);
      if (r.ok) approved++;
      continue;
    }
    ids.push(o.id);
  }

  if (ids.length > 0) {
    await supabase
      .from("orders")
      .update({ status: "cancelado" })
      .in("id", ids)
      .neq("payment_status", "aprovado");
  }

  console.log(`[cancel-expired-orders] Cancelados ${ids.length} pedidos; ${approved} aprovados após conferência no MP`);
  return NextResponse.json({ cancelled: ids.length, approved });
}
