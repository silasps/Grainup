"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { processApprovedPayment } from "@/lib/orders/process-approved-payment";

export async function adminSyncPaymentAction(orderId: string): Promise<{
  status: "aprovado" | "recusado" | "pendente" | "sem_id" | "erro";
  message: string;
}> {
  const supabase = await createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("notes, payment_status, status")
    .eq("id", orderId)
    .single();

  if (!order) return { status: "erro", message: "Pedido não encontrado." };
  if (order.payment_status === "aprovado") return { status: "aprovado", message: "Pagamento já estava aprovado." };

  // Consistência: payment_status já recusado mas status ainda não cancelado
  if (order.payment_status === "recusado" && order.status !== "cancelado") {
    await supabase.from("orders").update({ status: "cancelado" }).eq("id", orderId);
    return { status: "recusado", message: "Pedido cancelado." };
  }
  if (order.payment_status === "recusado") {
    return { status: "recusado", message: "Pagamento já recusado." };
  }

  const mpId = typeof order.notes === "string" && order.notes.startsWith("MP:")
    ? order.notes.slice(3)
    : null;

  if (!mpId) return { status: "sem_id", message: "Nenhum ID de pagamento MP registrado neste pedido." };

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) return { status: "erro", message: `Erro ao consultar MP: ${res.status}` };

  const payment = await res.json() as {
    status?: string;
    fee_details?: Array<{ type: string; amount: number }> | null;
    date_approved?: string | null;
  };

  if (payment.status === "approved") {
    await processApprovedPayment(orderId, mpId, payment);
    return { status: "aprovado", message: "Pagamento confirmado e pedido atualizado." };
  }

  if (payment.status === "rejected" || payment.status === "cancelled") {
    await supabase
      .from("orders")
      .update({ payment_status: "recusado" })
      .eq("id", orderId);
    return { status: "recusado", message: "Pagamento recusado. O pedido permanece aberto por 24h para nova tentativa." };
  }

  return { status: "pendente", message: `Status no MP: ${payment.status ?? "desconhecido"}` };
}
