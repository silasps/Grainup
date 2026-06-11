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
  return res.json() as Promise<T>;
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

export async function findOrCreateBlingContact(nome: string, email: string): Promise<number> {
  try {
    const found = await blingFetch<{ data: Array<{ id: number }> }>(`/contatos?email=${encodeURIComponent(email)}&situacao=A`);
    if (found.data?.[0]?.id) return found.data[0].id;
  } catch {}
  const created = await blingFetch<{ data: { id: number } }>("/contatos", {
    method: "POST",
    body: JSON.stringify({ nome, email, tipoPessoa: "F", situacao: "A" }),
  });
  return created.data.id;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export interface BlingOrderPayload {
  numero_loja: string;
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
    frete_por_conta: string;
    valor_frete: number;
    endereco: { endereco: string; numero: string; complemento?: string; bairro: string; municipio: string; uf: string; cep: string };
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
  numero: number;
  situacao: { id: number; nome: string };
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
    const list = await blingFetch<{ data: BlingNfe[] }>(`/nfe?pedidoVendaId=${blingOrderId}`);
    const first = list.data?.[0];
    if (!first) return null;
    const detail = await blingFetch<{ data: BlingNfe }>(`/nfe/${first.id}`);
    return detail.data ?? null;
  } catch {
    return null;
  }
}
