/**
 * Correios REST API — autenticação, cálculo de frete e rastreamento
 *
 * Endpoints baseados na documentação oficial do Portal Correios Developers:
 * https://www.correios.com.br/atendimento/developers
 *
 * Credenciais necessárias (CWS — Correios Web Services):
 *   CORREIOS_USUARIO         → ID do cartão de postagem
 *   CORREIOS_CODIGO_ACESSO   → Código de acesso gerado no CWS
 *   CORREIOS_CONTRATO        → Número do contrato
 *   CORREIOS_CARTAO_POSTAGEM → Número do cartão de postagem
 *   CORREIOS_CEP_ORIGEM      → CEP de origem dos envios
 *   CORREIOS_SANDBOX         → "true" para homologação
 */

// ── Configuração base ─────────────────────────────────────────────────────────

function getBase(): string {
  return process.env.CORREIOS_SANDBOX === "true"
    ? "https://apphom.correios.com.br"
    : "https://api.correios.com.br";
}

// Códigos de serviço com contrato (modalidade faturamento)
export const CORREIOS_SERVICES = {
  PAC:      "03298",
  SEDEX:    "03220",
  SEDEX_10: "03158",
} as const;

export type CorreiosServiceCode = typeof CORREIOS_SERVICES[keyof typeof CORREIOS_SERVICES];

export const SERVICE_LABELS: Record<CorreiosServiceCode, string> = {
  "03298": "PAC — Correios",
  "03220": "SEDEX — Correios",
  "03158": "SEDEX 10 — Correios",
};

// ── Tipos de resposta ─────────────────────────────────────────────────────────

export interface CorreiosShippingOption {
  id: string;           // = serviceCode (compatibilidade com checkout)
  label: string;        // "PAC — Correios" | "SEDEX — Correios"
  price: number;
  minDays: number;
  maxDays: number;
  serviceCode: CorreiosServiceCode;
}

export interface CorreiosPackage {
  weight: number; // kg
  height: number; // cm
  width:  number; // cm
  length: number; // cm
}

export interface CorreiosTrackingEvent {
  dtHrCriado:  string;
  descricao:   string;
  tipo:        string;
  unidade?:    { nome?: string; uf?: string } | null;
}

// ── Decodificação do JWT (sem dependência externa) ────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Gerenciamento de token ────────────────────────────────────────────────────

interface TokenCache {
  token:     string;
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;
let _tokenFlight: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;
  if (_tokenFlight) return _tokenFlight;
  _tokenFlight = _fetchToken().finally(() => { _tokenFlight = null; });
  return _tokenFlight;
}

async function _fetchToken(): Promise<string> {
  const usuario  = process.env.CORREIOS_USUARIO;
  const codigo   = process.env.CORREIOS_CODIGO_ACESSO;
  const contrato = process.env.CORREIOS_CONTRATO;
  const cartao   = process.env.CORREIOS_CARTAO_POSTAGEM;

  if (!usuario || !codigo) {
    throw new Error("Correios: configure CORREIOS_USUARIO e CORREIOS_CODIGO_ACESSO.");
  }
  if (!cartao && !contrato) {
    throw new Error("Correios: configure CORREIOS_CARTAO_POSTAGEM ou CORREIOS_CONTRATO.");
  }

  const credentials = Buffer.from(`${usuario}:${codigo}`).toString("base64");

  // Prefere cartão de postagem; usa contrato quando só ele estiver disponível
  const endpoint = cartao ? "/token/v1/autentica/cartaopostagem" : "/token/v1/autentica/contrato";
  const body     = cartao ? { numero: cartao } : { numero: contrato };

  const url = `${getBase()}${endpoint}`;
  console.log(`[Correios auth] POST ${url} usuario=${usuario} contrato=${contrato ?? "—"}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[Correios auth] ${res.status} — body: ${errBody || "(vazio)"} — url: ${url}`);
    throw new Error(`Correios auth falhou (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { token: string; expiraEm?: string };
  // Subtrai 60 s de margem para renovar antes de expirar
  const ttlMs = data.expiraEm
    ? new Date(data.expiraEm).getTime() - Date.now() - 60_000
    : 20 * 60 * 1000;

  _tokenCache = { token: data.token, expiresAt: Date.now() + ttlMs };
  return data.token;
}

// ── Utilitários de fetch ──────────────────────────────────────────────────────

async function correiosFetch<T>(
  path: string,
  options?: RequestInit,
  retries = 1
): Promise<T> {
  const token = await getToken();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${getBase()}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (res.status === 401 && attempt < retries) {
        _tokenCache = null; // força renovação
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Correios ${options?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Correios: máximo de tentativas atingido");
}

// ── Cálculo de frete ──────────────────────────────────────────────────────────

interface CorreiosPriceResponse {
  coProduto:  string;
  pcFinal:    string | number;
  prazoEntrega?: number;
  entrega?:   { prazoMaximo?: number; prazoMinimo?: number };
}

export async function calculateShipping(
  fromCep: string,
  toCep:   string,
  pkg:     CorreiosPackage
): Promise<CorreiosShippingOption[]> {
  const cartao = process.env.CORREIOS_CARTAO_POSTAGEM;

  const hasCredential = process.env.CORREIOS_CONTRATO || cartao;
  if (!hasCredential) return [];

  const services: CorreiosServiceCode[] = [
    CORREIOS_SERVICES.PAC,
    CORREIOS_SERVICES.SEDEX,
    ...(process.env.CORREIOS_HABILITAR_SEDEX10 === "true" ? [CORREIOS_SERVICES.SEDEX_10] : []),
  ];

  const weightG = Math.round(pkg.weight * 1000);

  const results: CorreiosShippingOption[] = [];

  await Promise.allSettled(
    services.map(async (serviceCode) => {
      try {
        // nuDR fixo pelo contrato — PR = 36. Obrigatório para evitar PRC-124.
        const nuDR = process.env.CORREIOS_DR;

        const params: Record<string, string> = {
          cepOrigem:   fromCep.replace(/\D/g, ""),
          cepDestino:  toCep.replace(/\D/g, ""),
          psObjeto:    String(weightG),
          tpObjeto:    "2",    // 2 = caixa
          comprimento: String(Math.round(pkg.length)),
          largura:     String(Math.round(pkg.width)),
          altura:      String(Math.round(pkg.height)),
        };
        // nuContrato omitido — o Bearer token já tem o contrato embutido.
        // nuDR incluído apenas se conseguimos lê-lo (PRC-124 quando errado ou ausente).
        if (nuDR) params.nuDR = nuDR;
        if (cartao) params.cartaoPostagem = cartao;

        const data = await correiosFetch<CorreiosPriceResponse[]>(
          `/preco/v1/nacional/${serviceCode}?` + new URLSearchParams(params),
        );

        const item = Array.isArray(data) ? data[0] : data;
        if (!item) return;

        const price = typeof item.pcFinal === "string"
          ? parseFloat(item.pcFinal.replace(",", "."))
          : Number(item.pcFinal);

        if (!price || price <= 0) return;

        const minDays = item.entrega?.prazoMinimo ?? item.prazoEntrega ?? 1;
        const maxDays = item.entrega?.prazoMaximo ?? item.prazoEntrega ?? minDays;

        results.push({
          id:          serviceCode,
          label:       SERVICE_LABELS[serviceCode],
          price,
          minDays,
          maxDays,
          serviceCode,
        });
      } catch (err) {
        console.warn(`[Correios] preço para ${serviceCode} falhou:`, err instanceof Error ? err.message : err);
      }
    })
  );

  return results.sort((a, b) => a.price - b.price);
}

// ── Rastreamento ──────────────────────────────────────────────────────────────

interface CorreiosRastroResponse {
  objetos?: Array<{
    codObjeto: string;
    eventos?: CorreiosTrackingEvent[];
    mensagem?: string;
  }>;
}

export class CorreiosTrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorreiosTrackingError";
  }
}

export async function getTrackingEvents(
  trackingCode: string
): Promise<CorreiosTrackingEvent[]> {
  const data = await correiosFetch<CorreiosRastroResponse>(
    `/sro/rastro/v1/objetos?codigosObjetos=${encodeURIComponent(trackingCode)}&tipoResultado=T&resultadoPorObjeto=U&incluirEventos=S`
  );

  const obj = data.objetos?.[0];

  if (!obj) return [];

  if (obj.mensagem?.toLowerCase().includes("não")) {
    throw new CorreiosTrackingError(`Objeto ${trackingCode} não encontrado ou não vinculado ao contrato`);
  }

  return obj.eventos ?? [];
}

// Código de evento de entrega ao destinatário (BDE = Entregue ao destinatário)
export const DELIVERY_EVENT_CODE = "BDE";

export function isDeliveredEvent(event: CorreiosTrackingEvent): boolean {
  return event.tipo === DELIVERY_EVENT_CODE;
}
