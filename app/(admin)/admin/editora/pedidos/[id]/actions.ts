"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { pushOrderToBling } from "@/lib/bling";

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

  const mpId = typeof order.notes === "string" && order.notes.startsWith("MP:")
    ? order.notes.slice(3)
    : null;

  if (!mpId) return { status: "sem_id", message: "Nenhum ID de pagamento MP registrado neste pedido." };

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) return { status: "erro", message: `Erro ao consultar MP: ${res.status}` };

  const payment = await res.json() as { status?: string };

  if (payment.status === "approved") {
    await supabase
      .from("orders")
      .update({ status: "pago", payment_status: "aprovado" })
      .eq("id", orderId);

    sendOrderConfirmationEmail(orderId).catch(console.error);
    pushOrderToBling(orderId).catch((err) => console.error("[Bling]", err));

    return { status: "aprovado", message: "Pagamento confirmado e pedido atualizado." };
  }

  if (payment.status === "rejected" || payment.status === "cancelled") {
    await supabase
      .from("orders")
      .update({ payment_status: "recusado" })
      .eq("id", orderId);
    return { status: "recusado", message: "Pagamento recusado pelo MP. Status do pedido mantido para revisão manual." };
  }

  return { status: "pendente", message: `Status no MP: ${payment.status ?? "desconhecido"}` };
}
