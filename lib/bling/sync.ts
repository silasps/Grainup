/**
 * Bling ↔ GrainUp — funções de sincronização
 *
 * syncStockFromBling: webhook de estoque do Bling → atualiza books.stock no Supabase
 * pushOrderToBling:   pedido pago no GrainUp    → cria pedido de venda no Bling
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, createBlingProduct, createBlingOrder, createBlingNfe, sendBlingNfe, getBlingNfe, generateBlingNfeFromOrder, findOrCreateBlingContact, resolvePaymentFormId, resolveLivrosGrupoId, type BlingOrderPayload } from "./client";

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
      customer_name, customer_email, customer_cpf, shipping_address, payment_method, bling_order_id,
      order_items(title, quantity, unit_price, book_id, combo_id, books(sku, price))
    `)
    .eq("id", orderId)
    .single() as { data: Record<string, unknown> | null };

  if (!order) throw new Error("Pedido não encontrado.");
  // Guard: evita duplicatas se o webhook disparar mais de uma vez para o mesmo pagamento
  if (order.bling_order_id) { console.log(`[Bling] Pedido ${order.order_number} já enviado (ID ${order.bling_order_id}), ignorando.`); return; }

  type RawItem = {
    title: string; quantity: number; unit_price: number;
    book_id: string | null; combo_id: string | null;
    books: { sku: string | null; price: number } | null;
  };

  const rawItems = order.order_items as RawItem[];

  // produto.id é válido em itens de PEDIDO (para vincular sem criar novo produto).
  // Em itens de NF-e produto.id NÃO existe — nfeItens é construído separadamente sem esse campo.
  type BlingItem = { produto?: { id: number }; codigo?: string; descricao: string; quantidade: number; valor: number };
  const blingItems: BlingItem[] = [];

  async function resolveItem(sku: string | null, title: string, bookId: string | null, price?: number): Promise<Pick<BlingItem, "produto" | "codigo">> {
    const code = sku ?? title;
    const blingProduct = await getBlingProductBySku(code);
    if (blingProduct) return { produto: { id: blingProduct.id }, codigo: blingProduct.codigo || code };

    // Produto não está no Bling — cria automaticamente com categoria, grupo e NCM corretos.
    // Sem o grupo, a regra da natureza de operação não é encontrada → CFOP vazio → NF-e falha.
    try {
      const categoriaId = process.env.BLING_CATEGORIA_LIVROS_ID
        ? parseInt(process.env.BLING_CATEGORIA_LIVROS_ID, 10)
        : undefined;
      const grupoId = resolveLivrosGrupoId();
      const created = await createBlingProduct({
        nome: title,
        codigo: sku || undefined,
        preco: price ?? 0,
        formato: "S", situacao: "A", tipo: "P", unidade: "UN",
        tributacao: {
          ncm: "4901.99.00", origem: 0,
          ...(grupoId ? { grupoProduto: { id: grupoId } } : {}),
        },
        ...(categoriaId ? { categoria: { id: categoriaId } } : {}),
      });
      console.log(`[Bling] Produto criado automaticamente: "${title}" → ID ${created.id}`);
      // Salva o bling_product_id no nosso DB para futuras sincronizações
      if (bookId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("books")
          .update({ bling_product_id: created.id, bling_ncm_synced: true })
          .eq("id", bookId);
      }
      return { produto: { id: created.id }, codigo: created.codigo || code };
    } catch (e) {
      console.error(`[Bling] Falha ao criar produto "${title}":`, e);
      return {};
    }
  }

  for (const item of rawItems) {
    if (!item.combo_id) {
      const ref = await resolveItem(item.books?.sku ?? null, item.title, item.book_id, item.books?.price);
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
      const ref = await resolveItem(cb.books.sku, cb.books.title, null, cb.books.price);
      blingItems.push({
        ...ref,
        descricao: cb.books.title,
        quantidade: item.quantity * cb.quantity,
        valor: Math.round(precoUnitarioProporcional * 100) / 100,
      });
    }
  }

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const cep = (addr.cep ?? addr.zip_code ?? "").replace(/\D/g, "");

  const contatoId = await findOrCreateBlingContact(
    order.customer_name as string,
    order.customer_email as string,
    {
      rua: addr.street ?? "",
      numero: addr.number ?? "S/N",
      bairro: addr.neighborhood ?? "",
      municipio: addr.city ?? "",
      uf: addr.state ?? "",
      cep,
      complemento: addr.complement || undefined,
    },
    order.customer_cpf as string | null,
  );

  const orderDate = new Date(order.created_at as string).toISOString().slice(0, 10);
  const frete = Math.round(((order.shipping_cost as number) || 0) * 100) / 100;
  const orderTotal = Math.round((order.total as number) * 100) / 100;
  const targetItemsTotal = Math.round((orderTotal - frete) * 100) / 100;
  // Bling v3 valida: sum(parcelas) == sum(itens) + frete. Quando frete=0 era só itens, agora inclui frete.
  const parcelaTotal = orderTotal;

  const paymentMethod = order.payment_method as string | null;
  const finalFormId = await resolvePaymentFormId(paymentMethod);

  const formaPagamento = finalFormId ? { id: finalFormId } : undefined;

  if (blingItems.length > 0) {
    for (const item of blingItems) {
      item.valor = Math.round(item.valor * 100) / 100;
    }
    const rawTotal = blingItems.reduce((s, i) => s + i.valor * i.quantidade, 0);
    let assigned = 0;
    for (let i = 0; i < blingItems.length - 1; i++) {
      const proportion = rawTotal > 0 ? (blingItems[i].valor * blingItems[i].quantidade) / rawTotal : 1 / blingItems.length;
      const itemTotal = Math.round(targetItemsTotal * proportion * 100) / 100;
      blingItems[i].valor = Math.round((itemTotal / blingItems[i].quantidade) * 100) / 100;
      assigned = Math.round((assigned + blingItems[i].valor * blingItems[i].quantidade) * 100) / 100;
    }
    const last = blingItems[blingItems.length - 1];
    const remaining = Math.round((targetItemsTotal - assigned) * 100) / 100;
    last.valor = Math.round((remaining / last.quantidade) * 100) / 100;
  }

  // Mapeamento de código Correios → nome do serviço para o campo `volumes.servico` no Bling
  const serviceCodeToName: Record<string, string> = {
    "03298": "PAC",
    "03220": "SEDEX",
    "03158": "SEDEX 10",
  };

  const serviceCode = (addr.serviceCode ?? null) as string | null;
  const serviceName = serviceCode ? (serviceCodeToName[serviceCode] ?? null) : null;

  // BLING_TRANSPORTADORA_CORREIOS_ID = ID dos Correios cadastrado como CONTATO no Bling
  // (Cadastros → Contatos → buscar Correios). Não existe campo "transportadora" no Bling v3 —
  // o transportador vai em transporte.contato conforme SDK oficial.
  const blingCorreiosContatoId = process.env.BLING_TRANSPORTADORA_CORREIOS_ID
    ? parseInt(process.env.BLING_TRANSPORTADORA_CORREIOS_ID, 10)
    : null;

  if (!blingCorreiosContatoId) {
    console.warn("[Bling] BLING_TRANSPORTADORA_CORREIOS_ID não configurado — NF-e ficará sem transportadora. " +
      "Busque os Correios em Bling → Cadastros → Contatos e adicione o ID numérico.");
  }

  const payload: BlingOrderPayload = {
    observacoes: `Editora Jocum: ${order.order_number}`,
    data: orderDate,
    contato: { id: contatoId },
    itens: blingItems,
    parcelas: [{ dataVencimento: orderDate, valor: parcelaTotal, formaPagamento }],
    transporte: {
      fretePorConta: 0,  // 0 = Remetente/CIF (SEFAZ: 0=CIF, 1=FOB, 9=Sem frete)
      frete,
      ...(blingCorreiosContatoId ? { contato: { id: blingCorreiosContatoId, nome: "Correios" } } : {}),
      ...(serviceName ? { volumes: [{ id: 0, servico: serviceName, especie: "Volumes", quantidade: 1 }] } : {}),
      etiqueta: {
        nome: order.customer_name as string,
        endereco: addr.street ?? "",
        numero: addr.number ?? "S/N",
        complemento: addr.complement || undefined,
        bairro: addr.neighborhood ?? "",
        municipio: addr.city ?? "",
        uf: addr.state ?? "",
        cep,
      },
    },
  };

  const result = await createBlingOrder(payload);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("orders").update({ bling_order_id: result.id }).eq("id", orderId);
  console.log(`[Bling] Pedido ${order.order_number} enviado → ID Bling ${result.id}`);

  // Usa POST /pedidos/vendas/{id}/gerar-nfe — Bling gera a NF-e internamente aplicando
  // as regras da natureza de operação (CFOP, CSOSN) com base na categoria do produto.
  // Isso é correto porque o Bling tem acesso aos dados completos do produto (categoria, tributação).
  try {
    const nfe = await generateBlingNfeFromOrder(result.id);
    if (!nfe) throw new Error("gerar-nfe não retornou ID");
    console.log(`[Bling] NF-e gerada → ID ${nfe.id}`);

    // Transmite ao SEFAZ automaticamente
    await sendBlingNfe(nfe.id);
    console.log(`[Bling] NF-e ${nfe.id} transmitida ao SEFAZ`);

    // Busca chave de acesso e salva no pedido para exibir "NF emitida" na plataforma
    const nfeDetails = await getBlingNfe(nfe.id);
    if (nfeDetails?.chaveAcesso) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("orders").update({
        invoice_number: nfeDetails.chaveAcesso,
        invoice_url: nfeDetails.linkDanfe || null,
      }).eq("id", orderId);
      console.log(`[Bling] Chave de acesso salva → ${nfeDetails.chaveAcesso}`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Bling] Falha ao gerar/transmitir NF-e para pedido ${result.id}: ${msg}`);
    console.error("[Bling] → Admin pode gerar manualmente no Bling: Vendas → Pedidos de Venda → Gerar NF-e");
  }
}
