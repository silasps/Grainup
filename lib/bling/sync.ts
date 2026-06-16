/**
 * Bling ↔ GrainUp — funções de sincronização
 *
 * syncStockFromBling: webhook de estoque do Bling → atualiza books.stock no Supabase
 * pushOrderToBling:   pedido pago no GrainUp    → cria pedido de venda no Bling
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBlingProductBySku, createBlingOrder, createBlingNfe, sendBlingNfe, getBlingNfe, findOrCreateBlingContact, getBlingPaymentForms, type BlingOrderPayload } from "./client";

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
      customer_name, customer_email, customer_cpf, shipping_address, payment_method,
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

  type BlingItem = { produto?: { id: number }; codigo: string; descricao: string; quantidade: number; valor: number };
  const blingItems: BlingItem[] = [];

  async function resolveItem(sku: string | null, title: string): Promise<Pick<BlingItem, "produto" | "codigo">> {
    const code = sku ?? title;
    const blingProduct = await getBlingProductBySku(code);
    // NF-e exige "codigo" mesmo quando produto.id é fornecido
    if (blingProduct) return { produto: { id: blingProduct.id }, codigo: blingProduct.codigo || code };
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

  // Mapeia o método de pagamento do pedido para a forma de pagamento no Bling.
  // Tenta por código SEFAZ (tipoPagamento) e, se não achar, por nome (descricao).
  const VALID_SEFAZ = new Set(["01","02","03","04","05","10","11","12","13","14","15","16","17","18","19","90","99"]);
  const paymentMethod = order.payment_method as string | null;
  const sefazCodeMap: Record<string, string> = { pix: "17", credito: "03", debito: "04", boleto: "15" };
  const nameKeywordMap: Record<string, string[]> = {
    // "dinheiro" como fallback para PIX — código SEFAZ 01 é válido e aceito pela SEFAZ
    pix: ["pix", "dinheiro"],
    credito: ["crédito", "credito", "credit", "cartão", "cartao"],
    debito: ["débito", "debito", "debit", "cartão", "cartao"],
    boleto: ["boleto"],
  };
  const targetSefazCode = paymentMethod ? (sefazCodeMap[paymentMethod] ?? "99") : "99";
  const targetKeywords = paymentMethod ? (nameKeywordMap[paymentMethod] ?? []) : [];

  // IDs fixos do .env — evita depender do escopo OAuth /formas-pagamentos (que pode não estar habilitado)
  const envFormId =
    (paymentMethod === "pix" && process.env.BLING_PAYMENT_FORM_PIX)
      ? parseInt(process.env.BLING_PAYMENT_FORM_PIX, 10)
      : process.env.BLING_PAYMENT_FORM_DEFAULT
        ? parseInt(process.env.BLING_PAYMENT_FORM_DEFAULT, 10)
        : null;

  // Se não tiver .env configurado, tenta buscar via API como fallback
  let finalFormId: number | null = envFormId;
  if (!finalFormId) {
    const paymentForms = await getBlingPaymentForms();
    const activeForms = paymentForms.filter(f => f.situacao === "A");
    const matchedForm =
      activeForms.find(f => VALID_SEFAZ.has(f.tipoPagamento) && f.tipoPagamento === targetSefazCode)
      ?? activeForms.find(f => targetKeywords.some(kw => f.descricao.toLowerCase().includes(kw)))
      ?? activeForms.find(f => VALID_SEFAZ.has(f.tipoPagamento))
      ?? activeForms[0];
    finalFormId = matchedForm?.id ?? null;
    if (!finalFormId) console.warn("[Bling] Nenhuma forma de pagamento encontrada. Parcela sem formasPagamento.");
  }
  console.log(`[Bling] Forma de pagamento: método=${paymentMethod}, formId=${finalFormId}`);

  const formasPagamento = finalFormId
    ? [{ forma: { id: finalFormId }, valor: parcelaTotal }]
    : undefined;

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

  const payload: BlingOrderPayload = {
    observacoes: `Editora Jocum: ${order.order_number}`,
    data: orderDate,
    contato: { id: contatoId },
    itens: blingItems,
    parcelas: [{ valor: parcelaTotal, dataVencimento: orderDate, formasPagamento }],
    transporte: {
      fretePorConta: 1,  // 1 = Remetente (Bling v3 usa inteiro, não string "R")
      frete,
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

  // Cria NF-e com todos os campos obrigatórios explícitos.
  // pedido: { id } apenas vincula a NF-e ao pedido; a Bling NÃO auto-popula itens/contato/data a partir dele.
  const condicaoId = process.env.BLING_CONDICAO_PAGAMENTO_ID
    ? parseInt(process.env.BLING_CONDICAO_PAGAMENTO_ID, 10)
    : undefined;

  // CFOP: 5xxx = intra-estadual, 6xxx = inter-estadual.
  // Editora Jocum fica em PR; clientes em outro estado exigem CFOP começando com 6.
  const companyUf = (process.env.BLING_COMPANY_UF ?? "PR").toUpperCase();
  const customerUf = (addr.state ?? "").toUpperCase();
  const isInterstate = customerUf && customerUf !== companyUf;

  // Monta os itens da NF-e adicionando unidade e CFOP correto.
  // CFOP do produto no Bling é intra-estadual (5xxx). Para inter-estadual, troca o primeiro dígito 5→6.
  const nfeItens = blingItems.map(item => ({
    ...item,
    unidade: "UN",
    ...(isInterstate ? { cfop: "6101" } : { cfop: "5101" }),
  }));

  // Data de emissão da NF-e = hoje (Bling rejeita datas no passado para "data de operação")
  const today = new Date().toISOString().slice(0, 10);

  try {
    const nfe = await createBlingNfe({
      pedido: { id: result.id },
      contato: {
        id: contatoId,
        nome: order.customer_name as string,
        endereco: {
          municipio: addr.city ?? "",
          uf: addr.state ?? "",
          cep,
          endereco: addr.street ?? "",
          numero: addr.number ?? "S/N",
          bairro: addr.neighborhood ?? "",
          complemento: addr.complement || undefined,
        },
      },
      dataOperacao: today,
      itens: nfeItens,
      parcelas: [{
        valor: parcelaTotal,
        data: today,
        formaPagamento: finalFormId ? { id: finalFormId } : undefined,
      }],
      transporte: payload.transporte,
      condicaoPagamentoId: condicaoId,
    });
    console.log(`[Bling] NF-e criada → ID ${nfe.id} | CFOP=${isInterstate ? "inter" : "intra"}-estadual`);

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
    console.error("[Bling] Falha ao criar/transmitir NF-e (admin pode gerar no Bling):", err);
  }
}
