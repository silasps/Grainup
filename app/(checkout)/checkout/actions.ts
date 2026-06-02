"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { trackBookEvent } from "@/lib/actions/track-event";

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

function normalizeNullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function placeOrderAction(input: PlaceOrderInput) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createAdminClient();
  const customerName = normalizeNullable(input.customerName) ?? user.email?.split("@")[0] ?? "Cliente";
  const customerCpf = input.customerCpf.replace(/\D/g, "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cpf, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("profiles").upsert(
    {
      id: profile?.id ?? crypto.randomUUID(),
      user_id: user.id,
      full_name: profile?.full_name ?? customerName,
      phone: profile?.phone ?? null,
      cpf: customerCpf || profile?.cpf || null,
      avatar_url: profile?.avatar_url ?? null,
    },
    { onConflict: "user_id" }
  );

  const normalizedAddress = {
    cep: input.shippingAddress.cep,
    street: input.shippingAddress.street,
    number: input.shippingAddress.number,
    complement: input.shippingAddress.complement,
    neighborhood: input.shippingAddress.neighborhood,
    city: input.shippingAddress.city,
    state: input.shippingAddress.state.toUpperCase(),
  };

  const { data: existingAddresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id);

  const addresses = existingAddresses ?? [];
  const duplicate = addresses.find((address) =>
    address.zip_code === normalizedAddress.cep &&
    address.street === normalizedAddress.street &&
    address.number === normalizedAddress.number &&
    (address.complement ?? "") === (normalizedAddress.complement ?? "") &&
    address.neighborhood === normalizedAddress.neighborhood &&
    address.city === normalizedAddress.city &&
    address.state === normalizedAddress.state
  );

  if (!duplicate) {
    await supabase.from("addresses").insert({
      user_id: user.id,
      label: addresses.length === 0 ? "Principal" : null,
      full_name: customerName,
      zip_code: normalizedAddress.cep,
      street: normalizedAddress.street,
      number: normalizedAddress.number,
      complement: normalizedAddress.complement,
      neighborhood: normalizedAddress.neighborhood,
      city: normalizedAddress.city,
      state: normalizedAddress.state,
      is_default: addresses.length === 0,
    });
  } else if (!addresses.some((address) => address.is_default)) {
    await supabase.from("addresses").update({ is_default: true }).eq("id", duplicate.id);
  }

  // order_number é omitido do tipo Insert gerado, mas pode ser passado para sobrescrever o DEFAULT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    order_number: generateOrderNumber(),
    user_id: user.id,
    customer_email: input.customerEmail,
    customer_name: customerName,
    customer_cpf: customerCpf || null,
    shipping_address: normalizedAddress,
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

  // Registra evento de purchase para livros (fire-and-forget)
  const bookItems = input.items.filter((i) => i.type === "book");
  await Promise.allSettled(
    bookItems.map((item) => trackBookEvent(item.id, "purchase"))
  );

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
