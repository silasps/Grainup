/**
 * Cron: dispara pushOrderToBling automaticamente 30min após o pagamento ser confirmado
 * (ver lib/bling/schedule.ts e lib/orders/process-approved-payment.ts, que agenda
 * orders.bling_send_after em vez de enviar na hora).
 *
 * Diferente de /api/admin/bling-sync (só leitura, reconcilia invoice_number de pedidos que
 * já têm bling_order_id) — esta rota CRIA pedido de venda + NF-e de verdade no Bling.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pushOrderToBling } from "@/lib/bling/sync";
import { logBlingAction } from "@/lib/bling/audit";
import { verifyOrderPayment } from "@/lib/mercadopago/payments";

export const runtime = "nodejs";
// Maior que o de bling-sync (60s) porque cada pedido do batch faz uma sequência de chamadas
// de ESCRITA ao Bling (contato, produto, pedido, NF-e, envio SEFAZ) — não é só leitura.
export const maxDuration = 120;

// Menor que o limite de 50 usado em bling-sync (que só lê) — cada item aqui é caro.
const BATCH_LIMIT = 20;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const nowIso = new Date().toISOString();
  const staleClaimCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  // Candidatos: (a) pedidos pagos, cujo prazo agendado já passou, E (b) nunca reivindicados
  // (bling_order_id IS NULL) OU reivindicados por uma chamada anterior que travou e expirou
  // há mais de 2min (bling_order_id = -1 e updated_at velho) — mesma janela de expiração
  // usada dentro de pushOrderToBling. Essa segunda condição é ESSENCIAL: este cron é o único
  // gatilho automático que sobra (o fire-and-forget de processApprovedPayment foi removido)
  // — sem reclamar -1 expirados aqui, um claim travado por falha transitória (ex.: Bling 500
  // momentâneo) nunca mais seria reprocessado sozinho, e o pedido ficaria "Enviando ao
  // Bling…" pra sempre até intervenção manual — exatamente o sintoma que motivou este projeto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: due, error } = await (supabase as any)
    .from("orders")
    .select("id, order_number")
    .eq("status", "pago")
    .not("bling_send_after", "is", null)
    .lte("bling_send_after", nowIso)
    .or(`bling_order_id.is.null,and(bling_order_id.eq.-1,updated_at.lt.${staleClaimCutoff})`)
    .order("bling_send_after", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("[bling-auto-send]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { attempted: 0, errors: [] as string[] };

  for (const order of due ?? []) {
    // Bloqueio: reconfirma no Mercado Pago, na hora, que o pagamento foi aprovado no valor do
    // pedido e não foi estornado — sem isso não cria pedido de venda nem NF-e no Bling.
    const payment = await verifyOrderPayment(order.id);
    if (!payment.verified) {
      if (payment.transient) {
        // MP fora do ar: tenta de novo no próximo ciclo, sem desagendar.
        results.errors.push(`${order.order_number}: MP indisponível (${payment.reason})`);
        continue;
      }
      // Pagamento não confere: desagenda (senão ocuparia o lote pra sempre) e registra. O
      // admin vê no detalhe do pedido e pode enviar manualmente depois de resolver.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("orders").update({ bling_send_after: null }).eq("id", order.id);
      const detail = `Bloqueado: Mercado Pago não confirma o pagamento (${payment.reason ?? "sem detalhe"})`;
      console.error(`[bling-auto-send] Pedido ${order.order_number}: ${detail}`);
      results.errors.push(`${order.order_number}: ${detail}`);
      await logBlingAction({ orderId: order.id, action: "push_failed", source: "cron_auto_send", detail });
      continue;
    }

    results.attempted++;
    try {
      // pushOrderToBling faz seu PRÓPRIO claim atômico — é seguro chamar mesmo se, entre o
      // SELECT acima e este await, o admin tiver clicado "Enviar Bling" manualmente pro
      // mesmo pedido; só uma das duas chamadas vence o UPDATE...WHERE.
      await pushOrderToBling(order.id, "cron_auto_send");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[bling-auto-send] Pedido ${order.order_number}:`, msg);
      results.errors.push(`${order.order_number}: ${msg}`);
      await logBlingAction({ orderId: order.id, action: "push_failed", source: "cron_auto_send", detail: msg });
      // Não interrompe o batch. Se a falha foi depois do claim (createBlingOrder lançou),
      // o pedido fica em -1 e será reclamado pelo PRÓXIMO ciclo deste mesmo cron assim que
      // os 2min de staleClaimCutoff passarem.
    }
  }

  console.log(`[bling-auto-send] ${results.attempted} pedido(s) processado(s), ${results.errors.length} erro(s)`);
  return NextResponse.json({ ok: true, ...results });
}
