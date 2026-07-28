import { NextRequest, NextResponse } from "next/server";
import { calculateShipping as calculateCorreiosShipping } from "@/lib/correios/client";
import { calculateShipping as calculateMEShipping } from "@/lib/melhor-envio";

const FROM_CEP = (process.env.CORREIOS_CEP_ORIGEM ?? process.env.MELHOR_ENVIO_FROM_CEP ?? "").replace(/\D/g, "");

// Intercepta a resposta bruta dos Correios antes do mapeamento
async function fetchCorreiosRaw(fromCep: string, toCep: string): Promise<unknown> {
  const usuario = process.env.CORREIOS_USUARIO;
  const codigo = process.env.CORREIOS_CODIGO_ACESSO;
  const cartao = process.env.CORREIOS_CARTAO_POSTAGEM;
  const contrato = process.env.CORREIOS_CONTRATO;

  if (!usuario || !codigo || (!cartao && !contrato)) {
    return { error: "Credenciais Correios não configuradas (CORREIOS_USUARIO / CORREIOS_CODIGO_ACESSO / CORREIOS_CARTAO_POSTAGEM)" };
  }

  const credentials = Buffer.from(`${usuario}:${codigo}`).toString("base64");
  const base = process.env.CORREIOS_SANDBOX === "true"
    ? "https://apphom.correios.com.br"
    : "https://api.correios.com.br";

  const endpoint = cartao ? "/token/v1/autentica/cartaopostagem" : "/token/v1/autentica/contrato";
  const body = cartao ? { numero: cartao } : { numero: contrato };

  const tokenRes = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!tokenRes.ok) {
    return { error: `Auth falhou: ${tokenRes.status} ${await tokenRes.text()}` };
  }

  const { token } = await tokenRes.json() as { token: string };

  const pkg = { psObjeto: "500", tpObjeto: "2", comprimento: "21", largura: "14", altura: "4" };
  const nuDR = process.env.CORREIOS_DR;
  const params: Record<string, string> = {
    cepOrigem: fromCep, cepDestino: toCep, ...pkg,
    ...(nuDR ? { nuDR } : {}),
    ...(cartao ? { cartaoPostagem: cartao } : {}),
  };

  const raw: Record<string, unknown> = {};
  for (const code of ["03298", "03220"]) {
    const r = await fetch(`${base}/preco/v1/nacional/${code}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    raw[code] = r.ok ? await r.json() : { error: `${r.status} ${await r.text()}` };
  }
  return raw;
}

export async function GET(req: NextRequest) {
  const cep = req.nextUrl.searchParams.get("cep") ?? "01310100";
  const cleanCep = cep.replace(/\D/g, "");

  const pkg = { weight: 0.5, height: 4, width: 14, length: 21 };

  const [correiosOptions, correiosRaw, meRaw] = await Promise.allSettled([
    calculateCorreiosShipping(FROM_CEP, cleanCep, pkg),
    fetchCorreiosRaw(FROM_CEP, cleanCep),
    calculateMEShipping(FROM_CEP, cleanCep, pkg).then((opts) =>
      opts.filter((o) => ["PAC", "SEDEX"].some((n) => o.label.startsWith(n)))
    ),
  ]);

  return NextResponse.json({
    cepOrigem: FROM_CEP,
    cepDestino: cleanCep,
    correios: {
      options: correiosOptions.status === "fulfilled" ? correiosOptions.value : { error: String(correiosOptions.reason) },
      rawApiResponse: correiosRaw.status === "fulfilled" ? correiosRaw.value : { error: String(correiosRaw.reason) },
    },
    melhorEnvio: {
      options: meRaw.status === "fulfilled" ? meRaw.value : { error: String(meRaw.reason) },
    },
  }, { status: 200 });
}
