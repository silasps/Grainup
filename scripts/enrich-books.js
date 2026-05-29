#!/usr/bin/env node
/**
 * Enriquece books.json com preços realistas e autores corrigidos.
 * Preços baseados no intervalo real do site (R$29,90–R$85,00).
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "books.json");
const books = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

// Mapa de slugs de categoria → autores reais conhecidos do site
const KNOWN_AUTHORS = {
  "pr-marcos-borges-coty-autores": "Pr. Marcos Borges Coty",
  "loren-cunningham": "Loren Cunningham",
  "john-dawson": "John Dawson",
  "joy-dawson": "Joy Dawson",
  "vishal-mangalwadi": "Vishal Mangalwadi",
  "beverly-lahaye": "Beverly LaHaye",
  "darrow-l-miller": "Darrow L. Miller",
  "neal-pirolo": "Neal Pirolo",
  "landa-cope": "Landa Cope",
  "brian-d-molitor": "Brian D. Molitor",
  "jim-stier": "Jim Stier",
  "euripedes-mendes": "Pr. Eurípedes Mendes",
  "j-b-carvalho": "J.B. Carvalho",
  "alcione-emerich": "Alcione Emerich",
  "abe-huber": "Abe Huber",
  "danny-lehmann": "Danny Lehmann",
  "conca-trindade": "Conca Trindade",
  "luciano-subira": "Luciano Subirá",
  "oswaldo": "Pr. Oswaldo Lobo Jr.",
  "fabiodamasceno": "Fábio Damasceno",
  "robson-de-oliveira": "Robson de Oliveira",
};

// Mapeamento de categorias do slug → nome amigável
const CATEGORY_MAP = {
  "aconselhamento": "Aconselhamento",
  "batalha-espiritual-livros": "Batalha espiritual",
  "batalha-espiritual": "Batalha espiritual",
  "biografia": "Biografia",
  "devocional": "Devocional",
  "evangelismo": "Evangelismo",
  "familia": "Família",
  "financas": "Finanças",
  "herois-cristaos": "Biografia",
  "historia-da-igreja": "Igreja",
  "homens": "Vida cristã",
  "identidade-e-sexualidade": "Aconselhamento",
  "igreja": "Igreja",
  "jovens-e-adolescentes": "Vida cristã",
  "lideranca": "Liderança",
  "missoes": "Missões",
  "mulheres": "Mulheres",
  "oracao": "Oração",
  "vida-crista": "Vida cristã",
  "transformacao-social": "Transformação social",
};

// Preços reais conhecidos de alguns livros (para referência)
const KNOWN_PRICES = {
  "20-verdades-que-me-ajudaram-na-luta-contra-o-vicio-em-pornografia-steve-gallagher": 85.00,
  "a-mulher-controlada-pelo-espirito-beverly-lahaye-capa-dura": 69.90,
  "a-batalha-de-todas-as-geracoes": 70.00,
  "a-caixa": 35.00,
  "a-mente-renovada": 29.90,
};

// Faixas de preço por categoria (baseadas no site)
const PRICE_BY_CATEGORY = {
  "Missões": { min: 55, max: 80 },
  "Liderança": { min: 45, max: 75 },
  "Família": { min: 40, max: 70 },
  "Aconselhamento": { min: 40, max: 85 },
  "Batalha espiritual": { min: 45, max: 75 },
  "Biografia": { min: 50, max: 80 },
  "Vida cristã": { min: 35, max: 65 },
  "Oração": { min: 35, max: 65 },
  "Mulheres": { min: 40, max: 75 },
  "Evangelismo": { min: 45, max: 70 },
  "Igreja": { min: 40, max: 70 },
  "Devocional": { min: 30, max: 60 },
  "Finanças": { min: 40, max: 70 },
  "Transformação social": { min: 50, max: 80 },
  "default": { min: 35, max: 75 },
};

// Preços "bonitos" (terminam em ,90 ou ,00)
function nicePrice(min, max) {
  const base = Math.floor(Math.random() * (max - min) + min);
  const endings = [0.00, 0.90];
  return base + endings[Math.floor(Math.random() * endings.length)];
}

// Extrair autor real do slug da URL
function extractAuthorFromUrl(url) {
  for (const [slug, name] of Object.entries(KNOWN_AUTHORS)) {
    if (url.includes(slug)) return name;
  }
  return null;
}

// Corrigir autor que veio errado (category path)
function fixAuthor(book) {
  // Se o autor está com formato errado (ex: "Pr Marcos Borges Coty Autores")
  const authorFromUrl = extractAuthorFromUrl(book.url);
  if (authorFromUrl) return authorFromUrl;

  // Tentar extrair do título (padrão "Título – Autor")
  const dashMatch = book.title.match(/[–—-]\s*(.+)$/);
  if (dashMatch) {
    const candidate = dashMatch[1].trim();
    // Verificar se não é uma editora ou número
    if (candidate.length > 3 && candidate.length < 50 && !/^\d/.test(candidate)) {
      return candidate;
    }
  }

  // Limpar o autor atual se veio como slug de categoria
  if (book.author && book.author.includes("Autores")) {
    return null;
  }

  return book.author;
}

// Corrigir categorias
function fixCategories(book) {
  const cats = new Set();

  // Extrair categorias da URL do produto
  const catSlugs = book.url.match(/categoria-produto\/livros\/([^/]+)/g) || [];
  for (const match of catSlugs) {
    const slug = match.replace("categoria-produto/livros/", "");
    const name = CATEGORY_MAP[slug];
    if (name) cats.add(name);
  }

  // Também das categorias extraídas pelo scraper
  for (const cat of (book.categories || [])) {
    const clean = cat.trim();
    const mapped = CATEGORY_MAP[clean] || Object.values(CATEGORY_MAP).find(
      v => v.toLowerCase() === clean.toLowerCase()
    );
    if (mapped) cats.add(mapped);
  }

  return [...cats];
}

// Determinar preço
function getPrice(book, categories) {
  // Preço específico conhecido
  for (const [slug, price] of Object.entries(KNOWN_PRICES)) {
    if (book.url.includes(slug)) return { price, promo: null };
  }

  // Faixa por categoria
  const cat = categories[0] || "default";
  const range = PRICE_BY_CATEGORY[cat] || PRICE_BY_CATEGORY["default"];
  const price = nicePrice(range.min, range.max);

  // 20% dos livros têm preço promocional
  const hasPromo = Math.random() < 0.2;
  const promoPrice = hasPromo
    ? Math.round((price * (0.7 + Math.random() * 0.15)) * 100) / 100
    : null;

  // Arredondar para preço bonito
  const roundedPromo = promoPrice
    ? Math.floor(promoPrice) + (Math.random() > 0.5 ? 0.9 : 0.0)
    : null;

  return {
    price: Math.round(price * 100) / 100,
    promo: roundedPromo ? Math.round(roundedPromo * 100) / 100 : null,
  };
}

// Calcular avaliações para a demo (distribução realista)
function getSeededRating(slug) {
  // Usar hash simples do slug para gerar dados consistentes
  let hash = 0;
  for (const c of slug) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const normalized = Math.abs(hash) / 0xffffffff;

  // 60% dos livros sem avaliação, 40% com
  if (normalized < 0.60) return { avg: 0, count: 0 };

  const count = Math.floor(normalized * 20) + 1; // 1-20 avaliações
  const avg = 3.5 + normalized * 1.5; // 3.5-5.0
  return {
    avg: Math.round(avg * 10) / 10,
    count,
  };
}

// Determinar flags de destaque (para demo)
function getFlags(i, book, categories) {
  const isBestseller = i % 7 === 0 || i % 13 === 0; // ~20% bestsellers
  const isNew = i % 5 === 0; // ~20% novos
  const isFeatured = i % 11 === 0; // ~9% destaques

  return { isBestseller, isNew, isFeatured };
}

// Processar todos os livros
let fixed = 0;
const enriched = books.map((book, i) => {
  const categories = fixCategories(book);
  const author = fixAuthor(book);
  const { price, promo } = getPrice(book, categories);
  const { avg: ratingAvg, count: ratingCount } = getSeededRating(book.slug);
  const { isBestseller, isNew, isFeatured } = getFlags(i, book, categories);

  if (author !== book.author || price !== book.price) fixed++;

  // Limpar título (remover "– Autor" do final que às vezes vem junto)
  let title = book.title;
  // Alguns títulos têm "— Nome Autor" no final — remover apenas se o autor já foi extraído
  if (author && title.includes("–")) {
    const withoutAuthor = title.replace(/\s*[–—]\s*[^–—]+$/, "").trim();
    if (withoutAuthor.length > 5) title = withoutAuthor;
  }

  return {
    ...book,
    title,
    author: author || null,
    categories,
    price,
    price_promotional: promo,
    rating_avg: ratingAvg,
    rating_count: ratingCount,
    is_bestseller: isBestseller,
    is_new: isNew,
    is_featured: isFeatured,
    stock: 30 + Math.floor(Math.random() * 70), // 30-100 unidades
  };
});

fs.writeFileSync(DATA_FILE, JSON.stringify(enriched, null, 2), "utf8");

const stats = {
  total: enriched.length,
  withPrice: enriched.filter((b) => b.price > 0).length,
  withAuthor: enriched.filter((b) => b.author).length,
  withCategories: enriched.filter((b) => b.categories.length > 0).length,
  withRating: enriched.filter((b) => b.rating_count > 0).length,
  withPromo: enriched.filter((b) => b.price_promotional).length,
  bestsellers: enriched.filter((b) => b.is_bestseller).length,
  newBooks: enriched.filter((b) => b.is_new).length,
  avgPrice: (enriched.reduce((s, b) => s + b.price, 0) / enriched.length).toFixed(2),
};

console.log(`
✅ Enriquecimento concluído!
   📖 Total:          ${stats.total}
   💰 Com preço:      ${stats.withPrice}
   ✍️  Com autor:      ${stats.withAuthor}
   📂 Com categoria:  ${stats.withCategories}
   ⭐ Com avaliação:  ${stats.withRating}
   🏷️  Com promoção:   ${stats.withPromo}
   🔥 Bestsellers:    ${stats.bestsellers}
   🆕 Novidades:      ${stats.newBooks}
   💵 Preço médio:    R$ ${stats.avgPrice}
   🔄 Corrigidos:     ${fixed}
`);
