"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendCancellationRequestedEmail,
  sendCancellationAdminNotifyEmail,
} from "@/lib/email";
import type { OrderStatus } from "@/types/database";

const CANCELLABLE_STATUSES: OrderStatus[] = ["aguardando_pagamento", "pago", "separando"];
const RETURNABLE_STATUSES: OrderStatus[] = ["enviado", "entregue"];

export async function requestCancellationAction(
  orderId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { error: "Pedido não encontrado" };

  const currentStatus = order.status as OrderStatus;
  if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
    return { error: "Este pedido não pode ser cancelado" };
  }

  const adminClient = await createAdminClient();
  const isImmediate = currentStatus === "aguardando_pagamento";
  const newStatus: OrderStatus = isImmediate ? "cancelado" : "cancelamento_solicitado";
  const cancellationStatus = isImmediate ? "aprovado" : "pendente";

  const { error: updateErr } = await adminClient
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);
  if (updateErr) return { error: updateErr.message };

  await adminClient.from("order_cancellations").insert({
    order_id: orderId,
    initiated_by: "customer",
    initiated_by_id: user.id,
    previous_status: currentStatus,
    reason,
    status: cancellationStatus,
    refund_amount: null,
    refund_status: "nao_aplicavel",
  });

  if (!isImmediate) {
    sendCancellationRequestedEmail(
      order.customer_email as string,
      order.customer_name as string,
      order.order_number as string,
    ).catch(console.error);
    sendCancellationAdminNotifyEmail(
      order.order_number as string,
      order.customer_name as string,
      reason,
    ).catch(console.error);
  }

  revalidatePath(`/minha-conta/pedidos/${orderId}`);
  return { error: null };
}

export async function requestReturnAction(
  orderId: string,
  type: "reembolso" | "troca",
  reason: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email, created_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { error: "Pedido não encontrado" };
  if (!RETURNABLE_STATUSES.includes(order.status as OrderStatus)) {
    return { error: "Este pedido não está elegível para devolução" };
  }

  const createdAt = new Date(order.created_at as string);
  const daysSince = (Date.now() - createdAt.getTime()) / 86_400_000;
  if (daysSince > 30) {
    return { error: "O prazo de 30 dias para solicitação de devolução expirou" };
  }

  const adminClient = await createAdminClient();
  const subject = type === "reembolso" ? "Solicitação de devolução e reembolso" : "Solicitação de troca";
  const body = `Pedido: #${order.order_number}\nTipo: ${type === "reembolso" ? "Devolução e reembolso" : "Troca"}\nMotivo: ${reason}`;

  const { error } = await adminClient.from("support_tickets").insert({
    user_id: user.id,
    customer_name: order.customer_name as string,
    customer_email: order.customer_email as string,
    order_id: orderId,
    category: type === "reembolso" ? "devolucao" : "troca",
    subject,
    status: "novo",
  });

  if (error) return { error: error.message };

  // first message
  const { data: ticket } = await adminClient
    .from("support_tickets")
    .select("id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (ticket) {
    await adminClient.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_name: order.customer_name as string,
      body,
      is_admin: false,
    });
  }

  revalidatePath(`/minha-conta/pedidos/${orderId}`);
  return { error: null };
}
