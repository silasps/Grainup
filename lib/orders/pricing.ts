import { createAdminClient } from "@/lib/supabase/server";

/**
 * Preços do pedido calculados no servidor, a partir do catálogo.
 *
 * Antes, placeOrderAction gravava preço, desconto, frete e total exatamente como o navegador
 * mandava — bastava alterar a requisição pra criar um pedido de R$ 1 e pagar R$ 1. Agora o
 * preço de cada item precisa bater com o catálogo atual.
 *
 * A vitrine calcula o preço de alguns itens de mais de um jeito (ex.: combo na lista vs. na
 * página do combo), então cada item tem um conjunto de preços válidos. O primeiro é o
 * "canônico", usado para corrigir carrinho desatualizado.
 */

export const FREE_SHIPPING_MIN_SUBTOTAL = 200;
export const PIX_DISCOUNT_RATE = 0.05;
const PRICE_TOLERANCE = 0.005;

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface CartLineInput {
  /** Livro: id do livro. Combo: "combo-<id>" (como no carrinho) ou o id puro. */
  id: string;
  type: "book" | "combo";
  quantity: number;
  /** Preço unitário que o navegador está mostrando. */
  price?: number;
}

type BookRow = { id: string; title: string; price: number; price_promotional: number | null; is_active: boolean };
type ComboRow = {
  id: string;
  name: string;
  is_active: boolean;
  price_original: number;
  price_promotional: number | null;
  combo_items: Array<{ books: { price: number; price_promotional: number | null } | null }>;
};

export interface Catalog {
  books: Map<string, BookRow>;
  combos: Map<string, ComboRow>;
}

export function comboIdOf(line: Pick<CartLineInput, "id">) {
  return line.id.replace(/^combo-/, "");
}

export async function loadCatalog(lines: CartLineInput[]): Promise<Catalog> {
  const supabase = await createAdminClient();
  const bookIds = [...new Set(lines.filter((l) => l.type === "book").map((l) => l.id))];
  const comboIds = [...new Set(lines.filter((l) => l.type === "combo").map(comboIdOf))];

  const [booksRes, combosRes] = await Promise.all([
    bookIds.length
      ? supabase.from("books").select("id, title, price, price_promotional, is_active").in("id", bookIds)
      : Promise.resolve({ data: [] as BookRow[], error: null }),
    comboIds.length
      ? supabase
          .from("combos")
          .select("id, name, is_active, price_original, price_promotional, combo_items(books(price, price_promotional))")
          .in("id", comboIds)
      : Promise.resolve({ data: [] as ComboRow[], error: null }),
  ]);
  if (booksRes.error) throw new Error(`Catálogo (livros): ${booksRes.error.message}`);
  if (combosRes.error) throw new Error(`Catálogo (combos): ${combosRes.error.message}`);

  return {
    books: new Map(((booksRes.data ?? []) as BookRow[]).map((b) => [b.id, b])),
    combos: new Map(((combosRes.data ?? []) as unknown as ComboRow[]).map((c) => [c.id, c])),
  };
}

/** Preços unitários válidos hoje para o item (primeiro = canônico), ou null se indisponível. */
export function acceptablePrices(line: CartLineInput, catalog: Catalog): { title: string; prices: number[] } | null {
  if (line.type === "book") {
    const b = catalog.books.get(line.id);
    if (!b || !b.is_active) return null;
    const pp = b.price_promotional;
    // book-card / combo-card: promo só vale se > 0 e menor que o preço cheio
    const canonical = pp != null && pp > 0 && pp < b.price ? pp : b.price;
    // book-detail / recomendações do carrinho: `price_promotional ?? price`
    const alt = pp ?? b.price;
    return { title: b.title, prices: uniq([canonical, alt]) };
  }

  const c = catalog.combos.get(comboIdOf(line));
  if (!c || !c.is_active) return null;
  const books = c.combo_items.map((i) => i.books).filter((b): b is NonNullable<typeof b> => !!b);
  const pp = c.price_promotional ?? 0;
  // Página do combo: preço promocional do combo, ou soma dos livros
  const detailTotal = books.reduce((s, b) => s + (b.price_promotional ?? b.price), 0);
  const canonical = pp > 0 ? pp : detailTotal;
  // Lista de combos (combo-card): soma atual dos livros menos o desconto do combo em reais
  const listTotal = books.reduce((s, b) => s + (b.price_promotional != null && b.price_promotional > 0 ? b.price_promotional : b.price), 0);
  const listPrice = Math.max(0, listTotal - Math.max(0, c.price_original - pp));
  const alt = listPrice > 0 ? listPrice : listTotal;
  return { title: c.name, prices: uniq([canonical, alt]) };
}

function uniq(values: number[]) {
  const out: number[] = [];
  for (const v of values.map(round2)) if (v > 0 && !out.some((o) => Math.abs(o - v) < PRICE_TOLERANCE)) out.push(v);
  return out;
}

export type ResolvedLine =
  | { ok: true; line: CartLineInput; title: string; unitPrice: number }
  | { ok: false; line: CartLineInput; reason: "unavailable" }
  | { ok: false; line: CartLineInput; reason: "price_changed"; title: string; unitPrice: number };

/**
 * Confere o preço do navegador contra o catálogo. Se bater com um preço válido, usa ele; se
 * não, devolve o preço canônico atual pra corrigir o carrinho.
 */
export function resolveLine(line: CartLineInput, catalog: Catalog): ResolvedLine {
  const acc = acceptablePrices(line, catalog);
  if (!acc || acc.prices.length === 0) return { ok: false, line, reason: "unavailable" };
  const match = line.price != null ? acc.prices.find((p) => Math.abs(p - Number(line.price)) < PRICE_TOLERANCE) : undefined;
  if (match != null) return { ok: true, line, title: acc.title, unitPrice: match };
  return { ok: false, line, reason: "price_changed", title: acc.title, unitPrice: acc.prices[0] };
}

/** Mesma conta do checkout (checkout-flow.tsx), pra não divergir em meio centavo. */
export function pixDiscountFor(subtotal: number) {
  return Math.round(subtotal * PIX_DISCOUNT_RATE * 100) / 100;
}
