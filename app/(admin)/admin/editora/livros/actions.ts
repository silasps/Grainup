"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, getAllBlingProducts, createBlingProduct } from "@/lib/bling/client";

function norm(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(a|o|as|os|de|da|do|das|dos|e|em|na|no|nas|nos|um|uma|que|por|para)\b/g, "")
    .replace(/\s+/g, " ").trim();
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter((w) => w.length > 2));
  const wb = new Set(b.split(" ").filter((w) => w.length > 2));
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits++;
  const total = Math.max(wa.size, wb.size);
  return total > 0 ? hits / total : 0;
}

// Verifica se todas as palavras do menor aparecem no maior (ex: "TLC" ⊂ "TLC Treinamento...")
function containsAll(shorter: string, longer: string): boolean {
  const ws = shorter.split(" ").filter((w) => w.length > 2);
  const wl = new Set(longer.split(" ").filter((w) => w.length > 2));
  return ws.length > 0 && ws.every((w) => wl.has(w));
}

export async function syncBlingSkusAction(): Promise<{
  updated: number;
  unmatched: Array<{ title: string; best: string; score: number }>;
  error: string | null;
}> {

  let blingProducts: Awaited<ReturnType<typeof getAllBlingProducts>>;
  try {
    blingProducts = await getAllBlingProducts();
  } catch (e) {
    return { updated: 0, unmatched: [], error: `Erro ao buscar produtos no Bling: ${e}` };
  }

  if (blingProducts.length === 0) return { updated: 0, unmatched: [], error: "Nenhum produto encontrado no Bling." };

  const supabase = await createAdminClient();
  const { data: books } = await supabase.from("books").select("id, title, sku");

  const blingNormed = blingProducts.map((p) => ({ ...p, _norm: norm(p.nome) }));
  const blingByName = new Map(blingNormed.map((p) => [p._norm, p]));

  let updated = 0;
  const unmatched: Array<{ title: string; best: string; score: number }> = [];

  for (const book of books ?? []) {
    const bookNorm = norm(book.title ?? "");

    // 1. Correspondência exata
    let match = blingByName.get(bookNorm);

    // 2. Maior sobreposição de palavras (>= 60%)
    if (!match) {
      let bestScore = 0;
      let bestProduct = blingNormed[0];
      for (const p of blingNormed) {
        const score = wordOverlap(bookNorm, p._norm);
        if (score > bestScore) { bestScore = score; bestProduct = p; }
      }
      if (bestScore >= 0.6) {
        match = bestProduct;
      } else {
        // 3. Verificação bidirecional: um título contém todas as palavras do outro
        const subsetMatch = blingNormed.find(
          (p) => containsAll(bookNorm, p._norm) || containsAll(p._norm, bookNorm)
        );
        if (subsetMatch) {
          match = subsetMatch;
        } else {
          unmatched.push({ title: book.title, best: bestProduct.nome, score: Math.round(bestScore * 100) });
        }
      }
    }

    if (match?.codigo) {
      const patch: Record<string, unknown> = {};
      if (match.codigo !== book.sku) patch.sku = match.codigo;
      // Dimensões: Bling é a fonte de verdade — substitui sempre que o valor existir
      if (match.pesoBruto)    patch.weight_grams = Math.round(match.pesoBruto * 1000);
      if (match.largura)      patch.width_cm     = match.largura;
      if (match.altura)       patch.height_cm    = match.altura;
      if (match.profundidade) patch.length_cm    = match.profundidade;
      if (Object.keys(patch).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("books").update(patch as any).eq("id", book.id);
        if (patch.sku) updated++;
      }
    }
  }

  revalidatePath("/admin/editora/livros");
  return { updated, unmatched, error: null };
}

export async function pushBookToBlingAction(bookId: string): Promise<{ blingProductId: number | null; error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book } = await (supabase as any)
    .from("books")
    .select("id, title, sku, price, bling_product_id")
    .eq("id", bookId)
    .single() as { data: { id: string; title: string; sku: string | null; price: number; bling_product_id: number | null } | null };
  if (!book) return { blingProductId: null, error: "Livro não encontrado." };
  if (book.bling_product_id) return { blingProductId: book.bling_product_id, error: null };

  try {
    // Se já tem SKU, tenta vincular ao produto existente no Bling antes de criar
    if (book.sku) {
      const existing = await getBlingProductBySku(book.sku);
      if (existing?.id) {
        await (supabase as any).from("books").update({ bling_product_id: existing.id }).eq("id", bookId);
        return { blingProductId: existing.id, error: null };
      }
    }
    // Sem correspondência — cria novo produto no Bling
    const result = await createBlingProduct({
      nome: book.title,
      codigo: book.sku || undefined,
      preco: book.price,
      tipo: "P",
      situacao: "A",
    });
    await (supabase as any).from("books").update({ bling_product_id: result.id }).eq("id", bookId);
    return { blingProductId: result.id, error: null };
  } catch (e) {
    return { blingProductId: null, error: String(e) };
  }
}

// Vincula em lote todos os livros com SKU ao produto correspondente no Bling
export async function linkAllBlingProductIdsAction(): Promise<{ linked: number; error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, sku, bling_product_id")
    .not("sku", "is", null)
    .is("bling_product_id", null) as { data: Array<{ id: string; sku: string; bling_product_id: number | null }> | null };

  let linked = 0;
  for (const book of books ?? []) {
    try {
      const existing = await getBlingProductBySku(book.sku);
      if (existing?.id) {
        await (supabase as any).from("books").update({ bling_product_id: existing.id }).eq("id", book.id);
        linked++;
      }
    } catch { /* continua */ }
  }
  revalidatePath("/admin/editora/livros");
  return { linked, error: null };
}

export async function updateBookStockAction(bookId: string, stock: number) {
  if (stock < 0 || !Number.isInteger(stock)) return { error: "Estoque inválido." };
  const supabase = await createAdminClient();
  const { error } = await supabase.from("books").update({ stock }).eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/livros");
  return { error: null };
}

export async function revalidateBookPages() {
  revalidatePath("/editora/livros", "layout");
  revalidatePath("/editora/combos", "layout");
}

/**
 * Verifica se um SKU já existe no Bling.
 * Retorna o estoque atual para pré-preencher o campo quando o SKU for informado.
 */
export async function lookupBlingSkuAction(sku: string): Promise<{
  found: boolean;
  stock?: number;
  name?: string;
  weightGrams?: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
  error?: string;
}> {
  try {
    const product = await getBlingProductBySku(sku);
    if (!product) return { found: false };
    return {
      found: true,
      name: product.nome,
      stock: product.estoque?.saldoFisico ?? 0,
      weightGrams: product.pesoBruto ? Math.round(product.pesoBruto * 1000) : undefined,
      widthCm: product.largura ?? undefined,
      heightCm: product.altura ?? undefined,
      lengthCm: product.profundidade ?? undefined,
    };
  } catch {
    return { found: false };
  }
}
