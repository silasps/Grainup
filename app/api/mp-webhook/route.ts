import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/email";

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
  const orderId: string | undefined = payment.external_reference;
  if (!orderId) return NextResponse.json({ ok: true });

  const supabase = await createAdminClient();

  if (payment.status === "approved") {
    await supabase
      .from("orders")
      .update({ status: "pago", payment_status: "aprovado", notes: `MP:${paymentId}` })
      .eq("id", orderId);

    // E-mail de confirmação (fire-and-forget)
    sendOrderConfirmationEmail(orderId).catch(console.error);
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await supabase
      .from("orders")
      .update({ payment_status: "recusado", notes: `MP:${paymentId}` })
      .eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
