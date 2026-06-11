#!/usr/bin/env node
/**
 * Remove todos os dados fictícios inseridos pelo seed-demo.js.
 * NÃO remove livros, combos, autores, categorias, FAQs ou afiliados.
 *
 * Uso: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-demo-data.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🧹 Removendo dados fictícios de demo...\n");

  // 1. Pedidos demo → financial_movements cascadeiam automaticamente
  console.log("🗑  Pedidos + movimentações financeiras (email *@exemplo.com.br)...");
  const { count: ordersDeleted, error: ordersError } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .like("customer_email", "%@exemplo.com.br");
  if (ordersError) console.warn("  ERRO:", ordersError.message);
  else console.log(`  ✓ ${ordersDeleted} pedidos removidos (financial_movements em cascade)`);

  // 2. Leads demo
  console.log("🗑  Leads (email lead*@exemplo.com.br)...");
  const { count: leadsDeleted, error: leadsError } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .like("email", "%@exemplo.com.br");
  if (leadsError) console.warn("  ERRO:", leadsError.message);
  else console.log(`  ✓ ${leadsDeleted} leads removidos`);

  // 3. Chamados SAC demo
  console.log("🗑  Chamados SAC (email sac*@exemplo.com.br)...");
  const { count: ticketsDeleted, error: ticketsError } = await supabase
    .from("support_tickets")
    .delete({ count: "exact" })
    .like("customer_email", "%@exemplo.com.br");
  if (ticketsError) console.warn("  ERRO:", ticketsError.message);
  else console.log(`  ✓ ${ticketsDeleted} chamados removidos`);

  // 4. News posts placeholder do seed
  const demoSlugs = [
    "novos-lancamentos-chegaram",
    "missao-e-literatura-por-que-ler-importa",
    "combo-especial-familia-abencada",
    "campanha-de-frete-gratis-semana-das-missoes",
  ];
  console.log("🗑  Posts de novidades placeholder...");
  const { count: newsDeleted, error: newsError } = await supabase
    .from("news_posts")
    .delete({ count: "exact" })
    .in("slug", demoSlugs);
  if (newsError) console.warn("  ERRO:", newsError.message);
  else console.log(`  ✓ ${newsDeleted} posts removidos`);

  console.log("\n✅ Limpeza concluída. Livros, combos, FAQs e afiliados preservados.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
