/**
 * Webhook do Melhor Envio — rastreamento de envios
 *
 * Configurar em: Melhor Envio → Configurações → Notificações
 * URL: https://editorajocum.com.br/api/me-webhook
 *
 * Quando o pacote é entregue (status "delivered"), atualiza o pedido para
 * "entregue" e envia o e-mail de solicitação de avaliação.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendReviewRequestEmail } from "@/lib/email";

// Payload enviado pelo ME para cada evento de rastreio
interface MeTrackingEvent {
  tracking: string;         // código de rastreio (ex: "BR123456789BR")
  status: string;           // "delivered" | "in_transit" | "failed" | ...
  status_code?: string;     // código interno do status
  order_id?: string;        // ID do pedido no ME (se disponível)
  message?: string;
  created_at?: string;
}

// O ME pode enviar um array ou objeto único
type MeWebhookPayload = MeTrackingEvent | MeTrackingEvent[];

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null) as MeWebhookPayload | null;
    if (!raw) return NextResponse.json({ ok: true });

    const events: MeTrackingEvent[] = Array.isArray(raw) ? raw : [raw];

    const supabase = await createAdminClient();

    for (const event of events) {
      const trackingCode = event.tracking?.trim();
      if (!trackingCode) continue;

      // Só age quando o pacote foi entregue
      if (event.status !== "delivered") continue;

      // Busca o pedido pelo código de rastreio
      const { data: orderRaw } = await supabase
        .from("orders")
        .select("id, order_number, status, customer_name, customer_email, order_items(title, book_id, books(slug, cover_url))")
        .eq("tracking_code", trackingCode)
        .maybeSingle();

      const order = orderRaw as {
        id: string; order_number: string; status: string;
        customer_name: string; customer_email: string;
        order_items: Array<{ title: string; book_id: string | null; books: { slug: string; cover_url: string | null } | null }>;
      } | null;

      if (!order) continue;
      if (order.status === "entregue") continue; // já processado

      // Atualiza status para entregue
      await supabase
        .from("orders")
        .update({ status: "entregue" })
        .eq("id", order.id);

      // Monta lista de livros para o e-mail
      const books = (order.order_items ?? [])
        .filter((i: { book_id: string | null }) => i.book_id)
        .map((i: { title: string; books: { slug: string; cover_url: string | null } | null }) => ({
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[me-webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
