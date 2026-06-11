/**
 * Bling ↔ GrainUp — funções de sincronização
 *
 * syncStockFromBling: webhook de estoque do Bling → atualiza books.stock no Supabase
 * pushOrderToBling:   pedido pago no GrainUp    → cria pedido de venda no Bling
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, createBlingOrder, findOrCreateBlingContact, type BlingOrderPayload } from "./client";

/** Chamado pelo webhook do Bling quando estoque muda */
export async function syncStockFromBling(blingProductId: number, sku: string, newStock: number) {
  const supabase = await createAdminClient();

  // Tenta match por campo `sku` na tabela books (adicionar coluna sku quando integrar)
  const { error } = await supabase
    .from("books")
    .update({ stock: newStock })
    .eq("sku", sku); // TODO: garantir que books.sku existe e está preenchido com o código Bling

  if (error) throw new Error(`Erro ao sincronizar estoque: ${error.message}`);
  console.log(`[Bling] Estoque atualizado — SKU ${sku} → ${newStock}`);
}

/** Chamado após pagamento confirmado para registrar o pedido no Bling */
export async function pushOrderToBling(orderId: string) {
  const supabase = await createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, created_at, total, subtotal, shipping_cost,
      customer_name, customer_email, shipping_address,
      order_items(title, quantity, unit_price, book_id, combo_id, books(sku))
    `)
    .eq("id", orderId)
    .single() as { data: Record<string, unknown> | null };

  if (!order) throw new Error("Pedido não encontrado.");

  type RawItem = {
    title: string; quantity: number; unit_price: number;
    book_id: string | null; combo_id: string | null;
    books: { sku: string | null } | null;
  };

  const rawItems = order.order_items as RawItem[];

  type BlingItem = { produto?: { id: number }; codigo?: string; descricao: string; quantidade: number; valor: number };
  const blingItems: BlingItem[] = [];

  async function resolveItem(sku: string | null, title: string): Promise<Pick<BlingItem, "produto" | "codigo">> {
    const code = sku ?? title;
    const blingProduct = await getBlingProductBySku(code);
    if (blingProduct) return { produto: { id: blingProduct.id } };
    return { codigo: code };
  }

  for (const item of rawItems) {
    if (!item.combo_id) {
      const ref = await resolveItem(item.books?.sku ?? null, item.title);
      blingItems.push({ ...ref, descricao: item.title, quantidade: item.quantity, valor: item.unit_price });
      continue;
    }

    const { data: comboBooks } = await supabase
      .from("combo_items")
      .select("quantity, books(title, sku, price)")
      .eq("combo_id", item.combo_id) as {
        data: Array<{ quantity: number; books: { title: string; sku: string | null; price: number } | null }> | null
      };

    if (!comboBooks || comboBooks.length === 0) {
      blingItems.push({ codigo: item.combo_id, descricao: item.title, quantidade: item.quantity, valor: item.unit_price });
      continue;
    }

    const somaPrecos = comboBooks.reduce((acc, cb) => acc + (cb.books?.price ?? 0) * cb.quantity, 0);
    for (const cb of comboBooks) {
      if (!cb.books) continue;
      const fator = somaPrecos > 0 ? (cb.books.price * cb.quantity) / somaPrecos : 1 / comboBooks.length;
      const precoUnitarioProporcional = somaPrecos > 0
        ? (item.unit_price * fator) / cb.quantity
        : item.unit_price / comboBooks.length;
      const ref = await resolveItem(cb.books.sku, cb.books.title);
      blingItems.push({
        ...ref,
        descricao: cb.books.title,
        quantidade: item.quantity * cb.quantity,
        valor: Math.round(precoUnitarioProporcional * 100) / 100,
      });
    }
  }

  const contatoId = await findOrCreateBlingContact(
    order.customer_name as string,
    order.customer_email as string,
  );

  const orderDate = new Date(order.created_at as string).toISOString().slice(0, 10);
  const frete = (order.shipping_cost as number) || 0;
  const itensTotal = Math.round(blingItems.reduce((s, i) => s + i.valor * i.quantidade, 0) * 100) / 100;
  // frete_por_conta "R" = remetente cobra o frete e aparece na NF-e. Parcelas = itens + frete.
  const parcelaTotal = Math.round((itensTotal + frete) * 100) / 100;
  const addr = (order.shipping_address ?? {}) as Record<string, string>;

  const payload: BlingOrderPayload = {
    numero_loja: String(order.order_number),
    data: orderDate,
    contato: { id: contatoId },
    itens: blingItems,
    parcelas: [{ valor: parcelaTotal, dataVencimento: orderDate }],
    transporte: {
      frete_por_conta: "R",
      valor_frete: frete,
      endereco: {
        endereco: addr.street ?? "",
        numero: addr.number ?? "S/N",
        complemento: addr.complement || undefined,
        bairro: addr.neighborhood ?? "",
        municipio: addr.city ?? "",
        uf: addr.state ?? "",
        cep: (addr.cep ?? addr.zip_code ?? "").replace(/\D/g, ""),
      },
    },
  };

  const result = await createBlingOrder(payload);

  // Salva o ID do pedido Bling no registro do pedido (adicionar coluna bling_order_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("orders").update({ bling_order_id: result.id }).eq("id", orderId);
  console.log(`[Bling] Pedido ${order.order_number} enviado → ID Bling ${result.id}`);
}
