import { createAdminClient } from "@/lib/supabase/server";

/**
 * Verificação de pagamentos direto na API do Mercado Pago.
 *
 * Contexto (incidente 2026-11): o notification_url dos pagamentos apontava pra
 * https://editorajocum.com.br/api/mp-webhook, que responde 308 → www. O Mercado Pago NÃO
 * segue redirect em webhook, então nenhum aviso de pagamento chegava. Pedidos só eram
 * aprovados se o comprador ficasse com a tela do checkout aberta (polling). 12 pedidos
 * Pix pagos de verdade ficaram presos como "aguardando pagamento".
 *
 * Regras daqui:
 * - Um pedido só é considerado pago se o MP disser `approved`, o `external_reference` for o
 *   id do pedido, o valor pago cobrir o total do pedido e a moeda for BRL.
 * - Nada aqui confia em valor vindo do navegador.
 */

const MP_API = "https://api.mercadopago.com";

/** Diferença máxima aceita entre o valor pago e o total do pedido (arredondamento). */
const AMOUNT_TOLERANCE = 0.01;

export interface MpPayment {
  id: number | string;
  status?: string;
  status_detail?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  currency_id?: string;
  external_reference?: string | null;
  collector_id?: number;
  live_mode?: boolean;
  date_created?: string | null;
  date_approved?: string | null;
  money_release_date?: string | null;
  money_release_status?: string | null;
  fee_details?: Array<{ type?: string; amount?: number }> | null;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
    /** No Pix vem como "PIX" + ID fim-a-fim (E2E) do Banco Central. */
    transaction_id?: string | null;
  } | null;
}

function accessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
}

function isProductionToken() {
  return accessToken().startsWith("APP_USR-");
}

/**
 * URL de notificação (webhook) para o Mercado Pago. Retorna undefined quando o app não
 * está num endereço público (localhost), caso em que o MP não teria como chamar.
 *
 * O MP não segue redirect: a URL precisa responder 200 direto. O domínio raiz da editora
 * redireciona (308) pro www na Vercel, então ele é trocado aqui. MERCADOPAGO_WEBHOOK_BASE_URL
 * permite fixar outra base sem mexer em código.
 */
export function getMpNotificationUrl(path: string): string | undefined {
  const raw = process.env.MERCADOPAGO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  let base: URL;
  try {
    base = new URL(raw);
  } catch {
    return undefined;
  }
  if (base.hostname === "localhost" || base.hostname === "127.0.0.1") return undefined;
  if (base.hostname === "editorajocum.com.br") base.hostname = "www.editorajocum.com.br";
  base.protocol = "https:";
  return `${base.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchMpPayment(paymentId: string | number): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao consultar o pagamento ${paymentId}`);
  return (await res.json()) as MpPayment;
}

/** Todos os pagamentos criados no MP para um pedido (external_reference = id do pedido). */
export async function searchMpPaymentsByOrder(orderId: string): Promise<MpPayment[]> {
  const url = `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} na busca do pedido ${orderId}`);
  const body = (await res.json()) as { results?: MpPayment[] };
  return body.results ?? [];
}

export type PaymentCheck = { ok: true } | { ok: false; reason: string };

/**
 * Confere se um pagamento do MP quita de fato o pedido. É o "bloqueio" central: nenhum
 * pedido vira pago sem passar por aqui.
 */
export function validatePaymentForOrder(
  payment: Pick<MpPayment, "status" | "transaction_amount" | "external_reference" | "currency_id" | "live_mode">,
  order: { id: string; total: number },
): PaymentCheck {
  if (payment.status !== "approved") {
    return { ok: false, reason: `status no Mercado Pago é "${payment.status ?? "desconhecido"}", não "approved"` };
  }
  if (payment.external_reference && payment.external_reference !== order.id) {
    return { ok: false, reason: "o pagamento pertence a outro pedido (external_reference diferente)" };
  }
  if (payment.currency_id && payment.currency_id !== "BRL") {
    return { ok: false, reason: `moeda ${payment.currency_id}, esperado BRL` };
  }
  const paid = Number(payment.transaction_amount ?? NaN);
  const total = Number(order.total);
  if (!Number.isFinite(paid) || paid + AMOUNT_TOLERANCE < total) {
    return { ok: false, reason: `valor pago (R$ ${Number.isFinite(paid) ? paid.toFixed(2) : "?"}) menor que o total do pedido (R$ ${total.toFixed(2)})` };
  }
  if (isProductionToken() && payment.live_mode === false) {
    return { ok: false, reason: "pagamento de teste (sandbox) em ambiente de produção" };
  }
  return { ok: true };
}

/** ID fim-a-fim do Pix (E2E) — o mesmo que aparece no extrato do banco do pagador. */
export function pixEndToEndId(payment: MpPayment): string | null {
  const raw = payment.transaction_details?.transaction_id ?? null;
  if (!raw || payment.payment_method_id !== "pix") return null;
  return raw.startsWith("PIX") ? raw.slice(3) : raw;
}

export interface OrderPaymentVerification {
  /** true = MP confirma pagamento aprovado, do valor certo, para este pedido. */
  verified: boolean;
  /** true = não deu pra consultar o MP agora (erro de rede/API). Tentar de novo depois. */
  transient: boolean;
  reason: string | null;
  payment: MpPayment | null;
  /** Pagamento aprovado e depois estornado/contestado. */
  reversed: boolean;
}

/**
 * Consulta o MP e diz se o pedido está pago de verdade. Procura primeiro o pagamento
 * registrado no pedido (notes = "MP:<id>") e, se ele não estiver aprovado, todos os
 * pagamentos com external_reference = id do pedido (cobre Pix gerado de novo na tela de
 * nova tentativa, que sobrescreve o notes).
 */
export async function verifyOrderPayment(orderId: string): Promise<OrderPaymentVerification> {
  const supabase = await createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, notes")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { verified: false, transient: false, reason: "pedido não encontrado", payment: null, reversed: false };

  const notedId = typeof order.notes === "string" && order.notes.startsWith("MP:") ? order.notes.slice(3) : null;

  try {
    let candidate: MpPayment | null = null;
    if (notedId && /^\d+$/.test(notedId)) {
      candidate = await fetchMpPayment(notedId);
      if (candidate && validatePaymentForOrder(candidate, order).ok) {
        return { verified: true, transient: false, reason: null, payment: candidate, reversed: false };
      }
    }

    const all = await searchMpPaymentsByOrder(orderId);
    const approved = all.find((p) => validatePaymentForOrder(p, order).ok);
    if (approved) return { verified: true, transient: false, reason: null, payment: approved, reversed: false };

    const reversedPayment = all.find((p) => p.status === "refunded" || p.status === "charged_back")
      ?? (candidate && (candidate.status === "refunded" || candidate.status === "charged_back") ? candidate : null);
    if (reversedPayment) {
      return {
        verified: false,
        transient: false,
        reason: reversedPayment.status === "charged_back" ? "pagamento contestado (chargeback) no Mercado Pago" : "pagamento estornado no Mercado Pago",
        payment: reversedPayment,
        reversed: true,
      };
    }

    const latest = candidate ?? all[0] ?? null;
    if (!latest) {
      return { verified: false, transient: false, reason: "nenhum pagamento encontrado no Mercado Pago para este pedido", payment: null, reversed: false };
    }
    const check = validatePaymentForOrder(latest, order);
    return { verified: false, transient: false, reason: check.ok ? null : check.reason, payment: latest, reversed: false };
  } catch (e) {
    return {
      verified: false,
      transient: true,
      reason: e instanceof Error ? e.message : String(e),
      payment: null,
      reversed: false,
    };
  }
}

/** Conta do Mercado Pago dona do token (onde o dinheiro cai). */
export async function fetchMpAccount(): Promise<{ id: number; nickname: string | null; name: string | null } | null> {
  try {
    const res = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken()}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const me = (await res.json()) as { id: number; nickname?: string; first_name?: string };
    return { id: me.id, nickname: me.nickname ?? null, name: me.first_name?.trim() || null };
  } catch {
    return null;
  }
}
