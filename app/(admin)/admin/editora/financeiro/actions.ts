"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MP_FEE_RATE: Record<string, number> = {
  pix: 0.0099,
  credito: 0.0499,
  debito: 0.0199,
  boleto: 0.0149,
};

async function fetchMPFee(paymentId: string): Promise<number> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return 0;
    const payment = await res.json();
    return (
      (payment.fee_details as Array<{ type: string; amount: number }> | null)
        ?.filter((f) => f.type === "mercadopago_fee")
        .reduce((sum, f) => sum + f.amount, 0) ?? 0
    );
  } catch {
    return 0;
  }
}

export async function backfillFinancialMovements(): Promise<{ count: number }> {
  const supabase = await createAdminClient();

  // IDs que já existem na tabela de movimentações
  const { data: existing } = await supabase
    .from("financial_movements")
    .select("order_id");
  const synced = new Set((existing ?? []).map((m) => m.order_id as string));

  // Pedidos pagos que ainda não têm movimentação
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, discount, shipping_cost, payment_method, affiliate_id, notes, updated_at")
    .eq("payment_status", "aprovado");

  const pending = (orders ?? []).filter((o) => !synced.has(o.id));
  if (!pending.length) {
    revalidatePath("/admin/editora/financeiro");
    return { count: 0 };
  }

  let count = 0;
  for (const order of pending) {
    // Taxa real do MP quando temos o payment ID nos notes
    let gatewayFee = 0;
    const mpMatch = (order.notes as string | null)?.match(/MP:(\d+)/);
    if (mpMatch) {
      gatewayFee = await fetchMPFee(mpMatch[1]);
    }
    // Fallback: taxa estimada pela forma de pagamento
    if (gatewayFee === 0 && order.payment_method) {
      const rate = MP_FEE_RATE[order.payment_method as string] ?? 0.03;
      gatewayFee = Math.round((order.total as number) * rate * 100) / 100;
    }

    // Comissão de afiliado (se registrada em affiliate_sales)
    let affiliateCommission = 0;
    if (order.affiliate_id) {
      const { data: sale } = await supabase
        .from("affiliate_sales")
        .select("commission_amount")
        .eq("order_id", order.id)
        .maybeSingle();
      if (sale) affiliateCommission = (sale.commission_amount as number) ?? 0;
    }

    const gross = order.total as number;
    const netAmount = gross - gatewayFee - affiliateCommission;

    const { error } = await supabase.from("financial_movements").insert({
      order_id: order.id,
      gross_amount: gross,
      discount: order.discount,
      shipping: order.shipping_cost,
      gateway_fee: gatewayFee,
      affiliate_commission: affiliateCommission,
      net_amount: netAmount,
      payment_method: order.payment_method,
      gateway: "mercadopago",
      gateway_transaction_id: mpMatch?.[1] ?? null,
      status: "pago",
      paid_at: order.updated_at,
    });

    if (!error) count++;
  }

  revalidatePath("/admin/editora/financeiro");
  revalidatePath("/admin/editora/financeiro/movimentacoes");
  return { count };
}
