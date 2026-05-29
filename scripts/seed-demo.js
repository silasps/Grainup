#!/usr/bin/env node
/**
 * Seed script para demo — importa livros, dados financeiros e operacionais.
 *
 * Uso: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-demo.js
 *
 * Certifique-se de ter rodado as migrations antes.
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const books = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "books.json"), "utf8")
);

function slugify(t) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,100);
}

const STATES = ["SP","RJ","MG","PR","RS","SC","GO","BA","PE","CE","AM","MT","DF","ES","MA"];
const NAMES = ["Maria Silva","João Santos","Ana Lima","Pedro Costa","Carla Souza","Lucas Ferreira","Juliana Oliveira","Rafael Mendes","Fernanda Rocha","Marcos Alves","Beatriz Castro","Thiago Pereira","Camila Ribeiro","Eduardo Neves","Patrícia Gomes"];
const SUPPORT_CATEGORIES = ["Entrega","Pagamento","Troca ou devolução","Dúvida sobre produto","Outro"];
const FAQ_ITEMS = [
  { category: "Compra", question: "Como faço um pedido?", answer: "Basta adicionar os livros ao carrinho, fazer login ou cadastro e seguir as etapas do checkout." },
  { category: "Compra", question: "Posso comprar sem criar uma conta?", answer: "Para finalizar seu pedido, é necessário criar uma conta ou fazer login. O processo é rápido e seus dados ficam salvos para compras futuras." },
  { category: "Pagamento", question: "Quais formas de pagamento são aceitas?", answer: "Aceitamos PIX (com desconto), cartão de crédito (até 3x sem juros) e cartão de débito." },
  { category: "Pagamento", question: "O PIX tem desconto?", answer: "Sim! Pagamentos via PIX têm processamento imediato e o pedido é separado mais rapidamente." },
  { category: "Entrega", question: "Qual o prazo de entrega?", answer: "O prazo varia conforme o estado. Em geral, entre 5 e 14 dias úteis após a confirmação do pagamento. Você recebe o código de rastreio por email." },
  { category: "Entrega", question: "Vocês entregam para todo o Brasil?", answer: "Sim! Entregamos para todos os estados brasileiros. O valor do frete é calculado automaticamente no checkout." },
  { category: "Trocas e devoluções", question: "Posso trocar ou devolver um livro?", answer: "Sim, em até 7 dias corridos após o recebimento, caso o produto chegue com defeito ou diferente do pedido. Entre em contato pelo SAC." },
  { category: "Afiliados", question: "Como funciona o programa de afiliados?", answer: "Você gera um link único e recebe comissão por cada venda realizada através dele. Temos dois perfis: Missionário JOCUM e Diretor Acadêmico." },
  { category: "Conta e login", question: "Esqueci minha senha. O que faço?", answer: "Na página de login, clique em 'Esqueci minha senha' e você receberá um email com as instruções para redefinição." },
  { category: "Privacidade", question: "Meus dados estão seguros?", answer: "Sim. Usamos criptografia SSL e seguimos as diretrizes da LGPD. Seus dados nunca são vendidos ou compartilhados sem consentimento." },
];

const NEWS_POSTS_DATA = [
  { title: "Novos lançamentos chegaram!", summary: "Confira os títulos mais recentes que chegaram ao nosso catálogo este mês.", content: "Temos o prazer de anunciar a chegada de novos títulos ao nosso catálogo..." },
  { title: "Missão e literatura: por que ler importa", summary: "Entenda como a leitura de bons livros pode transformar sua vida e ministério.", content: "A literatura sempre foi uma ferramenta poderosa para a missão..." },
  { title: "Combo especial — Família abençoada", summary: "Presenteie quem você ama com nosso combo especial sobre família cristã.", content: "Criamos um combo especial com os melhores títulos sobre família..." },
  { title: "Campanha de frete grátis — Semana das missões", summary: "Durante esta semana, frete grátis em pedidos acima de R$150!", content: "Como parte da Semana das Missões, estamos oferecendo frete grátis..." },
];

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min, max, dec = 2) {
  return Math.round((Math.random() * (max - min) + min) * 10 ** dec) / 10 ** dec;
}

async function seedAuthors(booksData) {
  console.log("👤 Inserindo autores...");
  const authorNames = [...new Set(booksData.filter((b) => b.author).map((b) => b.author))];

  const authors = authorNames.map((name) => ({
    name,
    slug: slugify(name),
    bio: `Autor(a) de livros publicados pela Editora Jocum.`,
  }));

  const { data, error } = await supabase
    .from("authors")
    .upsert(authors, { onConflict: "slug", ignoreDuplicates: true })
    .select("id, name");

  if (error) console.warn("  Autores:", error.message);
  const authorMap = {};
  (data || []).forEach((a) => { authorMap[a.name] = a.id; });
  console.log(`  ✓ ${Object.keys(authorMap).length} autores`);
  return authorMap;
}

async function seedCategories() {
  console.log("📂 Inserindo categorias...");
  const { data } = await supabase.from("categories").select("id, name");
  const catMap = {};
  (data || []).forEach((c) => { catMap[c.name] = c.id; });
  console.log(`  ✓ ${Object.keys(catMap).length} categorias já existem`);
  return catMap;
}

async function seedBooks(booksData, authorMap, catMap) {
  console.log("📚 Inserindo livros...");
  let ok = 0, skip = 0;

  for (const b of booksData) {
    const authorId = b.author ? authorMap[b.author] : null;
    const catName = b.categories?.[0];
    const catId = catName ? catMap[catName] : null;

    // Supabase URL para a capa (se tiver local, usar URL do site original por ora)
    const coverUrl = b.cover_url || null;

    const { error } = await supabase.from("books").upsert(
      {
        title: b.title,
        slug: b.slug,
        author_id: authorId,
        category_id: catId,
        cover_url: coverUrl,
        description_short: b.description_short,
        description_full: b.description_full,
        price: b.price,
        price_promotional: b.price_promotional,
        stock: b.stock,
        weight_grams: b.weight_grams,
        height_cm: b.height_cm,
        width_cm: b.width_cm,
        length_cm: b.length_cm,
        pages: b.pages,
        isbn: b.isbn,
        sku: b.sku,
        publisher: b.publisher,
        is_active: true,
        is_featured: b.is_featured,
        is_new: b.is_new,
        is_bestseller: b.is_bestseller,
        rating_avg: b.rating_avg || 0,
        rating_count: b.rating_count || 0,
      },
      { onConflict: "slug", ignoreDuplicates: false }
    );

    if (error) {
      console.warn(`  ✗ ${b.title.slice(0,40)}: ${error.message}`);
      skip++;
    } else {
      ok++;
    }
  }

  console.log(`  ✓ ${ok} livros inseridos, ${skip} erros`);
}

async function seedFaq() {
  console.log("❓ Inserindo FAQ...");
  const { data: cats } = await supabase.from("faq_categories").select("id, name");
  const catMap = {};
  (cats || []).forEach((c) => { catMap[c.name] = c.id; });

  const faqs = FAQ_ITEMS.map((f, i) => ({
    category_id: catMap[f.category] || null,
    question: f.question,
    answer: f.answer,
    position: i,
    is_active: true,
    is_featured: i < 3,
  }));

  const { error } = await supabase.from("faqs").upsert(faqs, { ignoreDuplicates: true });
  if (error) console.warn("  FAQ:", error.message);
  else console.log(`  ✓ ${faqs.length} perguntas`);
}

async function seedNews() {
  console.log("📰 Inserindo novidades...");
  const posts = NEWS_POSTS_DATA.map((p, i) => ({
    title: p.title,
    slug: slugify(p.title),
    summary: p.summary,
    content: p.content,
    is_active: true,
    is_featured: i === 0,
    published_at: new Date(Date.now() - i * 7 * 24 * 3600 * 1000).toISOString(),
  }));

  const { error } = await supabase.from("news_posts").upsert(posts, { onConflict: "slug", ignoreDuplicates: true });
  if (error) console.warn("  News:", error.message);
  else console.log(`  ✓ ${posts.length} posts`);
}

async function seedDemoData(booksData) {
  console.log("📊 Inserindo dados de demo (pedidos, leads, SAC, financeiro)...");

  const { data: dbBooks } = await supabase.from("books").select("id, title, price").limit(30);
  if (!dbBooks || dbBooks.length === 0) {
    console.warn("  Sem livros no banco — pulando dados de demo");
    return;
  }

  // --- 280 pedidos simulados nos últimos 90 dias ---
  const statuses = [
    ...Array(182).fill("entregue"),
    ...Array(42).fill("enviado"),
    ...Array(28).fill("pago"),
    ...Array(20).fill("cancelado"),
    ...Array(8).fill("aguardando_pagamento"),
  ];

  const payMethods = [...Array(146).fill("pix"), ...Array(115).fill("credito"), ...Array(19).fill("debito")];
  const payStatuses = statuses.map((s) =>
    s === "cancelado" ? "cancelado" : s === "aguardando_pagamento" ? "pendente" : "aprovado"
  );

  const orders = [];
  const financials = [];

  for (let i = 0; i < 280; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
    const book = rnd(dbBooks);
    const qty = Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 2 : 3;
    const subtotal = Math.round(book.price * qty * 100) / 100;
    const shipping = rnd([0, 12.9, 15.9, 18.9, 19.9]);
    const total = Math.round((subtotal + shipping) * 100) / 100;
    const status = statuses[i];
    const payMethod = payMethods[i % payMethods.length];
    const payStatus = payStatuses[i];
    const state = rnd(STATES);
    const name = rnd(NAMES);
    const orderNumber = `GU${String(1000 + i).padStart(6, "0")}`;

    orders.push({
      order_number: orderNumber,
      customer_email: `cliente${i}@exemplo.com.br`,
      customer_name: name,
      shipping_address: {
        full_name: name,
        street: `Rua das Flores, ${100 + i}`,
        city: "São Paulo",
        state,
        zip_code: "01310-100",
      },
      subtotal,
      discount: 0,
      shipping_cost: shipping,
      total,
      status,
      payment_status: payStatus,
      payment_method: payMethod,
      fiscal_status: status === "entregue" || status === "enviado" ? "nao_emitida" : "nao_emitida",
      created_at: createdAt,
      updated_at: createdAt,
    });

    if (payStatus === "aprovado") {
      financials.push({
        order_number_ref: orderNumber,
        gross_amount: total,
        discount: 0,
        shipping,
        gateway_fee: Math.round(total * 0.032 * 100) / 100,
        affiliate_commission: 0,
        net_amount: Math.round((total - total * 0.032) * 100) / 100,
        payment_method: payMethod,
        gateway: "manual",
        status: "pago",
        paid_at: createdAt,
        created_at: createdAt,
      });
    }
  }

  // Inserir pedidos em lotes
  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50);
    const { error } = await supabase.from("orders").insert(batch);
    if (error) console.warn(`  Pedidos batch ${i}: ${error.message}`);
  }

  // Inserir financeiro
  const { data: dbOrders } = await supabase.from("orders").select("id, order_number").limit(300);
  const orderIdMap = {};
  (dbOrders || []).forEach((o) => { orderIdMap[o.order_number] = o.id; });

  const finRows = financials.map((f) => {
    const { order_number_ref, ...rest } = f;
    const orderId = orderIdMap[order_number_ref];
    return orderId ? { ...rest, order_id: orderId } : null;
  }).filter(Boolean);

  for (let i = 0; i < finRows.length; i += 50) {
    const { error } = await supabase.from("financial_movements").insert(finRows.slice(i, i + 50));
    if (error) console.warn(`  Financeiro batch ${i}: ${error.message}`);
  }

  console.log(`  ✓ ${orders.length} pedidos + ${finRows.length} movimentações financeiras`);

  // --- 145 leads ---
  const origins = [...Array(60).fill("newsletter"), ...Array(50).fill("pagina_livro"), ...Array(20).fill("sac"), ...Array(15).fill("contato")];
  const leads = Array.from({ length: 145 }, (_, i) => ({
    name: rnd(NAMES),
    email: `lead${i}@exemplo.com.br`,
    origin: origins[i % origins.length],
    marketing_consent: i % 3 !== 0,
    created_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 3600 * 1000).toISOString(),
  }));

  for (let i = 0; i < leads.length; i += 50) {
    const { error } = await supabase.from("leads").insert(leads.slice(i, i + 50));
    if (error) console.warn(`  Leads batch: ${error.message}`);
  }
  console.log(`  ✓ ${leads.length} leads`);

  // --- 18 chamados SAC ---
  const ticketStatuses = ["novo", "novo", "novo", "novo", "em_atendimento", "em_atendimento", "em_atendimento", "em_atendimento", "em_atendimento", "em_atendimento", "aguardando_cliente", "aguardando_cliente", "aguardando_cliente", "resolvido", "resolvido", "resolvido", "resolvido", "resolvido"];
  const tickets = Array.from({ length: 18 }, (_, i) => ({
    customer_name: rnd(NAMES),
    customer_email: `sac${i}@exemplo.com.br`,
    category: rnd(SUPPORT_CATEGORIES),
    subject: ["Onde está meu pedido?", "Livro chegou danificado", "Quero devolver", "Não recebi o comprovante", "Dúvida sobre frete", "Pedido errado"][i % 6],
    status: ticketStatuses[i],
    created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }));

  for (const ticket of tickets) {
    const { error } = await supabase.from("support_tickets").insert(ticket);
    if (error) console.warn(`  Ticket: ${error.message}`);
  }
  console.log(`  ✓ ${tickets.length} chamados SAC`);
}

async function main() {
  console.log("🌱 Iniciando seed da Editora Jocum...\n");

  try {
    const authorMap = await seedAuthors(books);
    const catMap = await seedCategories();
    await seedBooks(books, authorMap, catMap);
    await seedFaq();
    await seedNews();
    await seedDemoData(books);

    console.log("\n✅ Seed concluído! Sistema pronto para demo.\n");
  } catch (err) {
    console.error("ERRO:", err);
    process.exit(1);
  }
}

main();
