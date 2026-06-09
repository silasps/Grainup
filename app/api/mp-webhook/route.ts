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
      .select("total, subtotal, discount, shipping_cost, payment_method, affiliate_id, coupon_code")
      .eq("id", orderId)
      .single();

    if (order) {
      // Taxa real cobrada pelo MercadoPago (fee_details pode ter múltiplas entradas)
      const gatewayFee: number =
        (payment.fee_details as Array<{ type: string; amount: number }> | null)
          ?.filter((f) => f.type === "mercadopago_fee")
          .reduce((sum: number, f: { amount: number }) => sum + f.amount, 0) ?? 0;

      // Comissão de afiliado: baseada em cupom (margem de 50%)
      // - cupom < 50%: afiliado ganha (50 - desconto)% do subtotal
      // - cupom > 50%: afiliado paga (desconto - 50)% do saldo
      let affiliateCommission = 0; // positivo = ganho, negativo = débito
      if (order.affiliate_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: affiliate } = await (supabase as any)
          .from("affiliates")
          .select("id, balance, balance_pending, type, total_confirmed_sales")
          .eq("id", order.affiliate_id)
          .single() as { data: { id: string; balance: number; balance_pending: number; type: string; total_confirmed_sales: number } | null };

        if (affiliate) {
          // Margem dinâmica: 50% fixo para jocum/diretor; progressiva para geral
          const getMargin = (type: string, sales: number) => {
            if (type !== "geral") return 50;
            if (sales >= 100) return 50;
            if (sales >= 50)  return 45;
            if (sales >= 25)  return 40;
            if (sales >= 10)  return 35;
            return 30;
          };
          const MARGIN = getMargin(
            (affiliate as unknown as { type: string }).type,
            (affiliate as unknown as { total_confirmed_sales: number }).total_confirmed_sales ?? 0
          );
          let discountPct = 0;

          if (order.coupon_code) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: coupon } = await (supabase as any)
              .from("affiliate_coupons")
              .select("discount_percent")
              .eq("code", order.coupon_code)
              .eq("affiliate_id", affiliate.id)
              .single() as { data: { discount_percent: number } | null };
            if (coupon) discountPct = coupon.discount_percent;
          }

          const earnPct = MARGIN - discountPct; // positivo = ganho, negativo = débito
          affiliateCommission = Math.round((earnPct / 100) * order.subtotal * 100) / 100;

          // Idempotência: não duplicar se o webhook disparar duas vezes
          const { data: existingSale } = await supabase
            .from("affiliate_sales")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existingSale) {
            await supabase.from("affiliate_sales").insert({
              affiliate_id: affiliate.id,
              order_id: orderId,
              commission_amount: affiliateCommission,
              commission_rate: earnPct,
              status: "pendente",
            });

            if (affiliateCommission >= 0) {
              await supabase.from("affiliates")
                .update({ balance_pending: affiliate.balance_pending + affiliateCommission })
                .eq("id", affiliate.id);
            } else {
              const debit = Math.abs(affiliateCommission);
              await supabase.from("affiliates")
                .update({ balance: Math.max(0, affiliate.balance - debit) })
                .eq("id", affiliate.id);
            }

            if (order.coupon_code) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.rpc as any)("increment_coupon_uses", { p_code: order.coupon_code });
            }

            // Incrementa contador de vendas confirmadas (base para tier geral)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("affiliates")
              .update({ total_confirmed_sales: (affiliate.total_confirmed_sales ?? 0) + 1 })
              .eq("id", affiliate.id);

            // Confirma as vendas pendentes → confirmada
            await supabase.from("affiliate_sales").update({ status: "confirmada" })
              .eq("affiliate_id", affiliate.id).eq("status", "pendente");

            // Move saldo pendente → disponível
            if (affiliateCommission > 0) {
              await supabase.from("affiliates").update({
                balance: affiliate.balance + affiliateCommission,
                balance_pending: Math.max(0, affiliate.balance_pending - affiliateCommission),
              }).eq("id", affiliate.id);
            }
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

      if (!existing) {
        // Decrementar estoque — só na primeira vez (idempotência via financial_movements)
        const { data: items } = await supabase
          .from("order_items")
          .select("book_id, combo_id, quantity")
          .eq("order_id", orderId);

        if (items && items.length > 0) {
          for (const item of items) {
            if (item.book_id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.rpc as any)("decrement_book_stock", { p_book_id: item.book_id, p_qty: item.quantity });
            } else if (item.combo_id) {
              const { data: comboBooks } = await supabase
                .from("combo_items")
                .select("book_id, quantity")
                .eq("combo_id", item.combo_id);
              for (const cb of comboBooks ?? []) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.rpc as any)("decrement_book_stock", { p_book_id: cb.book_id, p_qty: item.quantity * cb.quantity });
              }
            }
          }
        }
      }

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
