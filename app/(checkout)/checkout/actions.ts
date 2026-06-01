"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

interface OrderItem {
  id: string;
  type: "book" | "combo";
  title: string;
  price: number;
  quantity: number;
}

interface PlaceOrderInput {
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  shippingAddress: {
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: "pix" | "credito" | "debito" | null;
  items: OrderItem[];
}

function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `GU${ts}${rand}`;
}

export async function placeOrderAction(input: PlaceOrderInput) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createAdminClient();

  // order_number é omitido do tipo Insert gerado, mas pode ser passado para sobrescrever o DEFAULT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    order_number: generateOrderNumber(),
    user_id: user.id,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    customer_cpf: input.customerCpf || null,
    shipping_address: input.shippingAddress,
    subtotal: input.subtotal,
    discount: input.discount,
    shipping_cost: input.shippingCost,
    total: input.total,
    status: "aguardando_pagamento",
    payment_status: "pendente",
    payment_method: input.paymentMethod,
    fiscal_status: "nao_emitida",
    affiliate_id: null,
    coupon_code: null,
    notes: null,
    tracking_code: null,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(payload)
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("placeOrderAction — orders insert:", orderError);
    return { error: orderError?.message ?? "Erro ao criar pedido." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      book_id: item.type === "book" ? item.id : null,
      combo_id: item.type === "combo" ? item.id : null,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }))
  );

  if (itemsError) {
    console.error("placeOrderAction — order_items insert:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: itemsError.message ?? "Erro ao salvar itens do pedido." };
  }

  if (input.customerCpf) {
    await supabase
      .from("profiles")
      .update({ cpf: input.customerCpf })
      .eq("user_id", user.id)
      .is("cpf", null);
  }

  return { error: null, orderNumber: order.order_number, orderId: order.id };
}

export async function confirmPixPaymentAction(orderId: string) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "pago", payment_status: "aprovado" })
    .eq("id", orderId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}
