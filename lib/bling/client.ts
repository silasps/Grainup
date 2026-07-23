/**
 * Bling ERP v3 — cliente HTTP com OAuth2
 * Tokens gerenciados em lib/bling/auth.ts (tabela bling_tokens no Supabase)
 */

import { getAccessToken } from "./auth";

const BASE_URL = "https://www.bling.com.br/Api/v3";
const REQUEST_TIMEOUT_MS = 12_000;

export class BlingError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BlingError";
  }
}

async function blingFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new BlingError(504, `O Bling não respondeu em ${REQUEST_TIMEOUT_MS / 1000}s. Aguarde alguns minutos e tente novamente.`);
    }
    throw err;
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`[Bling] ERRO ${res.status} em ${options?.method ?? "GET"} ${path}:`, body);
    if (res.status === 401) throw new BlingError(401, "Token Bling expirado ou inválido. Reconecte em Configurações → Bling ERP.");
    if (res.status === 403) throw new BlingError(403, "Permissão insuficiente no Bling. Adicione os módulos 'Contatos' e 'Pedidos de Venda' nas permissões do app e reconecte em Configurações.");
    if (res.status >= 500) throw new BlingError(res.status, "O Bling está temporariamente fora do ar (erro " + res.status + "). Aguarde alguns minutos e tente novamente.");
    let msg = body;
    try {
      const parsed = JSON.parse(body);
      const fields = parsed?.error?.fields;
      if (fields?.length) msg = fields.map((f: { msg: string }) => f.msg).join(" | ");
      else msg = parsed?.error?.description || parsed?.error?.message || body;
    } catch {}
    throw new BlingError(res.status, `Bling: ${msg}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// ── Produtos ─────────────────────────────────────────────────────────────────

export interface BlingProduct {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  pesoBruto?: number | null;
  largura?: number | null;
  altura?: number | null;
  profundidade?: number | null;
  estoque: { saldoFisico: number; saldoVirtual: number } | null;
  classificacaoFiscal?: string | null; // NCM — preenchido = dados fiscais ok
}

export async function getBlingProductBySku(sku: string): Promise<BlingProduct | null> {
  try {
    const data = await blingFetch<{ data: BlingProduct[] }>(`/produtos?codigo=${encodeURIComponent(sku)}`);
    return data.data?.[0] ?? null;
  } catch (err) {
    // 5xx / timeout: Bling fora do ar — propaga para abortar o envio do pedido
    if (err instanceof BlingError && err.status >= 500) throw err;
    // 403 (sem scope de Produtos) ou 404 → produto não cadastrado no Bling, usa código livre
    return null;
  }
}

export async function getAllBlingProducts(): Promise<BlingProduct[]> {
  const all: BlingProduct[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = await blingFetch<{ data: BlingProduct[] }>(`/produtos?pagina=${page}&limite=100`);
    const items = data.data ?? [];
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

export interface BlingProductPayload {
  nome: string;
  codigo?: string;
  preco?: number;
  tipo?: "P" | "S" | "N"; // P = Produto, S = Serviço, N = Serviço 06/21/22 (obrigatório no PUT)
  formato?: "S" | "E" | "V"; // S = Simples, E = Estrutura/Composição, V = Variação (obrigatório no PUT)
  situacao?: "A" | "I"; // obrigatório no PUT
  unidade?: string;
  categoria?: { id: number }; // categoria do produto (organizacional — NÃO é o que define CFOP/CSOSN)
  tributacao?: {
    ncm?: string;    // ex: "4901.99.00" (livros)
    origem?: number; // 0 = nacional
    // Grupo de Produtos: é ISTO (aninhado em tributacao, não na raiz do produto) que a
    // naturezaOperacao usa pra achar a regra de CFOP/CSOSN. Confirmado via GET /produtos/{id}
    // em produção — não existe endpoint /grupos na API v3 (404), então o ID só pode vir de
    // BLING_GRUPO_LIVROS_ID (confirmado manualmente no Bling) ou de um produto já correto.
    grupoProduto?: { id: number };
  };
}

export async function createBlingProduct(payload: BlingProductPayload): Promise<{ id: number; codigo: string }> {
  const data = await blingFetch<{ data: { id: number; codigo: string } }>("/produtos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data;
}

/**
 * Altera APENAS o campo `codigo` de um produto no Bling.
 * Busca o produto completo, substitui só o codigo, e devolve tudo —
 * garantindo que nenhum outro campo seja apagado.
 */
export async function safePatchBlingProductCodigo(blingProductId: number, newCodigo: string): Promise<void> {
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  // Remove campos que o Bling não aceita no PUT (somente leitura / computados)
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;
  product.codigo = newCodigo;
  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function safePatchBlingProductNcm(blingProductId: number, ncm: string): Promise<void> {
  // GET completo → modifica só tributacao.ncm → PUT completo (preserva categoria, dimensões, etc.)
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;
  const tributacao = (product.tributacao as Record<string, unknown>) ?? {};
  product.tributacao = { ...tributacao, ncm, origem: tributacao.origem ?? 0 };
  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function safePatchBlingProductCategoria(blingProductId: number, categoriaId: number): Promise<void> {
  // GET completo → muda só categoria → PUT completo (preserva NCM, dimensões, código, etc.)
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;
  product.categoria = { id: categoriaId };
  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

/**
 * Atualiza nome, código, preço e dados fiscais (NCM/categoria) de um produto no Bling
 * após edição de um livro na plataforma.
 * Usa safePatch: GET completo → altera apenas os campos fornecidos → PUT completo.
 * NUNCA usar updateBlingProduct() (PUT parcial) aqui — o Bling v3 trata PUT como substituição
 * total do registro, então qualquer campo omitido (ex: grupo) é apagado no Bling.
 * Foi exatamente isso que zerou o Grupo de Produtos e quebrou o CFOP/CSOSN da NF-e no passado.
 */
export async function safePatchBlingProductFiscal(blingProductId: number, payload: {
  nome?: string;
  codigo?: string;
  preco?: number;
  ncm?: string;
  categoriaId?: number;
}): Promise<void> {
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;

  if (payload.nome != null) product.nome = payload.nome;
  if (payload.codigo != null) product.codigo = payload.codigo;
  if (payload.preco != null) product.preco = payload.preco;
  if (payload.ncm != null) {
    // Spread de tributacao preserva grupoProduto (CFOP/CSOSN) — nunca reconstruir esse objeto do zero.
    const tributacao = (product.tributacao as Record<string, unknown>) ?? {};
    product.tributacao = { ...tributacao, ncm: payload.ncm, origem: tributacao.origem ?? 0 };
  }
  if (payload.categoriaId != null) product.categoria = { id: payload.categoriaId };

  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function updateBlingStock(blingProductId: number, quantity: number): Promise<void> {
  await blingFetch(`/estoques`, {
    method: "POST",
    body: JSON.stringify({ produto: { id: blingProductId }, quantidade: quantity, operacao: "B" }),
  });
}

// ── Contatos ─────────────────────────────────────────────────────────────────

interface BlingEndereco {
  rua: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  complemento?: string;
}

export async function findOrCreateBlingContact(nome: string, email: string, endereco?: BlingEndereco, cpf?: string | null): Promise<number> {
  let contatoId: number | null = null;

  try {
    const found = await blingFetch<{ data: Array<{ id: number }> }>(`/contatos?email=${encodeURIComponent(email)}&situacao=A`);
    // Só reutiliza se o filtro por email funcionou (retornou exatamente 1 resultado).
    if (found.data?.length === 1 && found.data[0]?.id) contatoId = found.data[0].id;
  } catch (err) {
    // 5xx / timeout: Bling fora do ar — não adianta tentar criar o contato
    if (err instanceof BlingError && err.status >= 500) throw err;
    // 4xx (ex: scope insuficiente): tenta criar o contato mesmo assim
  }

  if (!contatoId) {
    // Bling v3: POST usa "tipo" (GET responde como "tipoPessoa")
    const payload: Record<string, unknown> = { nome, email, tipo: "F", situacao: "A" };
    if (cpf) {
      const digits = cpf.replace(/\D/g, "");
      payload.numeroDocumento = digits.length === 11
        ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
        : digits;
    }
    if (endereco) {
      payload.endereco = {
        geral: {
          endereco: endereco.rua,
          numero: endereco.numero,
          complemento: endereco.complemento ?? "",
          bairro: endereco.bairro,
          municipio: endereco.municipio,
          uf: endereco.uf,
          cep: endereco.cep,
          pais: { id: 1058 },
        },
      };
    }
    const created = await blingFetch<{ data: { id: number } }>("/contatos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    contatoId = created.data.id;
  }

  // Atualiza sempre CPF e endereço — garante dados corretos mesmo em contatos reutilizados
  try {
    const patchPayload: Record<string, unknown> = { nome, email, tipo: "F", situacao: "A" };
    if (cpf) {
      const d = cpf.replace(/\D/g, "");
      patchPayload.numeroDocumento = d.length === 11
        ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
        : d;
    }
    if (endereco) {
      patchPayload.endereco = {
        geral: {
          endereco: endereco.rua,
          numero: endereco.numero,
          complemento: endereco.complemento ?? "",
          bairro: endereco.bairro,
          municipio: endereco.municipio,
          uf: endereco.uf,
          cep: endereco.cep,
          pais: { id: 1058 },
        },
      };
    }
    await blingFetch(`/contatos/${contatoId}`, { method: "PUT", body: JSON.stringify(patchPayload) });
    console.log("[Bling] PUT /contatos ok — CPF atualizado");
  } catch (e) { console.error("[Bling] PUT /contatos falhou:", e); }

  return contatoId;
}

// ── Formas de Pagamento ───────────────────────────────────────────────────────

export interface BlingPaymentForm {
  id: number;
  descricao: string;
  // tipoPagamento código SEFAZ: 17=PIX, 3=crédito, 4=débito, 15=boleto, 99=outros (API retorna number)
  tipoPagamento: number | string;
  situacao: number | string; // API retorna 1 (ativo) ou 2 (inativo), não "A"/"I"
}

export async function getBlingPaymentForms(): Promise<BlingPaymentForm[]> {
  try {
    const data = await blingFetch<{ data: BlingPaymentForm[] }>("/formas-pagamentos");
    return data.data ?? [];
  } catch (err) {
    console.warn("[Bling] /formas-pagamentos falhou (verifique escopo OAuth):", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Descobre o ID da forma de pagamento correta no Bling para um dado método.
 * Primeiro tenta por código SEFAZ, depois por palavra-chave no nome, depois qualquer forma ativa.
 * Retorna null se nenhuma forma for encontrada (NF-e ficará sem forma de pagamento).
 */
export async function resolvePaymentFormId(paymentMethod: string | null): Promise<number | null> {
  // Prioridade 1: IDs fixos do .env (confiável, sem depender de escopo OAuth)
  const envId =
    (paymentMethod === "pix" && process.env.BLING_PAYMENT_FORM_PIX)
      ? parseInt(process.env.BLING_PAYMENT_FORM_PIX, 10)
      : process.env.BLING_PAYMENT_FORM_DEFAULT
        ? parseInt(process.env.BLING_PAYMENT_FORM_DEFAULT, 10)
        : null;
  if (envId) {
    console.log(`[Bling] Forma de pagamento (env): método=${paymentMethod}, formId=${envId}`);
    return envId;
  }

  // Prioridade 2: auto-descoberta via /formas-pagamentos
  // A API retorna tipoPagamento e situacao como números, não strings
  const sefazCodeMap: Record<string, number> = { pix: 17, credito: 3, debito: 4, boleto: 15 };
  const nameKeywordMap: Record<string, string[]> = {
    pix: ["pix"],
    credito: ["crédito", "credito", "credit", "cartão", "cartao"],
    debito: ["débito", "debito", "debit"],
    boleto: ["boleto"],
  };
  const targetSefaz = paymentMethod ? (sefazCodeMap[paymentMethod] ?? 99) : 99;
  const targetKeywords = paymentMethod ? (nameKeywordMap[paymentMethod] ?? []) : [];

  const forms = await getBlingPaymentForms();
  // situacao=1 (ativo) na API v3 — não "A"
  const active = forms.filter(f => f.situacao === 1 || String(f.situacao) === "A");

  if (active.length > 0) {
    console.log("[Bling] Formas disponíveis:", active.map(f => `${f.id}=${f.descricao}(tipo=${f.tipoPagamento})`).join(", "));
  }

  const matched =
    active.find(f => Number(f.tipoPagamento) === targetSefaz)
    ?? active.find(f => targetKeywords.some(kw => f.descricao.toLowerCase().includes(kw)))
    ?? active[0]
    ?? null;

  const formId = matched?.id ?? null;
  console.log(`[Bling] Forma resolvida: método=${paymentMethod}, sefaz=${targetSefaz}, formId=${formId} (${matched?.descricao ?? "nenhuma"})`);
  if (!formId) console.warn("[Bling] AVISO: Nenhuma forma de pagamento encontrada. NF-e ficará sem forma.");
  return formId;
}

export interface BlingCategoria {
  id: number;
  descricao: string;
}

export async function getBlingCategorias(): Promise<BlingCategoria[]> {
  try {
    // Busca todas as páginas para pegar inclusive subcategorias
    const all: BlingCategoria[] = [];
    for (let page = 1; page <= 5; page++) {
      const data = await blingFetch<{ data: BlingCategoria[] }>(`/categorias/produtos?limite=100&pagina=${page}`);
      const items = (data.data ?? []).filter(c => c.id > 0);
      all.push(...items);
      if (items.length < 100) break;
    }
    return all.sort((a, b) => a.descricao.localeCompare(b.descricao));
  } catch {
    return [];
  }
}

export interface BlingNaturezaOperacao {
  id: number;
  descricao: string;
}

export async function getBlingNaturezasOperacao(): Promise<BlingNaturezaOperacao[]> {
  try {
    const data = await blingFetch<{ data: BlingNaturezaOperacao[] }>("/naturezas-operacoes?limite=100");
    return (data.data ?? []).filter(n => n.id > 0);
  } catch {
    return [];
  }
}

export async function getBlingCategoriasRaw(): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = await blingFetch<{ data: unknown[] }>(`/categorias/produtos?limite=100&pagina=${page}`);
    const items = (data.data ?? []);
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

/**
 * Resolve o ID do Grupo de Produtos (tributacao.grupoProduto) usado pela regra de CFOP/CSOSN
 * dos livros. A API v3 do Bling NÃO expõe endpoint pra listar grupos (/grupos → 404 confirmado
 * em produção) — o ID só pode vir de configuração manual, nunca de busca por nome.
 * Configure BLING_GRUPO_LIVROS_ID lendo o valor em Bling → Configurações → Grupos de produtos,
 * ou o ID já usado num produto correto (GET /produtos/{id} → tributacao.grupoProduto.id).
 */
export function resolveLivrosGrupoId(): number | null {
  return process.env.BLING_GRUPO_LIVROS_ID
    ? parseInt(process.env.BLING_GRUPO_LIVROS_ID, 10)
    : null;
}

/**
 * Lê as dimensões de um produto no Bling e retorna em centímetros.
 * Converte automaticamente de Metros (0) ou Milímetros (2) para cm.
 * Retorna null se o produto não existir ou não tiver dimensões.
 */
export async function getBlingProductDimensions(blingProductId: number): Promise<{
  alturaCm: number | null;
  larguraCm: number | null;
  profundidadeCm: number | null;
  pesoBrutoKg: number | null;
} | null> {
  try {
    const data = await blingFetch<{ data: {
      pesoBruto?: number | null;
      dimensoes?: { largura?: number; altura?: number; profundidade?: number; unidadeMedida?: number } | null;
    } }>(`/produtos/${blingProductId}`);
    const d = data.data;
    const dim = d?.dimensoes;
    const unit = dim?.unidadeMedida ?? 1; // 0=Metros, 1=Centímetros, 2=Milímetros
    const toCm = (v?: number | null) => {
      if (v == null || v <= 0) return null;
      if (unit === 0) return Math.round(v * 100); // metros → cm
      if (unit === 2) return Math.round(v / 10);  // mm → cm
      return v; // já em cm
    };
    return {
      alturaCm: toCm(dim?.altura),
      larguraCm: toCm(dim?.largura),
      profundidadeCm: toCm(dim?.profundidade),
      pesoBrutoKg: d?.pesoBruto && d.pesoBruto > 0 ? d.pesoBruto : null,
    };
  } catch {
    return null;
  }
}

export async function safePatchBlingProductGrupo(blingProductId: number, grupoId: number): Promise<void> {
  // GET completo → muda só tributacao.grupoProduto → PUT completo (preserva NCM, categoria, código, etc.)
  // O campo fica aninhado em tributacao — setar um `grupo` na raiz do produto é ignorado pelo Bling.
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;
  const tributacao = (product.tributacao as Record<string, unknown>) ?? {};
  product.tributacao = { ...tributacao, grupoProduto: { id: grupoId } };
  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

/**
 * Restaura preço, SKU e dados físicos (peso/dimensões) de um produto no Bling.
 * Usa safePatch: GET completo → altera apenas os campos fornecidos → PUT completo.
 *
 * Unidades esperadas pelo Bling (confirmado pela doc e integração ecomplus oficial):
 *   pesoBruto/pesoLiquido: kg  →  weight_grams do DB ÷ 1000
 *   dimensoes.unidadeMedida: 1 = centímetros  →  height_cm/width_cm/length_cm direto
 */
export async function safePatchBlingProductFisicos(params: {
  blingProductId: number;
  preco?: number | null;
  codigo?: string | null;
  pesoBrutoKg?: number | null;
  alturaCm?: number | null;
  larguraCm?: number | null;
  profundidadeCm?: number | null;
}): Promise<void> {
  const { blingProductId, preco, codigo, pesoBrutoKg, alturaCm, larguraCm, profundidadeCm } = params;
  const data = await blingFetch<{ data: Record<string, unknown> }>(`/produtos/${blingProductId}`);
  const product = { ...data.data };
  delete product.id;
  delete product.estoque;
  delete product.imagens;
  delete product.dataCriacao;
  delete product.dataAlteracao;

  if (preco != null && preco > 0) product.preco = preco;
  if (codigo != null && codigo.trim() !== "") product.codigo = codigo.trim();
  if (pesoBrutoKg != null && pesoBrutoKg > 0) {
    product.pesoBruto = pesoBrutoKg;
    product.pesoLiquido = pesoBrutoKg;
  }
  if (alturaCm != null || larguraCm != null || profundidadeCm != null) {
    const existingDim = (product.dimensoes as Record<string, unknown>) ?? {};
    const newDim: Record<string, unknown> = {
      ...existingDim,
      unidadeMedida: 1, // 1 = centímetros
    };
    if (alturaCm != null && alturaCm > 0) newDim.altura = alturaCm;
    if (larguraCm != null && larguraCm > 0) newDim.largura = larguraCm;
    if (profundidadeCm != null && profundidadeCm > 0) newDim.profundidade = profundidadeCm;
    product.dimensoes = newDim;
    console.log(`[Bling] safePatchFisicos ID=${blingProductId} — existingDim=${JSON.stringify(existingDim)} → newDim=${JSON.stringify(newDim)}`);
  } else {
    console.log(`[Bling] safePatchFisicos ID=${blingProductId} — dimensões ignoradas (alturaCm=${alturaCm}, larguraCm=${larguraCm}, profundidadeCm=${profundidadeCm})`);
  }
  const res = await blingFetch<{ data: { warnings?: string[] } }>(`/produtos/${blingProductId}`, { method: "PUT", body: JSON.stringify(product) });
  if (res?.data?.warnings?.length) {
    console.warn(`[Bling] PUT produto ${blingProductId} warnings:`, res.data.warnings);
  }
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export interface BlingOrderPayload {
  // numero_loja omitido: quando enviado, o Bling classifica o pedido como "loja virtual"
  // (e-commerce), tirando-o da lista de Pedidos de Venda. Sem o campo, o pedido aparece
  // normalmente na seção Vendas > Pedidos de Venda do Bling.
  observacoes?: string;
  data: string;
  contato: { id: number };
  itens: Array<{
    produto?: { id: number };
    codigo?: string;
    descricao: string;
    quantidade: number;
    valor: number;
  }>;
  parcelas: Array<{
    dataVencimento: string;
    valor: number;
    formaPagamento?: { id: number };
  }>;
  transporte: {
    fretePorConta: number;   // SEFAZ: 0=CIF/Remetente, 1=FOB/Destinatário, 9=Sem frete
    frete: number;
    // contato dentro de transporte = transportador (Correios cadastrado como contato no Bling).
    // Confirmado via SDK oficial: AlexandreBellas/bling-erp-api-js create.interface.ts
    // NÃO existe campo "transportadora" — o carrier vai em transporte.contato.
    contato?: { id?: number; nome: string };
    volumes?: Array<{
      id: number;                    // obrigatório no tipo; usar 0 para criação
      servico: string;               // "PAC" | "SEDEX" — confirmado via SDK oficial
      especie?: string;              // ex: "Caixa" — aparece no DANFE em Transportador/Volumes
      quantidade?: number;
      codigoRastreamento?: string;
    }>;
    etiqueta?: { nome?: string; endereco: string; numero: string; complemento?: string; bairro: string; municipio: string; uf: string; cep: string };
  };
}

export interface BlingNfePayload {
  pedido?: { id: number };
  contato: {
    id: number;
    nome?: string;
    // Endereço do destinatário — Bling não herda do cadastro de contatos na NF-e via API
    endereco?: {
      municipio: string;
      uf: string;
      cep: string;
      endereco: string;
      numero: string;
      bairro: string;
      complemento?: string;
    };
  };
  dataOperacao?: string;     // data de saída/operação da NF-e
  naturezaOperacao?: { id: number };
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valor: number;
    unidade?: string;             // "UN" — obrigatório para SEFAZ
    classificacaoFiscal?: string; // NCM do item (ex: "4901.99.00" para livros)
    origem?: number;              // 0 = nacional
    cfop?: string;                // 5101 intra-estadual, 6107 inter-estadual
    tributacao?: {
      csosn?: number;             // 300 = Imune (livros são imunes ao ICMS no Brasil)
    };
  }>;
  parcelas: Array<{
    valor: number;
    data: string;             // NF-e usa "data", pedidos usam "dataVencimento"
    formaPagamento?: { id: number }; // singular! campo confirmado via GET /nfe/{id}
  }>;
  transporte?: BlingOrderPayload["transporte"];
  condicaoPagamentoId?: number;
}

export async function createBlingNfe(params: BlingNfePayload): Promise<{ id: number }> {
  const { condicaoPagamentoId, ...rest } = params;
  const body: Record<string, unknown> = {
    tipo: 1,
    finalidade: 1,
    indicadorPresenca: 2,
    ...rest,
  };
  if (condicaoPagamentoId) body.condicaoPagamento = { id: condicaoPagamentoId };
  console.log("[Bling] POST /nfe body:", JSON.stringify(body).slice(0, 600));
  const data = await blingFetch<{ data: { id: number } }>("/nfe", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.data;
}

export async function createBlingOrder(payload: BlingOrderPayload): Promise<{ id: number }> {
  const data = await blingFetch<{ data: { id: number } }>("/pedidos/vendas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data;
}

// ── Consultas ─────────────────────────────────────────────────────────────────

export interface BlingOrderDetails {
  id: number;
  numero: number;      // número sequencial visível na UI do Bling (ex: 7159)
  numeroPedidoCompra?: string; // nosso order_number salvo em observacoes
  situacao: { id: number; nome: string };
  // Bling v3 inclui a NF-e vinculada diretamente no objeto do pedido quando emitida
  notaFiscal?: { id: number } | null;
  notasFiscais?: Array<{ id: number }> | null;
}

export interface BlingNfe {
  id: number;
  numero: string;
  serie: string;
  chaveAcesso: string;
  linkDanfe?: string | null;
  situacao?: { id: number; nome: string } | null;
}

export async function getBlingOrderDetails(blingOrderId: number): Promise<BlingOrderDetails | null> {
  try {
    const data = await blingFetch<{ data: BlingOrderDetails }>(`/pedidos/vendas/${blingOrderId}`);
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function findBlingNfeByChave(chave: string): Promise<BlingNfe | null> {
  // Extrai data de emissão e número da NF da chave de acesso (44 dígitos)
  // Estrutura: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
  const digits = chave.replace(/\D/g, "");
  if (digits.length !== 44) return null;
  const year = parseInt("20" + digits.slice(2, 4), 10);
  const month = parseInt(digits.slice(4, 6), 10);
  const nNF = parseInt(digits.slice(25, 34), 10);
  // Último dia do mês correto (ex: junho tem 30 dias, não 31)
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const dataInicial = `${year}-${mm}-01 00:00:00`;
  const dataFinal = `${year}-${mm}-${lastDay} 23:59:59`;
  console.log(`[Bling] findBlingNfeByChave: buscando NF ${nNF} em ${dataInicial} → ${dataFinal}`);
  const data = await blingFetch<{ data: Array<{ id: number; numero: string }> }>(
    `/nfe?dataEmissaoInicial=${encodeURIComponent(dataInicial)}&dataEmissaoFinal=${encodeURIComponent(dataFinal)}&limite=100`
  );
  const match = (data.data ?? []).find((n) => parseInt(n.numero, 10) === nNF);
  if (!match) { console.warn(`[Bling] NF ${nNF} não encontrada na lista`); return null; }
  const detail = await blingFetch<{ data: BlingNfe }>(`/nfe/${match.id}`);
  return detail.data ?? null;
}

export async function generateBlingNfeFromOrder(blingOrderId: number): Promise<{ id: number } | null> {
  // POST /pedidos/vendas/{id}/gerar-nfe — gera NF-e vinculada ao pedido.
  // Não aceita body: a forma de pagamento vem do pedido (parcelas[].formaPagamento).
  const data = await blingFetch<{ data: { idNotaFiscal: number } }>(
    `/pedidos/vendas/${blingOrderId}/gerar-nfe`,
    { method: "POST", body: JSON.stringify({}) }
  );
  const nfeId = data.data?.idNotaFiscal;
  if (!nfeId) return null;
  return { id: nfeId };
}

export async function sendBlingNfe(nfeId: number): Promise<void> {
  await blingFetch(`/nfe/${nfeId}/enviar`, { method: "POST" });
}

export async function getBlingNfe(nfeId: number): Promise<BlingNfe | null> {
  try {
    const data = await blingFetch<{ data: BlingNfe }>(`/nfe/${nfeId}`);
    return data.data ?? null;
  } catch { return null; }
}

export async function getBlingNfeByOrder(blingOrderId: number): Promise<BlingNfe | null> {
  try {
    // Busca o pedido no Bling — a resposta inclui a NF-e vinculada diretamente.
    // NUNCA usar GET /nfe?pedidoVendaId= pois esse parâmetro não existe no Bling v3
    // e faz a API retornar todos os NF-e sem filtro, associando a NF errada ao pedido.
    const orderRes = await blingFetch<{ data: BlingOrderDetails }>(`/pedidos/vendas/${blingOrderId}`);
    const order = orderRes.data;
    const nfeId = order?.notaFiscal?.id || order?.notasFiscais?.[0]?.id;
    // Bling retorna id=0 quando não há NF-e vinculada
    if (!nfeId || nfeId === 0) return null;
    const detail = await blingFetch<{ data: BlingNfe }>(`/nfe/${nfeId}`);
    return detail.data ?? null;
  } catch {
    return null;
  }
}
