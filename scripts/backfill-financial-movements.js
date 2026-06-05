#!/usr/bin/env node
/**
 * Backfill de financial_movements para pedidos já pagos.
 *
 * Para cada pedido com status='pago' sem movimentação financeira:
 *   - Tenta buscar a taxa real no MercadoPago usando o ID salvo em orders.notes (MP:xxxxx)
 *   - Se não encontrar, usa 0 como gateway_fee (revisão manual posterior)
 *
 * Uso:
 *   node scripts/backfill-financial-movements.js
 *
 * Variáveis necessárias (lidas do .env.local automaticamente se dotenv estiver disponível):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MERCADOPAGO_ACCESS_TOKEN
 */

// Tenta carregar .env.local automaticamente
try {
  require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
} catch {
  // dotenv não instalado — variáveis devem estar no ambiente
}

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Aguarda um tempo entre chamadas à API do MP para não estourar rate limit
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getMpFee(paymentId) {
  if (!MP_TOKEN || !paymentId) return { fee: 0, paidAt: null };
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!res.ok) return { fee: 0, paidAt: null };
    const data = await res.json();
    const fee = (data.fee_details ?? [])
      .filter((f) => f.type === "mercadopago_fee")
      .reduce((sum, f) => sum + (f.amount ?? 0), 0);
    return { fee, paidAt: data.date_approved ?? null };
  } catch {
    return { fee: 0, paidAt: null };
  }
}

async function main() {
  console.log("🔍  Buscando pedidos pagos sem movimentação financeira...\n");

  // Pedidos pagos
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, total, subtotal, discount, shipping_cost, payment_method, notes, created_at")
    .eq("status", "pago")
    .order("created_at", { ascending: true });

  if (ordersErr) {
    console.error("❌  Erro ao buscar pedidos:", ordersErr.message);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log("ℹ️   Nenhum pedido pago encontrado.");
    return;
  }

  // IDs que já têm movimentação
  const { data: existing } = await supabase
    .from("financial_movements")
    .select("order_id");

  const existingIds = new Set((existing ?? []).map((r) => r.order_id));

  const pending = orders.filter((o) => !existingIds.has(o.id));

  console.log(`📦  Total pagos: ${orders.length}`);
  console.log(`✅  Já com movimentação: ${existingIds.size}`);
  console.log(`⏳  Para criar: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log("Nada a fazer. Tudo já está registrado.");
    return;
  }

  let criados = 0;
  let semTaxa = 0;

  for (const order of pending) {
    // Extrai ID do MP salvo em notes (formato: "MP:12345678")
    const mpMatch = (order.notes ?? "").match(/MP:(\d+)/);
    const paymentId = mpMatch ? mpMatch[1] : null;

    const { fee, paidAt } = await getMpFee(paymentId);

    if (paymentId && fee === 0) semTaxa++;

    const grossAmount = order.total;
    const gatewayFee = fee;
    const netAmount = grossAmount - gatewayFee;

    const { error: insertErr } = await supabase.from("financial_movements").insert({
      order_id: order.id,
      gross_amount: grossAmount,
      discount: order.discount ?? 0,
      shipping: order.shipping_cost ?? 0,
      gateway_fee: gatewayFee,
      affiliate_commission: 0,
      net_amount: netAmount,
      payment_method: order.payment_method ?? null,
      gateway: paymentId ? "mercadopago" : null,
      gateway_transaction_id: paymentId ?? null,
      status: "pago",
      paid_at: paidAt ?? order.created_at,
    });

    if (insertErr) {
      console.error(`  ❌  Pedido ${order.id}: ${insertErr.message}`);
    } else {
      criados++;
      const feeStr = gatewayFee > 0 ? `taxa R$${gatewayFee.toFixed(2)}` : "taxa desconhecida (0)";
      console.log(`  ✓  ${order.id.slice(0, 8)}… | R$${grossAmount.toFixed(2)} | ${feeStr}`);
    }

    // Pausa entre chamadas ao MP (evita rate limit)
    if (paymentId) await sleep(300);
  }

  console.log(`\n🎉  Concluído: ${criados} movimentações criadas.`);
  if (semTaxa > 0) {
    console.log(`⚠️   ${semTaxa} pedido(s) com ID do MP mas taxa = 0 (verifique no dashboard do MP).`);
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
