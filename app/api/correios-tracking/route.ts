/**
 * Correios Tracking Poller — substitui o webhook do Melhor Envio
 *
 * Rota chamada via Vercel Cron a cada 4h (vercel.json).
 * Para cada pedido em "enviado" com código de rastreio, consulta o Rastro
 * dos Correios e, se o objeto foi entregue, marca o pedido como "entregue"
 * e dispara o e-mail de solicitação de avaliação.
 *
 * Protegida por Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTrackingEvents, isDeliveredEvent, CorreiosTrackingError } from "@/lib/correios/client";
import { sendReviewRequestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const supabase = await createAdminClient();

  // Busca pedidos enviados com código de rastreio
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email, tracking_code, order_items(title, book_id, books(slug, cover_url))")
    .eq("status", "enviado")
    .not("tracking_code", "is", null);

  if (error) {
    console.error("[correios-tracking] erro ao buscar pedidos:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type OrderRow = {
    id: string;
    order_number: string;
    status: string;
    customer_name: string;
    customer_email: string;
    tracking_code: string;
    order_items: Array<{
      title: string;
      book_id: string | null;
      books: { slug: string; cover_url: string | null } | null;
    }>;
  };

  const rows = (orders ?? []) as unknown as OrderRow[];

  // Cap por execução: evita timeout na Vercel (10s hobby / 60s pro)
  const BATCH = 40;
  const batch = rows.slice(0, BATCH);
  if (rows.length > BATCH) {
    console.warn(`[correios-tracking] ${rows.length} pedidos pendentes — processando primeiros ${BATCH}`);
  }

  let checked = 0;
  let delivered = 0;
  let failed = 0;

  for (const order of batch) {
    try {
      const events = await getTrackingEvents(order.tracking_code);

      const wasDelivered = events.some(isDeliveredEvent);
      if (!wasDelivered) { checked++; continue; }

      // Marca como entregue
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "entregue" })
        .eq("id", order.id);

      if (updateErr) {
        console.error(`[correios-tracking] falha ao atualizar pedido ${order.order_number}:`, updateErr.message);
        failed++;
        continue;
      }

      delivered++;
      console.log(`[correios-tracking] pedido ${order.order_number} marcado como entregue`);

      const books = order.order_items
        .filter((i) => i.book_id)
        .map((i) => ({
          title: i.title,
          slug: i.books?.slug ?? "",
          coverUrl: i.books?.cover_url ?? null,
        }));

      if (books.length > 0 && order.customer_email) {
        sendReviewRequestEmail(
          order.customer_email,
          order.customer_name,
          order.order_number,
          books,
        ).catch(console.error);
      }

    } catch (err) {
      if (err instanceof CorreiosTrackingError) {
        console.warn(`[correios-tracking] ${order.tracking_code}: ${err.message}`);
      } else {
        console.error(`[correios-tracking] erro ao rastrear ${order.tracking_code}:`, err);
        failed++;
      }
      checked++;
    }

    // Respeita rate limit do endpoint de rastreamento (evita 429)
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`[correios-tracking] total=${rows.length} verificados=${checked + delivered} entregues=${delivered} falhas=${failed}`);
  return NextResponse.json({ ok: true, total: rows.length, checked: checked + delivered, delivered, failed });
}
