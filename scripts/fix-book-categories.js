#!/usr/bin/env node
/**
 * fix-book-categories.js
 *
 * Estratégia:
 *   1. Rastreia cada página de CATEGORIA no editorajocum.com.br (~19 URLs)
 *   2. Coleta os slugs de produto encontrados em cada página
 *   3. Monta mapa: url-produto → categoria
 *   4. Cruza com books.json para obter o slug interno de cada livro
 *   5. Atualiza category_id no Supabase
 *
 * Vantagem: apenas ~19 fetches de página de categoria (não 1 por livro).
 * Sem IA — dados vêm direto do site.
 *
 * Uso: node scripts/fix-book-categories.js
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://xefpmolwcxxfckdvnncz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZnBtb2x3Y3h4ZmNrZHZubmN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTkyODU1MiwiZXhwIjoyMDk1NTA0NTUyfQ.SoqYQTqw_vdV2MNVYOzOEGFnKZbBf4v9j31RwvxgMjI";

const BASE_URL = "https://editorajocum.com.br";
const DELAY_MS = 500;
const BOOKS_JSON = path.join(__dirname, "data", "books.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Mapeamento URL-slug → nome da categoria no banco
const CATEGORIES = [
  { slug: "aconselhamento",           name: "Aconselhamento" },
  { slug: "batalha-espiritual-livros", name: "Batalha espiritual" },
  { slug: "batalha-espiritual",        name: "Batalha espiritual" },
  { slug: "biografia",                 name: "Biografia" },
  { slug: "devocional",                name: "Devocional" },
  { slug: "evangelismo",               name: "Evangelismo" },
  { slug: "familia",                   name: "Família" },
  { slug: "financas",                  name: "Finanças" },
  { slug: "herois-cristaos",           name: "Biografia" },
  { slug: "historia-da-igreja",        name: "Igreja" },
  { slug: "homens",                    name: "Vida cristã" },
  { slug: "identidade-e-sexualidade",  name: "Aconselhamento" },
  { slug: "igreja",                    name: "Igreja" },
  { slug: "jovens-e-adolescentes",     name: "Vida cristã" },
  { slug: "lideranca",                 name: "Liderança" },
  { slug: "missoes",                   name: "Missões" },
  { slug: "mulheres",                  name: "Mulheres" },
  { slug: "oracao",                    name: "Oração" },
  { slug: "vida-crista",               name: "Vida cristã" },
  { slug: "transformacao-social",      name: "Transformação social" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const proto = parsed.protocol === "https:" ? https : http;
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
      timeout: 20000,
    };
    const req = proto.get(opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHtml(new URL(res.headers.location, url).href));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function extractProductUrls(html) {
  const links = new Set();
  const re = /href="(https:\/\/editorajocum\.com\.br\/produto\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add(m[1].replace(/\/$/, ""));
  }
  return [...links];
}

async function crawlCategoryPage(catSlug) {
  const baseUrl = `${BASE_URL}/categoria-produto/livros/${catSlug}/`;
  const links = new Set();
  let page = 1;

  while (page <= 20) {
    const url = page === 1 ? baseUrl : `${baseUrl.replace(/\/$/, "")}/page/${page}/`;
    let html;
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }
    if (!html.includes("/produto/")) break;
    const found = extractProductUrls(html);
    if (found.length === 0) break;
    found.forEach((l) => links.add(l));
    if (!html.includes('class="next page-numbers"') && !html.includes('rel="next"')) break;
    page++;
    await sleep(DELAY_MS);
  }

  return [...links];
}

// Supabase REST helper
async function supabaseFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + (parsed.search || ""),
      method: opts.method || "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=minimal",
        ...(opts.headers || {}),
      },
      timeout: 15000,
    };
    const req = https.request(reqOpts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: res.statusCode, body: text });
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Supabase timeout")); });
    if (body) req.write(body);
    req.end();
  });
  return res;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Carregar books.json para ter o mapa url → slug interno
  const booksData = JSON.parse(fs.readFileSync(BOOKS_JSON, "utf8"));
  const urlToSlug = {};
  for (const b of booksData) {
    if (b.url) urlToSlug[b.url.replace(/\/$/, "")] = b.slug;
  }
  console.log(`📚 books.json carregado: ${booksData.length} livros`);

  // 2. Rastrear cada categoria no site
  console.log("\n🔍 Rastreando páginas de categoria...\n");
  // url-produto → categoria (primeiro match vence)
  const urlToCategory = {};

  for (const cat of CATEGORIES) {
    process.stdout.write(`  📂 ${cat.slug.padEnd(30)} `);
    const links = await crawlCategoryPage(cat.slug);
    let newLinks = 0;
    for (const link of links) {
      if (!urlToCategory[link]) {
        urlToCategory[link] = cat.name;
        newLinks++;
      }
    }
    console.log(`→ ${links.length} produtos (+${newLinks} novos)`);
    await sleep(DELAY_MS);
  }

  const totalMapped = Object.keys(urlToCategory).length;
  console.log(`\n✅ ${totalMapped} URLs de produtos mapeadas para categorias`);

  // 3. Cruzar com books.json: slug interno → categoria
  const slugToCategory = {};
  let matched = 0;
  let unmatched = 0;

  for (const [url, catName] of Object.entries(urlToCategory)) {
    const slug = urlToSlug[url];
    if (slug) {
      slugToCategory[slug] = catName;
      matched++;
    } else {
      // Tentar por último segmento da URL
      const urlSlug = url.split("/").pop();
      if (urlToSlug[`${BASE_URL}/produto/${urlSlug}`]) {
        slugToCategory[urlToSlug[`${BASE_URL}/produto/${urlSlug}`]] = catName;
        matched++;
      } else {
        unmatched++;
      }
    }
  }

  console.log(`\n🔗 Cruzamento: ${matched} livros com categoria | ${unmatched} sem match`);

  // 4. Buscar categorias do banco
  console.log("\n📡 Buscando categorias do banco...");
  const catsRes = await supabaseFetch("/categories?select=id,name");
  const categories = JSON.parse(catsRes.body);
  const catNameToId = {};
  for (const c of categories) catNameToId[c.name] = c.id;
  console.log(`  ✓ ${categories.length} categorias encontradas: ${Object.keys(catNameToId).join(", ")}`);

  // 5. Buscar todos os livros do banco (slug → id)
  console.log("\n📡 Buscando livros do banco...");
  const booksRes = await supabaseFetch("/books?select=id,slug&limit=1000");
  const dbBooks = JSON.parse(booksRes.body);
  const bookSlugToId = {};
  for (const b of dbBooks) bookSlugToId[b.slug] = b.id;
  console.log(`  ✓ ${dbBooks.length} livros no banco`);

  // 6. Atualizar category_id de cada livro
  console.log("\n🔄 Atualizando categorias no banco...\n");
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const entries = Object.entries(slugToCategory);
  for (let i = 0; i < entries.length; i++) {
    const [slug, catName] = entries[i];
    const bookId = bookSlugToId[slug];
    const catId = catNameToId[catName];

    if (!bookId) { skipped++; continue; }
    if (!catId) {
      console.warn(`  ⚠️  Categoria "${catName}" não existe no banco`);
      skipped++;
      continue;
    }

    const res = await supabaseFetch(
      `/books?id=eq.${bookId}`,
      { method: "PATCH", body: { category_id: catId } }
    );

    if (res.status >= 200 && res.status < 300) {
      updated++;
      if (updated % 20 === 0) process.stdout.write(`  ✓ ${updated}/${entries.length} atualizados\n`);
    } else {
      console.error(`  ✗ Erro ao atualizar ${slug}: ${res.status} ${res.body}`);
      errors++;
    }

    // Pequena pausa para não sobrecarregar a API
    if (i % 10 === 9) await sleep(100);
  }

  console.log(`
✅ Concluído!
   🔄 Livros atualizados:  ${updated}
   ⏭️  Sem match/pulados:   ${skipped}
   ❌ Erros:               ${errors}
`);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
