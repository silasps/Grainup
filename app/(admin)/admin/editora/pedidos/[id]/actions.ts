"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { processApprovedPayment } from "@/lib/orders/process-approved-payment";
import { verifyOrderPayment } from "@/lib/mercadopago/payments";

export async function adminSyncPaymentAction(orderId: string): Promise<{
  status: "aprovado" | "recusado" | "pendente" | "sem_id" | "erro";
  message: string;
}> {
  const supabase = await createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("payment_status, status")
    .eq("id", orderId)
    .single();

  if (!order) return { status: "erro", message: "Pedido não encontrado." };
  if (order.payment_status === "aprovado") return { status: "aprovado", message: "Pagamento já estava aprovado." };

  // Consulta o MP pelo ID registrado no pedido e, se preciso, por todos os pagamentos
  // ligados a ele (external_reference) — cobre Pix gerado de novo na tela de nova tentativa.
  const verification = await verifyOrderPayment(orderId);

  if (verification.transient) {
    return { status: "erro", message: `Não foi possível consultar o Mercado Pago agora: ${verification.reason}` };
  }

  if (verification.verified && verification.payment) {
    const result = await processApprovedPayment(orderId, verification.payment.id, verification.payment);
    if (!result.ok) return { status: "erro", message: `Pagamento não aceito: ${result.reason}` };
    revalidatePath(`/admin/editora/pedidos/${orderId}`);
    return { status: "aprovado", message: "Pagamento confirmado no Mercado Pago e pedido atualizado." };
  }

  // Consistência (comportamento anterior, agora só depois de confirmar no MP que não há
  // pagamento aprovado): payment_status já recusado mas pedido ainda não cancelado.
  if (order.payment_status === "recusado") {
    if (order.status !== "cancelado") {
      await supabase.from("orders").update({ status: "cancelado" }).eq("id", orderId).neq("payment_status", "aprovado");
      revalidatePath(`/admin/editora/pedidos/${orderId}`);
      return { status: "recusado", message: "Pedido cancelado." };
    }
    return { status: "recusado", message: "Pagamento já recusado." };
  }

  if (!verification.payment) {
    return { status: "sem_id", message: "Nenhum pagamento encontrado no Mercado Pago para este pedido." };
  }

  const mpStatus = verification.payment.status;
  if (mpStatus === "rejected" || mpStatus === "cancelled") {
    await supabase
      .from("orders")
      .update({ payment_status: "recusado" })
      .eq("id", orderId)
      .neq("payment_status", "aprovado");
    return { status: "recusado", message: "Pagamento recusado/expirado. O pedido permanece aberto por 24h para nova tentativa." };
  }

  return {
    status: "pendente",
    message: `Pagamento NÃO confirmado: ${verification.reason ?? `status no MP: ${mpStatus ?? "desconhecido"}`}`,
  };
}
