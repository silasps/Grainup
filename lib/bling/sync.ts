/**
 * Bling ↔ GrainUp — funções de sincronização
 *
 * syncStockFromBling: webhook de estoque do Bling → atualiza books.stock no Supabase
 * pushOrderToBling:   pedido pago no GrainUp    → cria pedido de venda no Bling
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, createBlingOrder, type BlingOrderPayload } from "./client";

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
      id, order_number, created_at, subtotal, shipping_cost,
      customer_name, customer_email,
      shipping_street, shipping_number, shipping_complement,
      shipping_neighborhood, shipping_city, shipping_state, shipping_cep,
      order_items(title, quantity, unit_price, book_id, books(sku))
    `)
    .eq("id", orderId)
    .single() as { data: Record<string, unknown> | null };

  if (!order) throw new Error("Pedido não encontrado.");

  const items = (order.order_items as Array<{
    title: string; quantity: number; unit_price: number;
    books: { sku: string | null } | null;
  }>);

  const payload: BlingOrderPayload = {
    numero_loja: String(order.order_number),
    data: new Date(order.created_at as string).toISOString().slice(0, 10),
    contato: { nome: order.customer_name as string, email: order.customer_email as string },
    itens: items.map((i) => ({
      codigo: i.books?.sku ?? i.title,
      descricao: i.title,
      quantidade: i.quantity,
      valor_unitario: i.unit_price,
    })),
    parcelas: [{ valor: (order.subtotal as number) + (order.shipping_cost as number || 0), forma_pagamento: { id: 1 } }],
    transporte: {
      frete_por_conta: "D",
      valor_frete: order.shipping_cost as number || 0,
      endereco: {
        endereco: order.shipping_street as string,
        numero: order.shipping_number as string,
        complemento: order.shipping_complement as string | undefined,
        bairro: order.shipping_neighborhood as string,
        municipio: order.shipping_city as string,
        uf: order.shipping_state as string,
        cep: (order.shipping_cep as string).replace(/\D/g, ""),
      },
    },
  };

  const result = await createBlingOrder(payload);

  // Salva o ID do pedido Bling no registro do pedido (adicionar coluna bling_order_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("orders").update({ bling_order_id: result.id }).eq("id", orderId);
  console.log(`[Bling] Pedido ${order.order_number} enviado → ID Bling ${result.id}`);
}
