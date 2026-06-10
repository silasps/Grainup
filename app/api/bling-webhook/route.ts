/**
 * Webhook do Bling → GrainUp
 *
 * Bling envia POST para este endpoint quando há mudanças de estoque,
 * status de pedido, etc.
 *
 * Configurar no Bling:
 *   Painel Bling → Configurações → API → Webhooks
 *   URL: https://editorajocum.com.br/api/bling-webhook
 *   Secret: valor de BLING_WEBHOOK_SECRET no .env.local
 *
 * Docs: https://developer.bling.com.br/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { syncStockFromBling } from "@/lib/bling/sync";

// Bling assina os webhooks com HMAC-SHA256 no header "X-Bling-Signature"
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.BLING_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado, aceita (dev)

  const signature = req.headers.get("x-bling-signature") ?? "";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Buffer.from(mac).toString("hex");
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!(await verifySignature(req, rawBody))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = payload.evento as string | undefined;

  try {
    // ── Atualização de estoque ──────────────────────────────────────────────
    if (event === "estoque" || event === "produto") {
      const data = payload.data as Record<string, unknown> | undefined;
      const produto = data?.produto as Record<string, unknown> | undefined;
      if (produto?.id && produto?.codigo && produto?.estoque) {
        const estoque = produto.estoque as { saldoFisico?: number };
        await syncStockFromBling(
          produto.id as number,
          produto.codigo as string,
          estoque.saldoFisico ?? 0
        );
      }
    }

    // ── Outros eventos (expansão futura) ───────────────────────────────────
    // if (event === "pedido") { ... }
    // if (event === "notafiscal") { ... }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bling-webhook] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
