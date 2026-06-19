"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, getAllBlingProducts, createBlingProduct, updateBlingProduct, safePatchBlingProductCodigo, safePatchBlingProductNcm, safePatchBlingProductCategoria, safePatchBlingProductGrupo, safePatchBlingProductFisicos, getBlingProductDimensions, getBlingGrupos, getBlingNaturezasOperacao, getBlingCategorias, getBlingCategoriasRaw, type BlingProduct, type BlingNaturezaOperacao, type BlingCategoria } from "@/lib/bling/client";

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
    // Sem correspondência — cria novo produto no Bling com dados fiscais para NF-e
    const categoriaId = process.env.BLING_CATEGORIA_LIVROS_ID
      ? parseInt(process.env.BLING_CATEGORIA_LIVROS_ID, 10)
      : undefined;
    const result = await createBlingProduct({
      nome: book.title,
      codigo: book.sku || undefined,
      preco: book.price,
      formato: "S",
      situacao: "A",
      tipo: "P",
      unidade: "UN",
      tributacao: { ncm: "4901.99.00", origem: 0 },
      ...(categoriaId ? { categoria: { id: categoriaId } } : {}),
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

/** Após editar um livro, empurra preço, nome e dados fiscais para o Bling */
export async function syncBookToBlingAction(bookId: string): Promise<{ error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book } = await (supabase as any)
    .from("books")
    .select("title, sku, price, bling_product_id")
    .eq("id", bookId)
    .single() as { data: { title: string; sku: string | null; price: number; bling_product_id: number | null } | null };

  if (!book) return { error: "Livro não encontrado." };
  if (!book.bling_product_id) return { error: null }; // ainda não vinculado, ignora

  try {
    const categoriaId = process.env.BLING_CATEGORIA_LIVROS_ID
      ? parseInt(process.env.BLING_CATEGORIA_LIVROS_ID, 10)
      : undefined;
    await updateBlingProduct(book.bling_product_id, {
      nome: book.title,
      codigo: book.sku || undefined, // preserva o SKU existente no Bling
      preco: book.price,
      tipo: "P", formato: "S", situacao: "A",
      unidade: "UN",
      tributacao: { ncm: "4901.99.00", origem: 0 },
      ...(categoriaId ? { categoria: { id: categoriaId } } : {}),
    });
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

/** Envia NCM + CSOSN + UN apenas para livros que ainda não foram sincronizados (bling_ncm_synced=false) */
export async function syncFiscalDataToBlingAction(): Promise<{ updated: number; skipped: number; total: number; error: string | null }> {
  const supabase = await createAdminClient();

  // Busca apenas livros vinculados ao Bling que ainda não tiveram NCM sincronizado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (supabase as any)
    .from("books")
    .select("id, bling_product_id")
    .not("bling_product_id", "is", null)
    .eq("bling_ncm_synced", false) as { data: Array<{ id: string; bling_product_id: number }> | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: alreadySynced } = await (supabase as any)
    .from("books")
    .select("id", { count: "exact", head: true })
    .not("bling_product_id", "is", null)
    .eq("bling_ncm_synced", true);

  const list = pending ?? [];
  const skipped = alreadySynced ?? 0;
  let updated = 0;

  if (list.length === 0) {
    return { updated: 0, skipped, total: skipped, error: null };
  }

  // Busca todos os produtos do Bling de uma vez para obter os nomes
  let blingMap: Map<number, BlingProduct> = new Map();
  try {
    const all = await getAllBlingProducts();
    for (const p of all) blingMap.set(p.id, p);
  } catch (e) { console.error("[Bling] Falha ao buscar produtos:", e); }

  for (const book of list) {
    const blingProduct = blingMap.get(book.bling_product_id);
    if (!blingProduct?.nome) {
      console.warn(`[Bling] Produto ${book.bling_product_id} não encontrado no Bling — pulando`);
      continue;
    }
    try {
      // safePatchBlingProductNcm: GET completo → modifica só tributacao.ncm → PUT completo
      // Preserva categoria, dimensões, peso e todos os outros campos que o Bling já tem
      await safePatchBlingProductNcm(book.bling_product_id, "4901.99.00");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("books").update({ bling_ncm_synced: true }).eq("id", book.id);
      updated++;
    } catch (e) { console.error(`[Bling] Falha ao atualizar NCM do produto ${book.bling_product_id}:`, e); }
  }
  revalidatePath("/admin/editora/livros");
  return { updated, skipped, total: list.length + skipped, error: null };
}

/**
 * Repara o codigo (SKU) de produtos no Bling cujo campo foi apagado pelo sync sem codigo.
 * Lê o sku salvo na plataforma e restaura no Bling, depois reseta bling_ncm_synced=false
 * para que o próximo sync de dados fiscais reenvie os dados completos com o código correto.
 */
export async function repairBlingSkusAction(): Promise<{ repaired: number; checked: number; error: string | null }> {
  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, sku, bling_product_id")
    .not("bling_product_id", "is", null)
    .not("sku", "is", null) as { data: Array<{ id: string; sku: string; bling_product_id: number }> | null };

  if (!books?.length) return { repaired: 0, checked: 0, error: null };

  let blingMap: Map<number, BlingProduct> = new Map();
  try {
    const all = await getAllBlingProducts();
    for (const p of all) blingMap.set(p.id, p);
  } catch (e) {
    return { repaired: 0, checked: 0, error: `Falha ao buscar produtos no Bling: ${e}` };
  }

  let checked = 0;
  let repaired = 0;

  for (const book of books) {
    const blingProduct = blingMap.get(book.bling_product_id);
    if (!blingProduct?.nome) continue;

    checked++;

    // Só restaura se o codigo está vazio no Bling mas temos o sku na plataforma
    if (!blingProduct.codigo && book.sku) {
      try {
        // safePatchBlingProductCodigo: busca o produto COMPLETO do Bling via GET,
        // altera APENAS o campo codigo, e devolve tudo para o PUT.
        // Nenhum outro campo é modificado.
        await safePatchBlingProductCodigo(book.bling_product_id, book.sku);
        // Reseta sync para que os dados fiscais sejam reenviados com o codigo correto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("books").update({ bling_ncm_synced: false }).eq("id", book.id);
        repaired++;
        console.log(`[Bling] SKU restaurado: ${book.sku} → produto ${book.bling_product_id}`);
      } catch (e) {
        console.error(`[Bling] Falha ao restaurar SKU do produto ${book.bling_product_id}:`, e);
      }
    }
  }

  revalidatePath("/admin/editora/livros");
  return { repaired, checked, error: null };
}

/**
 * Corrige os livros cujo bling_product_id aponta para um produto duplicado (sem código).
 * Para cada livro com sku definido, busca o produto correto no Bling pelo SKU e
 * atualiza bling_product_id se o produto encontrado for diferente do atual.
 * Usado após o reparo de SKUs para os casos que falharam com "código já cadastrado".
 */
export async function fixDuplicateBlingLinksAction(): Promise<{ fixed: number; checked: number; error: string | null }> {
  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, sku, bling_product_id")
    .not("bling_product_id", "is", null)
    .not("sku", "is", null) as { data: Array<{ id: string; sku: string; bling_product_id: number }> | null };

  let checked = 0;
  let fixed = 0;

  for (const book of books ?? []) {
    if (!book.sku) continue;
    checked++;
    try {
      const correct = await getBlingProductBySku(book.sku);
      if (correct && correct.id !== book.bling_product_id) {
        // O produto correto (com o código) existe no Bling mas nosso DB aponta para outro
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("books")
          .update({ bling_product_id: correct.id, bling_ncm_synced: false })
          .eq("id", book.id);
        console.log(`[Bling] Link corrigido: livro ${book.id} agora aponta para produto ${correct.id} (código ${book.sku})`);
        fixed++;
      }
    } catch { /* continua */ }
  }

  revalidatePath("/admin/editora/livros");
  return { fixed, checked, error: null };
}

/**
 * Define o Grupo de Produtos "Livros Insdustrializados na Editora" em TODOS os livros no Bling.
 * A natureza de operação filtra por esse grupo para aplicar CFOP/CSOSN corretos na NF-e.
 * Sem esse grupo, o Bling não encontra a regra → CFOP vazio → NF-e falha.
 */
export async function fixBlingProductCategoriesAction(): Promise<{ fixed: number; skipped: number; error: string | null }> {
  const supabase = await createAdminClient();

  // Busca todos os grupos do Bling para achar "Livros Insdustrializados na Editora"
  let targetGrupoId: number | null = null;
  try {
    const grupos = await getBlingGrupos();
    const target = grupos.find(g => {
      const name = g.descricao.toLowerCase();
      return name.includes("insdustrializado") || name.includes("industrializado");
    });
    targetGrupoId = target?.id ?? null;
    if (!targetGrupoId) {
      const names = grupos.slice(0, 20).map(g => `${g.id}: ${g.descricao}`).join(", ");
      return { fixed: 0, skipped: 0, error: `Grupo "Livros Insdustrializados na Editora" não encontrado em /grupos. Grupos disponíveis: ${names || "(nenhum)"}` };
    }
    console.log(`[Bling] Grupo encontrado: ID ${targetGrupoId} → "${target?.descricao}"`);
  } catch (e) {
    return { fixed: 0, skipped: 0, error: `Erro ao buscar grupos: ${String(e)}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, bling_product_id")
    .not("bling_product_id", "is", null) as { data: Array<{ id: string; bling_product_id: number }> | null };

  let fixed = 0;
  let skipped = 0;

  for (const book of books ?? []) {
    try {
      await safePatchBlingProductGrupo(book.bling_product_id, targetGrupoId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("books").update({ bling_ncm_synced: false }).eq("id", book.id);
      fixed++;
      console.log(`[Bling] Grupo corrigido: produto ${book.bling_product_id}`);
    } catch (e) {
      console.error(`[Bling] Falha ao corrigir grupo do produto ${book.bling_product_id}:`, e);
      skipped++;
    }
  }

  revalidatePath("/admin/editora/livros");
  return { fixed, skipped, error: null };
}

/** Lista naturezas de operação do Bling para o admin descobrir o ID a configurar no .env */
export async function listBlingNaturezasAction(): Promise<{ data: BlingNaturezaOperacao[]; error: string | null }> {
  try {
    const data = await getBlingNaturezasOperacao();
    return { data, error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

/** Lista categorias de produtos do Bling para identificar a categoria dos livros */
export async function listBlingCategoriasAction(): Promise<{ data: BlingCategoria[]; error: string | null }> {
  try {
    const data = await getBlingCategorias();
    return { data, error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

/** Retorna TODAS as categorias do Bling com campos completos — usado para achar o ID exato de "Livros Industrializados na Editora" */
export async function getBlingCategoriasRawAction(): Promise<{ data: unknown[]; error: string | null }> {
  try {
    const data = await getBlingCategoriasRaw();
    return { data, error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

export async function updateBookStockAction(bookId: string, stock: number) {
  if (stock < 0 || !Number.isInteger(stock)) return { error: "Estoque inválido." };
  const supabase = await createAdminClient();
  const { error } = await supabase.from("books").update({ stock }).eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/livros");
  return { error: null };
}

export async function updateBookRelevanceAction(bookId: string, relevance: number | null) {
  if (relevance !== null && (relevance < 1 || relevance > 5 || !Number.isInteger(relevance))) {
    return { error: "Relevância inválida." };
  }
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("books").update({ relevance }).eq("id", bookId);
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

/**
 * Restaura preço, SKU, peso e dimensões de todos os livros vinculados ao Bling.
 * Usa safePatch (GET → modifica → PUT) para não apagar nenhum outro dado.
 * Conversões: weight_grams ÷ 1000 = kg (pesoBruto), height/width/length_cm direto (unidadeMedida=1).
 */
export async function assignBlingGroupAction(targetGrupoId: number): Promise<{ fixed: number; skipped: number; error: string | null }> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, bling_product_id")
    .not("bling_product_id", "is", null) as { data: Array<{ id: string; bling_product_id: number }> | null };

  let fixed = 0;
  let skipped = 0;
  for (const book of books ?? []) {
    try {
      await safePatchBlingProductGrupo(book.bling_product_id, targetGrupoId);
      fixed++;
    } catch {
      skipped++;
    }
  }
  revalidatePath("/admin/editora/livros");
  return { fixed, skipped, error: null };
}

export async function restoreBlingProductFisicosAction(): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
  booksWithDims: number;
}> {
  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, title, sku, price, bling_product_id, weight_grams, height_cm, width_cm, length_cm")
    .not("bling_product_id", "is", null)
    .order("title");

  if (!books || books.length === 0) return { total: 0, updated: 0, skipped: 0, errors: [], booksWithDims: 0 };

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const book of books as Array<{
    id: string; title: string; sku: string | null; price: number;
    bling_product_id: number; weight_grams: number | null;
    height_cm: number | null; width_cm: number | null; length_cm: number | null;
  }>) {
    const hasData = book.price > 0 || book.sku || book.weight_grams || book.height_cm || book.width_cm || book.length_cm;
    if (!hasData) { skipped++; continue; }

    try {
      await safePatchBlingProductFisicos({
        blingProductId: book.bling_product_id,
        preco: book.price > 0 ? book.price : null,
        codigo: book.sku ?? null,
        pesoBrutoKg: book.weight_grams ? book.weight_grams / 1000 : null,
        alturaCm: book.height_cm ?? null,
        larguraCm: book.width_cm ?? null,
        profundidadeCm: book.length_cm ?? null,
      });
      updated++;
      console.log(`[Bling] Restaurado: "${book.title}" peso=${book.weight_grams}g dim=${book.height_cm}×${book.width_cm}×${book.length_cm}cm`);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`"${book.title}": ${msg}`);
      console.error(`[Bling] Erro ao restaurar "${book.title}":`, msg);
    }
  }

  const booksWithDims = (books as Array<{ height_cm: number | null; width_cm: number | null; length_cm: number | null }>)
    .filter(b => b.height_cm && b.width_cm && b.length_cm).length;
  console.log(`[Bling] Restauração concluída: ${updated} atualizados, ${skipped} ignorados, ${booksWithDims}/${books.length} tinham dimensões no DB`);

  return { total: books.length, updated, skipped, errors, booksWithDims };
}

/**
 * Puxa dimensões e peso do Bling (GET /produtos/{id}) e grava no nosso DB.
 * Útil quando as colunas height_cm/width_cm/length_cm estão nulas no DB mas
 * o Bling ainda tem os valores originais no cadastro do produto.
 * Não altera nada no Bling — só atualiza nosso DB.
 */
export async function pullBlingDimensionsToDbAction(): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any)
    .from("books")
    .select("id, title, bling_product_id, height_cm, width_cm, length_cm, weight_grams")
    .not("bling_product_id", "is", null)
    .order("title") as { data: Array<{
      id: string; title: string; bling_product_id: number;
      height_cm: number | null; width_cm: number | null; length_cm: number | null;
      weight_grams: number | null;
    }> | null };

  if (!books?.length) return { total: 0, updated: 0, skipped: 0, errors: [] };

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const book of books) {
    try {
      const dims = await getBlingProductDimensions(book.bling_product_id);
      if (!dims) { skipped++; continue; }

      const patch: Record<string, unknown> = {};
      // Só grava no DB se o Bling tiver o valor e nosso DB estiver vazio
      if (dims.alturaCm && !book.height_cm) patch.height_cm = dims.alturaCm;
      if (dims.larguraCm && !book.width_cm) patch.width_cm = dims.larguraCm;
      if (dims.profundidadeCm && !book.length_cm) patch.length_cm = dims.profundidadeCm;
      // Peso: só corrige se o nosso DB está vazio; se tem valor, mantém o do DB
      if (dims.pesoBrutoKg && !book.weight_grams) patch.weight_grams = Math.round(dims.pesoBrutoKg * 1000);

      if (Object.keys(patch).length === 0) {
        console.log(`[Bling] Pull dims: "${book.title}" — DB já tem dados, pulando`);
        skipped++;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("books").update(patch).eq("id", book.id);
      console.log(`[Bling] Pull dims: "${book.title}" ← Bling h=${dims.alturaCm} w=${dims.larguraCm} l=${dims.profundidadeCm} peso=${dims.pesoBrutoKg}kg`);
      updated++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`"${book.title}": ${msg}`);
      console.error(`[Bling] Erro pull dims "${book.title}":`, msg);
    }
  }

  revalidatePath("/admin/editora/livros");
  console.log(`[Bling] Pull dims concluído: ${updated} atualizados, ${skipped} ignorados`);
  return { total: books.length, updated, skipped, errors };
}

/**
 * Atualiza preço (e preço promocional) de uma lista de livros em lote.
 * Sincroniza o preço no Bling para todos os livros com bling_product_id.
 * Recebe os IDs já filtrados pelo componente cliente (baseado na regra de relevância + páginas).
 */
export async function batchUpdatePriceByRuleAction(params: {
  bookIds: string[];
  newPrice: number;
  newPricePromotional: number | null;
}): Promise<{ updated: number; blingUpdated: number; errors: string[] }> {
  if (!params.bookIds.length) return { updated: 0, blingUpdated: 0, errors: [] };
  if (params.newPrice <= 0) return { updated: 0, blingUpdated: 0, errors: ["Preço inválido."] };

  const supabase = await createAdminClient();

  const { error: updateError } = await supabase
    .from("books")
    .update({
      price: params.newPrice,
      price_promotional: params.newPricePromotional,
    })
    .in("id", params.bookIds);

  if (updateError) return { updated: 0, blingUpdated: 0, errors: [updateError.message] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: withBling } = await (supabase as any)
    .from("books")
    .select("bling_product_id")
    .in("id", params.bookIds)
    .not("bling_product_id", "is", null) as { data: Array<{ bling_product_id: number }> | null };

  let blingUpdated = 0;
  const errors: string[] = [];

  for (const book of withBling ?? []) {
    try {
      await safePatchBlingProductFisicos({
        blingProductId: book.bling_product_id,
        preco: params.newPrice,
      });
      blingUpdated++;
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      errors.push(String(e));
    }
  }

  revalidatePath("/admin/editora/livros");
  revalidatePath("/editora/livros", "layout");
  return { updated: params.bookIds.length, blingUpdated, errors };
}

export interface BookImportRow {
  id: string;
  title: string;
  price: number;
  price_promotional: number | null;
  pages: number | null;
  relevance: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  isbn: string | null;
  sku: string | null;
  publisher: string | null;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  description_short: string | null;
}

/**
 * Importa uma planilha XLSX e atualiza todos os livros em lote.
 * Sincroniza preço + dados físicos no Bling apenas para livros onde esses campos mudaram.
 */
export async function batchImportBooksAction(rows: BookImportRow[]): Promise<{
  updated: number;
  blingUpdated: number;
  errors: string[];
}> {
  if (!rows.length) return { updated: 0, blingUpdated: 0, errors: [] };

  const supabase = await createAdminClient();
  const ids = rows.map((r) => r.id);

  // Busca estado atual para detectar mudanças que precisam ir pro Bling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from("books")
    .select("id, price, sku, weight_grams, height_cm, width_cm, length_cm, bling_product_id")
    .in("id", ids) as { data: Array<{
      id: string; price: number; sku: string | null;
      weight_grams: number | null; height_cm: number | null;
      width_cm: number | null; length_cm: number | null;
      bling_product_id: number | null;
    }> | null };

  const currentMap = new Map((current ?? []).map((b) => [b.id, b]));

  let updated = 0;
  let blingUpdated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const { id, ...fields } = row;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("books").update(fields).eq("id", id);
      if (error) { errors.push(`"${row.title}": ${error.message}`); continue; }
      updated++;

      const curr = currentMap.get(id);
      if (!curr?.bling_product_id) continue;

      const needsBlingSync =
        row.price !== curr.price ||
        row.sku !== curr.sku ||
        row.weight_grams !== curr.weight_grams ||
        row.height_cm !== curr.height_cm ||
        row.width_cm !== curr.width_cm ||
        row.length_cm !== curr.length_cm;

      if (needsBlingSync) {
        try {
          await safePatchBlingProductFisicos({
            blingProductId: curr.bling_product_id,
            preco: row.price > 0 ? row.price : null,
            codigo: row.sku ?? null,
            pesoBrutoKg: row.weight_grams ? row.weight_grams / 1000 : null,
            alturaCm: row.height_cm ?? null,
            larguraCm: row.width_cm ?? null,
            profundidadeCm: row.length_cm ?? null,
          });
          blingUpdated++;
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) {
          errors.push(`Bling "${row.title}": ${String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`"${row.title}": ${String(e)}`);
    }
  }

  revalidatePath("/admin/editora/livros");
  revalidatePath("/editora/livros", "layout");
  return { updated, blingUpdated, errors };
}
