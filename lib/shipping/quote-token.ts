import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cotação de frete assinada pelo servidor.
 *
 * /api/shipping devolve, junto de cada opção, um token com o preço cotado assinado (HMAC).
 * placeOrderAction só aceita o frete que vier com token válido, para o mesmo CEP e os mesmos
 * itens — assim o valor do frete não pode ser alterado no navegador, e o pedido não precisa
 * cotar de novo nos Correios na hora de fechar (o que falharia junto com a API deles).
 */

const TTL_MS = 24 * 60 * 60 * 1000;

export interface ShippingQuotePayload {
  v: 1;
  cep: string;
  /** Itens normalizados — ver normalizeQuoteItems. */
  items: string;
  id: string;
  serviceCode: string | null;
  label: string;
  price: number;
  minDays: number;
  maxDays: number;
  /** Primeira (mais barata) opção da lista — é a que vira frete grátis acima do mínimo. */
  first: boolean;
  exp: number;
}

function key(): Buffer {
  const base = process.env.SHIPPING_QUOTE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Sem segredo para assinar cotação de frete (SHIPPING_QUOTE_SECRET).");
  // Deriva uma chave própria, para o segredo base nunca ser usado diretamente aqui.
  return createHmac("sha256", base).update("grainup:shipping-quote:v1").digest();
}

function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

export function normalizeQuoteItems(items: Array<{ id: string; type: string; quantity: number }>): string {
  return items
    .map((i) => `${i.type}:${i.id}:${Math.trunc(Number(i.quantity))}`)
    .sort()
    .join(",");
}

export function signShippingQuote(p: Omit<ShippingQuotePayload, "v" | "exp">): string {
  const payload: ShippingQuotePayload = { ...p, v: 1, exp: Date.now() + TTL_MS };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", key()).update(body).digest());
  return `${body}.${sig}`;
}

/** Devolve o conteúdo da cotação se a assinatura for válida e não tiver expirado. */
export function verifyShippingQuote(token: string | null | undefined): ShippingQuotePayload | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ShippingQuotePayload;
    if (payload.v !== 1 || typeof payload.price !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
