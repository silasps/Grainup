import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Webhook isolado do de pedidos (/api/mp-webhook) — só processa pagamentos
// de upgrades de UX/design (external_reference começando com "ux:"), nunca
// toca em orders/financial_movements. Mantém o webhook crítico de vendas
// livre de qualquer risco de regressão vindo dessa feature.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || body.type !== "payment") return NextResponse.json({ ok: true });

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: 500 });

  const payment = await res.json();
  const ref: string | undefined = payment.external_reference;
  if (!ref?.startsWith("ux:")) return NextResponse.json({ ok: true });

  const upgradeKey = ref.slice(3);
  if (payment.status !== "approved") return NextResponse.json({ ok: true });

  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("ux_upgrade_activations")
    .upsert(
      {
        upgrade_key: upgradeKey,
        purchased_at: payment.date_approved ?? new Date().toISOString(),
        payment_id: String(paymentId),
        frozen_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "upgrade_key" }
    );

  return NextResponse.json({ ok: true });
}
