/**
 * Bling ↔ GrainUp — funções de sincronização
 *
 * syncStockFromBling: webhook de estoque do Bling → atualiza books.stock no Supabase
 * pushOrderToBling:   pedido pago no GrainUp    → cria pedido de venda no Bling
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, createBlingProduct, createBlingOrder, createBlingNfe, sendBlingNfe, getBlingNfe, findOrCreateBlingContact, resolvePaymentFormId, resolveLivrosGrupoId, type BlingOrderPayload, type BlingNfePayload } from "./client";

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

  // Reivindica atomicamente ANTES de criar qualquer coisa no Bling. pushOrderToBling pode ser
  // disparado concorrentemente por até 4 gatilhos (webhook Mercado Pago, confirmação do
  // checkout, polling do checkout, sync manual do admin) — o check acima é check-then-act e
  // não impede que duas chamadas passem por ele ao mesmo tempo, cada uma criando seu próprio
  // pedido+NF-e duplicado no Bling. -1 é um marcador temporário de "em processamento",
  // substituído pelo ID real do pedido Bling assim que createBlingOrder retornar. Se a chamada
  // falhar antes disso (ex.: erro ao resolver contato/produto), o claim expira sozinho depois
  // de 2 min (comparando com `updated_at`, atualizado automaticamente pelo trigger da tabela)
  // e uma nova tentativa pode reivindicar de novo — sem isso, o pedido ficaria travado em -1
  // exigindo "Desvincular do Bling" manualmente a cada falha transitória.
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimed } = await (supabase as any)
    .from("orders")
    .update({ bling_order_id: -1 })
    .eq("id", orderId)
    .or(`bling_order_id.is.null,and(bling_order_id.eq.-1,updated_at.lt.${staleThreshold})`)
    .select("id");
  if (!claimed || claimed.length === 0) {
    console.log(`[Bling] Pedido ${order.order_number} já está sendo processado por outra chamada concorrente, ignorando.`);
    return;
  }

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

  // Método de envio exibido ao cliente no checkout (ex: "Envio Econômico", "PAC"), salvo em
  // shipping_address.method. Mesmo fallback usado no admin (components/admin/pedidos-table.tsx).
  const shippingMethod = addr.method ?? (frete === 0 ? "Frete grátis" : null);
  const observacoes = `Editora Jocum: ${order.order_number}${shippingMethod ? ` — ${shippingMethod}` : ""}`;

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
    observacoes,
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

  // Usa POST /nfe diretamente (não gerar-nfe) porque o endpoint gerar-nfe herda fretePorConta
  // e o transportador do pedido, mas NÃO herda o valor monetário do frete (frete: null na NF-e).
  // Com POST /nfe passamos frete, CFOP e CSOSN explicitamente.
  try {
    const buyerUf = (addr.state ?? "").toUpperCase();
    const companyUf = (process.env.BLING_COMPANY_UF ?? "PR").toUpperCase();
    const cfop = buyerUf === companyUf ? "5101" : "6107";

    const nfeItens = blingItems.map(item => ({
      codigo: item.codigo || item.descricao.slice(0, 60),
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor: item.valor,
      unidade: "UN",
      classificacaoFiscal: "49019900",  // NCM livros
      origem: 0,                         // 0 = nacional
      cfop,
      tributacao: { csosn: 300 },       // 300 = Imune ICMS (livros, Art. 150 CF)
    }));

    const nfePayload: BlingNfePayload = {
      pedido: { id: result.id },
      observacoes,
      contato: { id: contatoId },
      dataOperacao: orderDate,
      itens: nfeItens,
      parcelas: [{ valor: parcelaTotal, data: orderDate, formaPagamento }],
      transporte: {
        fretePorConta: 0,
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

    const nfe = await createBlingNfe(nfePayload);
    if (!nfe?.id) throw new Error("POST /nfe não retornou ID");
    console.log(`[Bling] NF-e gerada → ID ${nfe.id}`);

    // Salva o ID já aqui, antes de tentar transmitir/consultar. A autorização SEFAZ é
    // assíncrona e o vínculo pedido→notaFiscal no Bling propaga com atraso — sem este ID
    // salvo, um "reenviar" logo em seguida não encontrava esta NF-e e criava outra do zero.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("orders").update({ bling_nfe_id: nfe.id }).eq("id", orderId);

    // Transmite ao SEFAZ automaticamente
    await sendBlingNfe(nfe.id);
    console.log(`[Bling] NF-e ${nfe.id} transmitida ao SEFAZ`);

    // Autorização SEFAZ não é instantânea — espera alguns segundos antes de desistir,
    // para que a chave de acesso já venha pronta no primeiro clique sempre que possível.
    let nfeDetails = await getBlingNfe(nfe.id);
    for (let attempt = 0; !nfeDetails?.chaveAcesso && attempt < 4; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      nfeDetails = await getBlingNfe(nfe.id);
    }

    if (nfeDetails?.chaveAcesso) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("orders").update({
        invoice_number: nfeDetails.chaveAcesso,
        invoice_url: nfeDetails.linkDanfe || null,
      }).eq("id", orderId);
      console.log(`[Bling] Chave de acesso salva → ${nfeDetails.chaveAcesso}`);
    } else {
      console.warn(`[Bling] NF-e ${nfe.id} ainda sem chave de acesso após espera — SEFAZ deve autorizar em breve; use "Sincronizar" para atualizar.`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Bling] Falha ao gerar/transmitir NF-e para pedido ${result.id}: ${msg}`);
    console.error("[Bling] → Admin pode gerar manualmente no Bling: Vendas → Pedidos de Venda → Gerar NF-e");
  }
}
