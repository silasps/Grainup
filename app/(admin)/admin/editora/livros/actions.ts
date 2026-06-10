"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku } from "@/lib/bling/client";

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
  error?: string;
}> {
  if (!process.env.BLING_API_KEY) return { found: false };
  try {
    const product = await getBlingProductBySku(sku);
    if (!product) return { found: false };
    return {
      found: true,
      name: product.nome,
      stock: product.estoque?.saldoFisico ?? 0,
    };
  } catch {
    return { found: false };
  }
}
