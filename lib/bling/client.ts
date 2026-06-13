/**
 * Bling ERP v3 — cliente HTTP com OAuth2
 * Tokens gerenciados em lib/bling/auth.ts (tabela bling_tokens no Supabase)
 */

import { getAccessToken } from "./auth";

const BASE_URL = "https://www.bling.com.br/Api/v3";

async function blingFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[Bling] ERRO ${res.status} em ${options?.method ?? "GET"} ${path}:`, body);
    if (res.status === 403) throw new Error("Permissão insuficiente no Bling. Adicione os módulos 'Contatos' e 'Pedidos de Venda' nas permissões do app e reconecte em Configurações.");
    if (res.status === 401) throw new Error("Token Bling expirado ou inválido. Reconecte em Configurações → Bling ERP.");
    let msg = body;
    try {
      const parsed = JSON.parse(body);
      const fields = parsed?.error?.fields;
      if (fields?.length) msg = fields.map((f: { msg: string }) => f.msg).join(" | ");
      else msg = parsed?.error?.description || parsed?.error?.message || body;
    } catch {}
    throw new Error(`Bling: ${msg}`);
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
  } catch {
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
  tipo?: "P" | "K"; // P = produto simples, K = kit/combo
  situacao?: "A" | "I";
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
  } catch {}

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
  parcelas: Array<{ valor: number; dataVencimento: string }>;
  transporte: {
    fretePorConta: number;   // 1 = Remetente, 2 = Destinatário, 3 = Terceiros (inteiro no Bling v3)
    frete: number;
    contato?: { id: number };
    etiqueta?: { nome?: string; endereco: string; numero: string; complemento?: string; bairro: string; municipio: string; uf: string; cep: string };
  };
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

export async function getBlingNfeByOrder(blingOrderId: number): Promise<BlingNfe | null> {
  try {
    // Busca o pedido no Bling — a resposta inclui a NF-e vinculada diretamente.
    // NUNCA usar GET /nfe?pedidoVendaId= pois esse parâmetro não existe no Bling v3
    // e faz a API retornar todos os NF-e sem filtro, associando a NF errada ao pedido.
    const orderRes = await blingFetch<{ data: BlingOrderDetails }>(`/pedidos/vendas/${blingOrderId}`);
    const order = orderRes.data;
    const nfeId = order?.notaFiscal?.id ?? order?.notasFiscais?.[0]?.id;
    if (!nfeId) return null;
    const detail = await blingFetch<{ data: BlingNfe }>(`/nfe/${nfeId}`);
    return detail.data ?? null;
  } catch {
    return null;
  }
}
