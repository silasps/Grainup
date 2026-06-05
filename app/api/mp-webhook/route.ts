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

    // Registrar movimentação financeira
    const { data: order } = await supabase
      .from("orders")
      .select("total, subtotal, discount, shipping_cost, payment_method, affiliate_id")
      .eq("id", orderId)
      .single();

    if (order) {
      // Taxa real cobrada pelo MercadoPago (fee_details pode ter múltiplas entradas)
      const gatewayFee: number =
        (payment.fee_details as Array<{ type: string; amount: number }> | null)
          ?.filter((f) => f.type === "mercadopago_fee")
          .reduce((sum: number, f: { amount: number }) => sum + f.amount, 0) ?? 0;

      // Comissão de afiliado: calculada sobre subtotal (sem frete)
      let affiliateCommission = 0;
      if (order.affiliate_id) {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id, commission_rate, balance_pending")
          .eq("id", order.affiliate_id)
          .single();

        if (affiliate) {
          affiliateCommission = Math.round((order.subtotal * affiliate.commission_rate / 100) * 100) / 100;

          // Idempotência: não duplicar se o webhook disparar duas vezes
          const { data: existingSale } = await supabase
            .from("affiliate_sales")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existingSale) {
            await Promise.all([
              supabase.from("affiliate_sales").insert({
                affiliate_id: affiliate.id,
                order_id: orderId,
                commission_amount: affiliateCommission,
                commission_rate: affiliate.commission_rate,
                status: "pendente",
              }),
              supabase.from("affiliates")
                .update({ balance_pending: affiliate.balance_pending + affiliateCommission })
                .eq("id", affiliate.id),
            ]);
          }
        }
      }

      const grossAmount = order.total; // total já inclui frete cobrado do cliente
      const netAmount = grossAmount - gatewayFee - affiliateCommission;

      // Busca se já existe movimentação para esse pedido (idempotência)
      const { data: existing } = await supabase
        .from("financial_movements")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("financial_movements")
          .update({
            gross_amount: grossAmount,
            discount: order.discount,
            shipping: order.shipping_cost,
            gateway_fee: gatewayFee,
            affiliate_commission: affiliateCommission,
            net_amount: netAmount,
            payment_method: order.payment_method,
            gateway: "mercadopago",
            gateway_transaction_id: String(paymentId),
            status: "pago",
            paid_at: payment.date_approved ?? new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("financial_movements").insert({
          order_id: orderId,
          gross_amount: grossAmount,
          discount: order.discount,
          shipping: order.shipping_cost,
          gateway_fee: gatewayFee,
          affiliate_commission: affiliateCommission,
          net_amount: netAmount,
          payment_method: order.payment_method,
          gateway: "mercadopago",
          gateway_transaction_id: String(paymentId),
          status: "pago",
          paid_at: payment.date_approved ?? new Date().toISOString(),
        });
      }
    }

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
