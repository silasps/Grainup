#!/usr/bin/env node
/**
 * Script de scraping — Editora Jocum → GrainUp
 * Extrai todos os livros de editorajocum.com.br e baixa as capas.
 *
 * Uso: node scripts/scrape-books.js
 * Output: scripts/data/books.json + scripts/data/covers/
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const BASE_URL = "https://editorajocum.com.br";

// Categorias de livros para rastrear (padrão real do site)
const CATEGORY_URLS = [
  `${BASE_URL}/categoria-produto/livros/aconselhamento/`,
  `${BASE_URL}/categoria-produto/livros/batalha-espiritual-livros/`,
  `${BASE_URL}/categoria-produto/livros/biografia/`,
  `${BASE_URL}/categoria-produto/livros/devocional/`,
  `${BASE_URL}/categoria-produto/livros/evangelismo/`,
  `${BASE_URL}/categoria-produto/livros/familia/`,
  `${BASE_URL}/categoria-produto/livros/financas/`,
  `${BASE_URL}/categoria-produto/livros/herois-cristaos/`,
  `${BASE_URL}/categoria-produto/livros/historia-da-igreja/`,
  `${BASE_URL}/categoria-produto/livros/homens/`,
  `${BASE_URL}/categoria-produto/livros/identidade-e-sexualidade/`,
  `${BASE_URL}/categoria-produto/livros/igreja/`,
  `${BASE_URL}/categoria-produto/livros/jovens-e-adolescentes/`,
  `${BASE_URL}/categoria-produto/livros/lideranca/`,
  `${BASE_URL}/categoria-produto/livros/missoes/`,
  `${BASE_URL}/categoria-produto/livros/mulheres/`,
  `${BASE_URL}/categoria-produto/livros/oracao/`,
  `${BASE_URL}/categoria-produto/livros/vida-crista/`,
  `${BASE_URL}/categoria-produto/livros/transformacao-social/`,
  `${BASE_URL}/loja/`,   // fallback geral
];

const OUTPUT_DIR = path.join(__dirname, "data");
const COVERS_DIR = path.join(OUTPUT_DIR, "covers");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "books.json");

const DELAY_MS = 600;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
      timeout: 20000,
    };
    const req = protocol.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchHtml(new URL(res.headers.location, url).href));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      resolve(dest);
      return;
    }
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: { "User-Agent": UA },
      timeout: 25000,
    };
    const file = fs.createWriteStream(dest);
    const req = protocol.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        resolve(downloadFile(new URL(res.headers.location, url).href, dest));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
      file.on("error", (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
    });
    req.on("error", (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout download: ${url}`)); });
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function cleanHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, (m) => {
      try { return String.fromCharCode(parseInt(m.slice(2,-1))); } catch { return " "; }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function between(str, start, end, fromIndex = 0) {
  const s = str.indexOf(start, fromIndex);
  if (s === -1) return null;
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return null;
  return str.slice(s + start.length, e).trim();
}

function allMatches(str, re) {
  const results = [];
  let m;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(str)) !== null) results.push(m);
  return results;
}

async function getProductLinksFromPage(html) {
  const links = new Set();
  const re = /href="(https:\/\/editorajocum\.com\.br\/produto\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add(m[1].replace(/\/$/, ""));
  }
  return [...links];
}

async function scrapeProduct(url) {
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    console.warn(`    ERRO: ${e.message}`);
    return null;
  }

  // Título
  let title = "";
  const h1m = /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)</.exec(html);
  if (h1m) title = cleanHtml(h1m[1]);
  if (!title) {
    const h1b = between(html, '<h1 class="product_title entry-title">', "</h1>");
    if (h1b) title = cleanHtml(h1b);
  }
  if (!title) {
    const ogTitle = between(html, '<meta property="og:title" content="', '"');
    if (ogTitle) title = cleanHtml(ogTitle).replace(" – Editora Jocum Brasil", "").trim();
  }

  if (!title) {
    console.warn(`    SKIP: sem título em ${url}`);
    return null;
  }

  // Capa — OG image é a mais confiável
  let coverUrl = null;
  const ogImg = between(html, '<meta property="og:image" content="', '"');
  if (ogImg) coverUrl = ogImg;

  if (!coverUrl) {
    const wpImg = /class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/.exec(html);
    if (wpImg) coverUrl = wpImg[1];
  }

  // Tentar pegar versão maior (remover sufixo de tamanho do WP)
  if (coverUrl) {
    coverUrl = coverUrl.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1");
  }

  // Preço
  let price = 0;
  let pricePromo = null;

  // Tenta pegar o JSON-LD do produto (WooCommerce inclui isso)
  const jsonLdM = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let jm;
  while ((jm = jsonLdM.exec(html)) !== null) {
    try {
      const data = JSON.parse(jm[1]);
      if (data["@type"] === "Product") {
        if (data.offers) {
          const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
          price = parseFloat(offer.price) || 0;
        }
        if (data.image && !coverUrl) coverUrl = Array.isArray(data.image) ? data.image[0] : data.image;
        break;
      }
    } catch {}
  }

  // Fallback de preço via HTML
  if (!price) {
    const priceArea = between(html, 'class="price"', "</p>") || between(html, 'class="price"', "</span></span>");
    if (priceArea) {
      const prices = allMatches(priceArea, /R\$\s*(\d+[.,]\d{2})/);
      if (prices.length >= 2) {
        pricePromo = parseFloat(prices[0][1].replace(",", "."));
        price = parseFloat(prices[1][1].replace(",", "."));
      } else if (prices.length === 1) {
        price = parseFloat(prices[0][1].replace(",", "."));
      }
    }
  }

  // Descrição curta (OG description)
  const ogDesc = between(html, '<meta name="description" content="', '"') ||
    between(html, '<meta property="og:description" content="', '"');
  const descriptionShort = ogDesc ? cleanHtml(ogDesc).slice(0, 500) : null;

  // Descrição completa
  let descriptionFull = null;
  const tabDesc = between(html, 'class="woocommerce-Tabs-panel woocommerce-Tabs-panel--description', "</div>");
  if (tabDesc) {
    descriptionFull = cleanHtml(tabDesc).slice(0, 3000);
  }

  // Categorias via meta keywords ou breadcrumb
  const categories = [];
  const catRe = /\/categoria-produto\/livros\/([^/"]+)\//g;
  let cm;
  while ((cm = catRe.exec(html)) !== null) {
    const catName = cm[1]
      .replace(/-/g, " ")
      .replace(/livros$/, "")
      .trim();
    if (catName && catName.length > 2) categories.push(catName);
  }

  // Autor via meta do WooCommerce
  let author = null;
  const authorCatM = /\/categoria-produto\/autores\/([^/"]+)\//.exec(html);
  if (authorCatM) {
    author = authorCatM[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Dados extras via tabela de atributos do WooCommerce
  const tableHtml = between(html, 'class="woocommerce-product-attributes', "</table>") || "";

  function getAttr(label) {
    const re = new RegExp(label + "[^<]*<\\/th>[^<]*<td[^>]*>([^<]+)<", "i");
    const m = re.exec(tableHtml);
    return m ? cleanHtml(m[1]).trim() : null;
  }

  const isbn = getAttr("ISBN") || between(html, "ISBN:", "<") || null;
  const skuRaw = between(html, 'class="sku">', "<") || getAttr("SKU");
  const sku = skuRaw ? skuRaw.trim().slice(0, 50) : null;

  const weightStr = getAttr("Peso");
  let weightGrams = null;
  if (weightStr) {
    const wm = /([0-9.,]+)\s*kg/i.exec(weightStr);
    if (wm) weightGrams = Math.round(parseFloat(wm[1].replace(",", ".")) * 1000);
    const wm2 = /([0-9.,]+)\s*g(?!r)/i.exec(weightStr);
    if (wm2) weightGrams = Math.round(parseFloat(wm2[1].replace(",", ".")));
  }

  const dimsStr = getAttr("Dimens");
  let height = null, width = null, length = null;
  if (dimsStr) {
    const dm = /([0-9.,]+)\s*[×xX]\s*([0-9.,]+)\s*[×xX]\s*([0-9.,]+)/i.exec(dimsStr);
    if (dm) {
      height = parseFloat(dm[1].replace(",", "."));
      width = parseFloat(dm[2].replace(",", "."));
      length = parseFloat(dm[3].replace(",", "."));
    }
  }

  const pagesStr = getAttr("P[áa]ginas?");
  const pages = pagesStr ? parseInt(pagesStr) : null;

  return {
    title,
    slug: slugify(title),
    url,
    price: Math.round(price * 100) / 100,
    price_promotional: pricePromo ? Math.round(pricePromo * 100) / 100 : null,
    cover_url: coverUrl,
    description_short: descriptionShort,
    description_full: descriptionFull,
    categories: [...new Set(categories)],
    author,
    isbn: isbn ? isbn.replace(/\D/g, "").slice(0, 20) || null : null,
    sku,
    weight_grams: weightGrams,
    height_cm: height,
    width_cm: width,
    length_cm: length,
    pages,
    publisher: "Editora Jocum Brasil",
    is_active: true,
    is_featured: false,
    is_new: false,
    is_bestseller: false,
    stock: 50,
  };
}

async function crawlCategoryPages(baseUrl) {
  const links = new Set();
  let page = 1;

  while (page <= 15) {
    const url = page === 1 ? baseUrl : `${baseUrl.replace(/\/$/, "")}/page/${page}/`;
    let html;
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }

    if (!html.includes("/produto/")) break;

    const found = await getProductLinksFromPage(html);
    if (found.length === 0) break;

    found.forEach((l) => links.add(l));
    process.stdout.write(` +${found.length}`);

    // Verifica se há próxima página
    if (!html.includes('class="next page-numbers"') && !html.includes('rel="next"')) break;

    page++;
    await sleep(DELAY_MS);
  }

  return [...links];
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  console.log("🔍 Coletando links de produtos por categoria...\n");

  const allLinks = new Set();

  for (const catUrl of CATEGORY_URLS) {
    process.stdout.write(`📂 ${catUrl.split("/").slice(-2, -1)[0] || "loja"}:`);
    const links = await crawlCategoryPages(catUrl);
    links.forEach((l) => allLinks.add(l));
    console.log(` → ${links.length} links (total: ${allLinks.size})`);
    await sleep(DELAY_MS);
  }

  const linkArr = [...allLinks];
  console.log(`\n📚 ${linkArr.length} produtos únicos encontrados. Scraping detalhes...\n`);

  const books = [];

  for (let i = 0; i < linkArr.length; i++) {
    process.stdout.write(`[${String(i + 1).padStart(3)}/${linkArr.length}] `);
    const book = await scrapeProduct(linkArr[i]);
    if (book) {
      books.push(book);
      console.log(`✓ ${book.title.slice(0, 60)} — R$${book.price}`);
    } else {
      console.log(`✗ SKIP`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n🖼️  Baixando ${books.filter((b) => b.cover_url).length} capas...\n`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (!book.cover_url) continue;

    let ext = ".jpg";
    try {
      const u = new URL(book.cover_url);
      const e = path.extname(u.pathname);
      if (e) ext = e.toLowerCase();
    } catch {}

    const filename = `${book.slug}${ext}`;
    const dest = path.join(COVERS_DIR, filename);

    try {
      await downloadFile(book.cover_url, dest);
      book.cover_local = `covers/${filename}`;
      process.stdout.write(`  ✓ [${i + 1}/${books.length}] ${filename}\n`);
    } catch (e) {
      console.warn(`  ✗ [${i + 1}] ${book.title.slice(0, 40)}: ${e.message}`);
    }

    await sleep(300);
  }

  // Normalizar slugs duplicados
  const slugCount = {};
  for (const book of books) {
    slugCount[book.slug] = (slugCount[book.slug] || 0) + 1;
  }
  const slugSeen = {};
  for (const book of books) {
    if (slugCount[book.slug] > 1) {
      slugSeen[book.slug] = (slugSeen[book.slug] || 0) + 1;
      if (slugSeen[book.slug] > 1) {
        book.slug = `${book.slug}-${slugSeen[book.slug]}`;
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(books, null, 2), "utf8");

  const stats = {
    total: books.length,
    withCover: books.filter((b) => b.cover_local).length,
    withPrice: books.filter((b) => b.price > 0).length,
    withAuthor: books.filter((b) => b.author).length,
    withDesc: books.filter((b) => b.description_short).length,
    avgPrice: (books.reduce((s, b) => s + b.price, 0) / books.length).toFixed(2),
  };

  console.log(`
✅ Scraping concluído!
   📖 Livros extraídos:  ${stats.total}
   🖼️  Com capa:          ${stats.withCover}
   💰 Com preço:          ${stats.withPrice}
   ✍️  Com autor:          ${stats.withAuthor}
   📝 Com descrição:      ${stats.withDesc}
   💵 Preço médio:        R$ ${stats.avgPrice}
   💾 Arquivo:            ${OUTPUT_FILE}
   🗂️  Capas:              ${COVERS_DIR}
`);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
