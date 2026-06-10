/**
 * Bling ERP v3 — cliente HTTP
 *
 * Docs: https://developer.bling.com.br/
 *
 * Autenticação: API Key (header "apikey") OU OAuth2 Bearer token.
 * Preencha BLING_API_KEY no .env.local para usar API Key direta.
 * Para OAuth2, preencha BLING_CLIENT_ID + BLING_CLIENT_SECRET e
 * implemente o fluxo de token em lib/bling/auth.ts (a fazer).
 */

const BASE_URL = "https://www.bling.com.br/Api/v3";

function getHeaders(): HeadersInit {
  const apiKey = process.env.BLING_API_KEY;
  if (!apiKey) throw new Error("BLING_API_KEY não configurada.");
  return {
    "Content-Type": "application/json",
    apikey: apiKey,
  };
}

async function blingFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bling ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Produtos / Estoque ──────────────────────────────────────────────────────

export interface BlingProduct {
  id: number;
  codigo: string; // SKU
  nome: string;
  preco: number;
  estoque: { saldoFisico: number; saldoVirtual: number } | null;
}

/** Busca produto pelo SKU (código) */
export async function getBlingProductBySku(sku: string): Promise<BlingProduct | null> {
  try {
    const data = await blingFetch<{ data: BlingProduct[] }>(`/produtos?codigo=${encodeURIComponent(sku)}`);
    return data.data?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Atualiza estoque de um produto no Bling pelo ID interno */
export async function updateBlingStock(blingProductId: number, quantity: number): Promise<void> {
  await blingFetch(`/estoques`, {
    method: "POST",
    body: JSON.stringify({
      produto: { id: blingProductId },
      quantidade: quantity,
      operacao: "B", // B = Balanço (define o saldo absoluto)
    }),
  });
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export interface BlingOrderPayload {
  numero_loja: string; // ID do pedido na loja
  data: string;        // YYYY-MM-DD
  contato: { nome: string; email: string };
  itens: Array<{ codigo: string; descricao: string; quantidade: number; valor_unitario: number }>;
  parcelas: Array<{ valor: number; forma_pagamento: { id: number } }>; // 1 = Dinheiro
  transporte: {
    frete_por_conta: string; // "D" = destinatário
    valor_frete: number;
    endereco: {
      endereco: string; numero: string; complemento?: string;
      bairro: string; municipio: string; uf: string; cep: string;
    };
  };
}

/** Envia um pedido para o Bling */
export async function createBlingOrder(payload: BlingOrderPayload): Promise<{ id: number }> {
  const data = await blingFetch<{ data: { id: number } }>("/pedidos/vendas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data;
}
