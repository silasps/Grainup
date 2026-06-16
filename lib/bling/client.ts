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
}

export async function createBlingProduct(payload: BlingProductPayload): Promise<{ id: number; codigo: string }> {
  const data = await blingFetch<{ data: { id: number; codigo: string } }>("/produtos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function updateBlingProduct(blingProductId: number, payload: Partial<BlingProductPayload>): Promise<void> {
  await blingFetch(`/produtos/${blingProductId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
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
  // tipoPagamento é o código SEFAZ: "03"=crédito, "04"=débito, "15"=boleto, "17"=PIX, "99"=outros
  tipoPagamento: string;
  situacao: string;
}

export async function getBlingPaymentForms(): Promise<BlingPaymentForm[]> {
  try {
    const data = await blingFetch<{ data: BlingPaymentForm[] }>("/formas-pagamentos");
    return data.data ?? [];
  } catch {
    return [];
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
    valor: number;
    dataVencimento: string;
    formasPagamento?: Array<{ forma: { id: number }; valor: number }>;
  }>;
  transporte: {
    fretePorConta: number;   // 1 = Remetente, 2 = Destinatário, 3 = Terceiros (inteiro no Bling v3)
    frete: number;
    contato?: { id: number };
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
  itens: Array<{
    produto?: { id: number };
    codigo: string;           // obrigatório na NF-e mesmo quando produto.id é fornecido
    descricao: string;
    quantidade: number;
    valor: number;
    unidade?: string;         // "UN" — obrigatório para SEFAZ
    cfop?: string;            // ex: "6101" para inter-estadual, "5101" para intra-estadual
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
  // POST /pedidos/vendas/{id}/gerar-nfe — gera NF-e vinculada ao pedido (retorna idNotaFiscal)
  // Requer que o pedido e os produtos estejam com dados fiscais completos no Bling
  const data = await blingFetch<{ data: { idNotaFiscal: number } }>(
    `/pedidos/vendas/${blingOrderId}/gerar-nfe`,
    { method: "POST", body: "{}" }
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
