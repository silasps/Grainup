"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendReviewRequestEmail } from "@/lib/email";
import { getBlingOrderDetails, getBlingNfeByOrder } from "@/lib/bling";
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
    .select("id, order_number, status, total, payment_method, shipping_cost, created_at, customer_name, invoice_number, bling_order_id, shipping_address, order_items(id, title, quantity, combo_id, books(sku), combos(combo_items(books(sku, title))))")
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
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ invoice_number: invoiceNumber || null } as any)
    .eq("id", orderId);
  return { error: error?.message ?? null };
}

export async function syncBlingOrderAction(orderId: string): Promise<{
  situacao: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  error: string | null;
}> {
  const supabase = await createAdminClient();

  const { data: row } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blingOrderId: number | null = (row as any)?.bling_order_id ?? null;
  if (!blingOrderId) {
    return { situacao: null, invoiceNumber: null, invoiceUrl: null, error: "Pedido ainda não foi enviado ao Bling." };
  }

  const blingOrder = await getBlingOrderDetails(blingOrderId);
  if (!blingOrder) {
    return { situacao: null, invoiceNumber: null, invoiceUrl: null, error: "Pedido não encontrado no Bling." };
  }

  const nfe = await getBlingNfeByOrder(blingOrderId);
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
  return { situacao: blingOrder.situacao?.nome ?? null, invoiceNumber, invoiceUrl, error: null };
}

export async function updateTrackingCodeAction(
  orderId: string,
  trackingCode: string
): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ tracking_code: trackingCode || null })
    .eq("id", orderId);
  return { error: error?.message ?? null };
}
