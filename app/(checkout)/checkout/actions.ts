"use server";

import { cookies } from "next/headers";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { trackBookEvent } from "@/lib/actions/track-event";
import { sendOrderConfirmationEmail } from "@/lib/email";

function getMpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
}

function isTestMode() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") ?? false;
}

function isPublicUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("https://") || (url.startsWith("http://") && !url.includes("localhost"));
}

// No sandbox do MP, o email do pagador precisa ser da conta vendedora ou um
// usuário de teste. O MERCADOPAGO_TEST_BUYER_EMAIL pode ser configurado manualmente;
// caso não esteja, busca o email da conta registrada no MP.
async function getSandboxPayerEmail(): Promise<string> {
  if (process.env.MERCADOPAGO_TEST_BUYER_EMAIL) {
    return process.env.MERCADOPAGO_TEST_BUYER_EMAIL;
  }
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    });
    if (!res.ok) return "test@testuser.com";
    const data = await res.json() as { email?: string };
    return data.email ?? "test@testuser.com";
  } catch {
    return "test@testuser.com";
  }
}

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
  shippingLabel?: string;
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

  // Affiliate tracking: read cookie set by /r/[code] redirect
  const cookieStore = await cookies();
  const affCode = cookieStore.get("aff")?.value ?? null;
  let affiliateId: string | null = null;
  if (affCode) {
    const { data: affLink } = await supabase
      .from("affiliate_links")
      .select("affiliate_id, affiliates!inner(status)")
      .eq("code", affCode)
      .single();
    const typedLink = affLink as { affiliate_id: string; affiliates: { status: string } } | null;
    if (typedLink?.affiliates?.status === "ativo") {
      affiliateId = typedLink.affiliate_id;
    }
  }
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
    shipping_address: input.shippingLabel ? { ...normalizedAddress, method: input.shippingLabel } : normalizedAddress,
    subtotal: input.subtotal,
    discount: input.discount,
    shipping_cost: input.shippingCost,
    total: input.total,
    status: "aguardando_pagamento",
    payment_status: "pendente",
    payment_method: input.paymentMethod,
    fiscal_status: "nao_emitida",
    affiliate_id: affiliateId,
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
      combo_id: item.type === "combo" ? item.id.replace(/^combo-/, "") : null,
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

export async function createMpPixPaymentAction(input: {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerEmail: string;
  customerCpf: string;
  customerName: string;
}) {
  try {
    const paymentClient = new Payment(getMpClient());
    const [firstName, ...rest] = input.customerName.trim().split(" ");

    // No sandbox do MP, o email do pagador precisa ser um usuário de teste.
    // Em produção, o email real do cliente é usado normalmente.
    const payerEmail = isTestMode()
      ? await getSandboxPayerEmail()
      : input.customerEmail;

    const result = await paymentClient.create({
      body: {
        transaction_amount: Math.round(input.amount * 100) / 100,
        description: `Pedido ${input.orderNumber} - Editora JOCUM`,
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
          identification: { type: "CPF", number: input.customerCpf },
        },
        external_reference: input.orderId,
        ...(isPublicUrl() && { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mp-webhook` }),
      },
    });

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

    const supabase = await createAdminClient();
    await supabase.from("orders").update({ notes: `MP:${result.id}` }).eq("id", input.orderId);

    return { error: null, qrCode, qrCodeBase64 };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.error("createMpPixPaymentAction:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
    return { error: "Erro ao gerar o PIX. Tente novamente." };
  }
}

export async function createMpCardPaymentAction(input: {
  orderId: string;
  orderNumber: string;
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId: string;
  amount: number;
  customerEmail: string;
  customerCpf: string;
  customerName: string;
}) {
  try {
    const paymentClient = new Payment(getMpClient());
    const [firstName, ...rest] = input.customerName.trim().split(" ");
    const payerEmail = isTestMode()
      ? await getSandboxPayerEmail()
      : input.customerEmail;
    const result = await paymentClient.create({
      body: {
        transaction_amount: Math.round(input.amount * 100) / 100,
        token: input.token,
        installments: input.installments,
        payment_method_id: input.paymentMethodId,
        issuer_id: Number(input.issuerId) || undefined,
        description: `Pedido ${input.orderNumber} - Editora JOCUM`,
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
          identification: { type: "CPF", number: input.customerCpf },
        },
        external_reference: input.orderId,
        ...(isPublicUrl() && { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mp-webhook` }),
      },
    });

    const supabase = await createAdminClient();

    if (result.status === "approved") {
      await supabase
        .from("orders")
        .update({ status: "pago", payment_status: "aprovado", notes: `MP:${result.id}` })
        .eq("id", input.orderId);
      sendOrderConfirmationEmail(input.orderId).catch(console.error);
      return { error: null, status: "approved" as const };
    }

    if (result.status === "in_process" || result.status === "pending") {
      await supabase
        .from("orders")
        .update({ notes: `MP:${result.id}` })
        .eq("id", input.orderId);
      return { error: null, status: "pending" as const };
    }

    return { error: result.status_detail ?? "Pagamento recusado.", status: result.status as string };
  } catch (err) {
    console.error("createMpCardPaymentAction:", err);
    return { error: "Erro ao processar o pagamento. Tente novamente.", status: "error" as const };
  }
}

export async function checkOrderPaymentStatusAction(orderId: string) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { paymentStatus: null };

  const supabase = await createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("payment_status, notes")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { paymentStatus: null };

  // Se já confirmado pelo webhook, retorna direto
  if (order.payment_status === "aprovado") return { paymentStatus: "aprovado" };

  // Sem webhook (localhost), consulta o MP diretamente
  const mpId = typeof order.notes === "string" && order.notes.startsWith("MP:")
    ? order.notes.slice(3)
    : null;

  if (mpId) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    });
    if (res.ok) {
      const payment = await res.json() as { status?: string };
      if (payment.status === "approved") {
        await supabase
          .from("orders")
          .update({ status: "pago", payment_status: "aprovado" })
          .eq("id", orderId);
        return { paymentStatus: "aprovado" };
      }
    }
  }

  return { paymentStatus: order.payment_status ?? null };
}

// Apenas sandbox — força aprovação para testar o fluxo completo sem pagar de verdade
export async function simulatePixApprovedAction(orderId: string) {
  if (!isTestMode()) return { error: "Disponível apenas em modo teste." };

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const supabase = await createAdminClient();
  await supabase
    .from("orders")
    .update({ status: "pago", payment_status: "aprovado" })
    .eq("id", orderId)
    .eq("user_id", user.id);

  sendOrderConfirmationEmail(orderId).catch(console.error);
  return { error: null };
}
