"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { OrderRow } from "@/components/admin/pedidos-table";

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
    .select("id, order_number, status, total, payment_method, shipping_cost, created_at, customer_name, shipping_address, order_items(id, title, quantity, combo_id, books(sku), combos(combo_items(books(sku, title))))")
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
