"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendReviewRequestEmail, sendCancellationApprovedEmail, sendCancellationDeniedEmail } from "@/lib/email";
import { getBlingOrderDetails, getBlingNfeByOrder, getBlingNfe, sendBlingNfe, generateBlingNfeFromOrder, findBlingNfeByChave } from "@/lib/bling";
import { pushOrderToBling } from "@/lib/bling/sync";
import { issueMpRefund } from "@/lib/mp-refund";
import type { OrderRow } from "@/components/admin/pedidos-table";
import type { OrderStatus } from "@/types/database";

export interface StatRow {
  status: string;
  total: number;
  shipping_cost: number;
  shipping_address: Record<string, string> | null;
}

export async function fetchOrdersAction(): Promise<OrderRow[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, payment_method, shipping_cost, created_at, customer_name, invoice_number, invoice_url, bling_order_id, tracking_code, shipping_address, nota_impressa, postagem_gerada, order_items(id, title, quantity, combo_id, books(sku), combos(combo_items(books(sku, title))))")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as OrderRow[];
}

export async function fetchStatsAction(): Promise<StatRow[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("status, total, shipping_cost, shipping_address");
  return (data ?? []) as unknown as StatRow[];
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: error.message };

  // Ao marcar como entregue → dispara email pedindo avaliação
  if (status === "entregue") {
    const { data: orderRaw } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_email, order_items(title, book_id, books(slug, cover_url))")
      .eq("id", orderId)
      .single();

    const order = orderRaw as unknown as {
      order_number: string;
      customer_name: string;
      customer_email: string;
      order_items: Array<{ title: string; book_id: string | null; books: { slug: string; cover_url: string | null } | null }>;
    } | null;

    if (order?.customer_email) {
      const books = (order.order_items ?? [])
        .filter((i) => i.book_id)
        .map((i) => ({ title: i.title, slug: i.books?.slug ?? "", coverUrl: i.books?.cover_url ?? null }));
      if (books.length > 0) {
        sendReviewRequestEmail(order.customer_email, order.customer_name, order.order_number, books).catch(console.error);
      }
    }
  }

  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  revalidatePath("/admin/editora/pedidos");
  return { error: null };
}

export async function updateInvoiceNumberAction(
  orderId: string,
  invoiceNumber: string
): Promise<{ error: string | null; invoiceUrl: string | null }> {
  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { invoice_number: invoiceNumber || null };
  let invoiceUrl: string | null = null;

  if (!invoiceNumber) {
    updates.invoice_url = null;
  } else {
    const digits = invoiceNumber.replace(/\D/g, "");
    if (digits.length === 44) {
      // Chave de acesso: busca o linkDanfe no Bling extraindo a data e número da chave
      try {
        const nfe = await findBlingNfeByChave(digits);
        if (nfe?.linkDanfe) { invoiceUrl = nfe.linkDanfe; updates.invoice_url = invoiceUrl; }
      } catch (e) { console.error("[Bling] findBlingNfeByChave falhou:", e); }
    }
  }

  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  revalidatePath("/admin/editora/pedidos");
  return { error: error?.message ?? null, invoiceUrl };
}

export async function syncBlingOrderAction(orderId: string): Promise<{
  situacao: string | null;
  numeroBling: number | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  error: string | null;
}> {
  const supabase = await createAdminClient();

  const { data: row } = await supabase
    .from("orders")
    .select("id, bling_order_id, bling_nfe_id")
    .eq("id", orderId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blingOrderId: number | null = (row as any)?.bling_order_id ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knownNfeId: number | null = (row as any)?.bling_nfe_id ?? null;
  if (!blingOrderId) {
    return { situacao: null, numeroBling: null, invoiceNumber: null, invoiceUrl: null, error: "Pedido ainda não foi enviado ao Bling." };
  }

  const blingOrder = await getBlingOrderDetails(blingOrderId);
  if (!blingOrder) {
    return { situacao: null, numeroBling: null, invoiceNumber: null, invoiceUrl: null, error: "Pedido não encontrado no Bling. Use 'Desvincular' e reenvie." };
  }

  // Se já sabemos o ID da NF-e (salvo no momento da criação em pushOrderToBling), consulta
  // diretamente por ID — nunca cria uma segunda nota. O vínculo pedido→notaFiscal do Bling
  // (usado por getBlingNfeByOrder) propaga com atraso, então não pode ser usado para decidir
  // se uma NF-e "não existe": ela pode só ainda não estar linkada, e criar outra duplicaria.
  let nfe = knownNfeId ? await getBlingNfe(knownNfeId) : await getBlingNfeByOrder(blingOrderId);

  if (knownNfeId && !nfe?.chaveAcesso) {
    // NF-e existe mas ainda não foi autorizada pelo SEFAZ (ou o envio anterior falhou) — reenvia a MESMA nota.
    try { await sendBlingNfe(knownNfeId); } catch { /* já transmitida ou em processamento */ }
    nfe = await getBlingNfe(knownNfeId);
  }

  // Fallback apenas quando NUNCA houve NF-e criada para este pedido. Antes de assumir isso,
  // espera alguns segundos e reconsulta bling_nfe_id — pushOrderToBling pode estar em
  // andamento (o pedido já foi criado no Bling e por isso este botão apareceu na tela, mas a
  // etapa de criar a NF-e ainda não terminou). Sem essa espera, clicar em "Sincronizar" logo
  // após o pedido aparecer cria uma segunda NF-e concorrente pelo endpoint antigo (gerar-nfe),
  // que não herda o valor do frete — foi exatamente isso que causou o incidente de 2026-07-30.
  if (!knownNfeId && !nfe) {
    let retryNfeId: number | null = null;
    for (let attempt = 0; !retryNfeId && attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { data: recheck } = await supabase.from("orders").select("bling_nfe_id").eq("id", orderId).single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retryNfeId = (recheck as any)?.bling_nfe_id ?? null;
    }

    if (retryNfeId) {
      nfe = await getBlingNfe(retryNfeId);
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const generated = await generateBlingNfeFromOrder(blingOrderId);
        if (generated) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("orders").update({ bling_nfe_id: generated.id }).eq("id", orderId);
          // Transmite ao SEFAZ e busca a chave de acesso
          try { await sendBlingNfe(generated.id); } catch { /* já transmitida */ }
          nfe = await getBlingNfe(generated.id);
        }
      } catch (genErr) {
        console.error("[Bling] gerar-nfe falhou:", genErr);
      }
    }
  }

  const invoiceNumber = nfe?.chaveAcesso || null;
  const invoiceUrl = nfe?.linkDanfe || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {};
  if (invoiceNumber) updates.invoice_number = invoiceNumber;
  if (invoiceUrl) updates.invoice_url = invoiceUrl;
  if (Object.keys(updates).length > 0) {
    await supabase.from("orders").update(updates).eq("id", orderId);
  }

  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  return { situacao: blingOrder.situacao?.nome ?? null, numeroBling: blingOrder.numero ?? null, invoiceNumber, invoiceUrl, error: null };
}

export async function resetBlingLinkAction(orderId: string): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({ bling_order_id: null, bling_nfe_id: null, invoice_number: null, invoice_url: null })
    .eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  return { error: null };
}

export async function pushOrderToBlingAction(orderId: string): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any).from("orders").select("bling_order_id").eq("id", orderId).single();
  if (row?.bling_order_id) return { error: "Pedido já registrado no Bling." };

  try {
    await pushOrderToBling(orderId);
    revalidatePath(`/admin/editora/pedidos/${orderId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao enviar ao Bling." };
  }
}

export async function updateTrackingCodeAction(
  orderId: string,
  trackingCode: string
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { tracking_code: trackingCode || null };
  if (trackingCode) updates.postagem_gerada = true;
  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  return { error: error?.message ?? null };
}

export async function markFulfillmentStepAction(
  orderId: string,
  step: "nota_impressa" | "postagem_gerada",
  value: boolean
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("orders").update({ [step]: value } as any).eq("id", orderId);
  return { error: error?.message ?? null };
}

export async function adminCancelOrderAction(
  orderId: string,
  reason: string,
  issueRefund: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email, total")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Pedido não encontrado" };

  let refundTransactionId: string | null = null;
  let refundStatus: "nao_aplicavel" | "processado" | "falhou" = "nao_aplicavel";

  if (issueRefund) {
    const { data: fm } = await supabase
      .from("financial_movements")
      .select("gateway_transaction_id")
      .eq("order_id", orderId)
      .not("gateway_transaction_id", "is", null)
      .limit(1)
      .single();

    if (fm?.gateway_transaction_id) {
      const result = await issueMpRefund(fm.gateway_transaction_id);
      refundStatus = result.success ? "processado" : "falhou";
      refundTransactionId = result.refundId ?? null;
      if (!result.success) console.error("[adminCancelOrderAction] reembolso falhou:", result.error);
    }
  }

  const newStatus: OrderStatus = issueRefund && refundStatus === "processado" ? "reembolsado" : "cancelado";

  await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

  await supabase.from("order_cancellations").insert({
    order_id: orderId,
    initiated_by: "admin",
    initiated_by_id: null,
    previous_status: order.status as OrderStatus,
    reason,
    status: "aprovado",
    reviewed_at: new Date().toISOString(),
    refund_amount: issueRefund ? (order.total as number) : null,
    refund_status: refundStatus,
    refund_transaction_id: refundTransactionId,
  });

  sendCancellationApprovedEmail(
    order.customer_email as string,
    order.customer_name as string,
    order.order_number as string,
    issueRefund ? (order.total as number) : 0,
  ).catch(console.error);

  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  revalidatePath("/admin/editora/pedidos");
  return { error: null };
}

export async function reviewCancellationAction(
  cancellationId: string,
  orderId: string,
  approve: boolean,
  adminNotes?: string,
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();

  const { data: cancellation } = await supabase
    .from("order_cancellations")
    .select("id, order_id, previous_status, refund_amount")
    .eq("id", cancellationId)
    .single();
  if (!cancellation) return { error: "Solicitação não encontrada" };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email, total")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Pedido não encontrado" };

  let refundTransactionId: string | null = null;
  let refundStatus: "nao_aplicavel" | "processado" | "falhou" = "nao_aplicavel";
  let newOrderStatus: OrderStatus = "cancelado";

  if (approve) {
    const { data: fm } = await supabase
      .from("financial_movements")
      .select("gateway_transaction_id")
      .eq("order_id", orderId)
      .not("gateway_transaction_id", "is", null)
      .limit(1)
      .single();

    if (fm?.gateway_transaction_id) {
      const result = await issueMpRefund(fm.gateway_transaction_id);
      refundStatus = result.success ? "processado" : "falhou";
      refundTransactionId = result.refundId ?? null;
    }
    newOrderStatus = refundStatus === "processado" ? "reembolsado" : "cancelado";
  } else {
    newOrderStatus = (cancellation.previous_status as OrderStatus) ?? "pago";
  }

  await supabase.from("orders").update({ status: newOrderStatus }).eq("id", orderId);

  await supabase.from("order_cancellations").update({
    status: approve ? "aprovado" : "negado",
    reviewed_at: new Date().toISOString(),
    admin_notes: adminNotes ?? null,
    refund_status: approve ? refundStatus : "nao_aplicavel",
    refund_transaction_id: refundTransactionId,
    refund_amount: approve ? (order.total as number) : null,
  }).eq("id", cancellationId);

  if (approve) {
    sendCancellationApprovedEmail(
      order.customer_email as string,
      order.customer_name as string,
      order.order_number as string,
      order.total as number,
    ).catch(console.error);
  } else {
    sendCancellationDeniedEmail(
      order.customer_email as string,
      order.customer_name as string,
      order.order_number as string,
      adminNotes,
    ).catch(console.error);
  }

  revalidatePath(`/admin/editora/pedidos/${orderId}`);
  revalidatePath("/admin/editora/pedidos");
  return { error: null };
}
