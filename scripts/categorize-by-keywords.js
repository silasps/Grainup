#!/usr/bin/env node
/**
 * categorize-by-keywords.js
 *
 * Para os livros incorretamente em "Aconselhamento" (legado do seed),
 * aplica keyword scoring em título + descrição para reatribuir a categoria correta.
 * Só atualiza quando há confiança clara (score > threshold).
 *
 * Uso: node scripts/categorize-by-keywords.js [--dry-run]
 */

const https = require("https");

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = "https://xefpmolwcxxfckdvnncz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZnBtb2x3Y3h4ZmNrZHZubmN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTkyODU1MiwiZXhwIjoyMDk1NTA0NTUyfQ.SoqYQTqw_vdV2MNVYOzOEGFnKZbBf4v9j31RwvxgMjI";

// ── Regras de categorização por palavras-chave ────────────────────────────────
// title keywords valem 4x, description keywords valem 1x
const RULES = [
  {
    category: "Missões",
    title: ["missões", "missionário", "missionária", "missão", "povos", "nações", "jocum", "ywam", "alcançar os", "plantio"],
    desc:  ["missões", "missionário", "missionária", "povos não alcançados", "campo missionário", "plantio de igrejas", "evangelização global", "nações", "cross-cultural"],
  },
  {
    category: "Liderança",
    title: ["liderança", "líder", "líderes", "discipulado", "discípulo", "pastor", "servo", "servir", "autoridade"],
    desc:  ["liderança", "líderes", "discipulado", "discípulo", "mentor", "pastores", "desenvolvimento de líderes", "influência", "visão estratégica"],
  },
  {
    category: "Família",
    title: ["família", "casamento", "filhos", "pais", "lar", "matrimônio", "esposo", "esposa", "pai", "mãe"],
    desc:  ["família", "casamento", "filhos", "relacionamento conjugal", "lar", "matrimônio", "parentalidade", "criação dos filhos"],
  },
  {
    category: "Mulheres",
    title: ["mulheres", "mulher", "feminino", "feminina", "esposa", "mãe", "meninas", "garota"],
    desc:  ["mulheres", "mulher", "feminino", "esposa", "mãe", "identidade feminina", "papel da mulher"],
  },
  {
    category: "Batalha espiritual",
    title: ["batalha", "guerra espiritual", "espiritual", "demônio", "satanás", "oculto", "libertação", "principados"],
    desc:  ["batalha espiritual", "guerra espiritual", "demônios", "satanás", "oculto", "libertação", "principados", "potestades", "trevas"],
  },
  {
    category: "Transformação social",
    title: ["transformação social", "transformação", "justiça", "pobreza", "sociedade", "reforma", "cultura", "nações"],
    desc:  ["transformação social", "justiça social", "pobreza", "oprimidos", "reforma cultural", "influência na sociedade", "bem comum"],
  },
  {
    category: "Igreja",
    title: ["igreja", "ekklesia", "congregação", "corpo de cristo", "ministério", "comunidade"],
    desc:  ["igreja", "ekklesia", "congregação", "ministério da igreja", "corpo de cristo", "comunidade cristã", "avivamento"],
  },
  {
    category: "Oração",
    title: ["oração", "intercessão", "jejum", "adoração", "vigília", "clamar"],
    desc:  ["oração", "intercessão", "jejum", "adoração", "vigília", "comunhão com deus", "vida de oração"],
  },
  {
    category: "Devocional",
    title: ["devocional", "reflexão", "meditação", "365", "todo dia", "manhã", "devoção"],
    desc:  ["devocional", "reflexão diária", "meditação", "leitura diária", "365 dias", "dia a dia com deus"],
  },
  {
    category: "Evangelismo",
    title: ["evangelismo", "evangelizar", "testemunho", "ganhar almas", "compartilhar", "proclamar", "apologética"],
    desc:  ["evangelismo", "evangelizar", "testemunho", "ganhar almas", "compartilhar a fé", "proclamar o evangelho", "apologética"],
  },
  {
    category: "Biografia",
    title: ["biografia", "autobiografia", "história de vida", "memórias", "vida de", "herói", "heróis"],
    desc:  ["biografia", "autobiografia", "história de vida", "memórias", "relato de vida", "testemunho de vida"],
  },
  {
    category: "Finanças",
    title: ["finanças", "dinheiro", "prosperidade", "riqueza", "recursos", "economias", "investimento"],
    desc:  ["finanças", "dinheiro", "prosperidade", "riqueza", "administração financeira", "mordomia"],
  },
  {
    category: "Vida cristã",
    title: ["vida cristã", "fé", "santidade", "crescimento", "maturidade", "discipulado", "identidade", "sexualidade", "pureza"],
    desc:  ["vida cristã", "santidade", "crescimento espiritual", "maturidade espiritual", "identidade em cristo", "pureza"],
  },
  {
    category: "Aconselhamento",
    title: ["aconselhamento", "vício", "pornografia", "cura interior", "restauração", "trauma", "dependência", "abuso"],
    desc:  ["aconselhamento", "vício", "pornografia", "cura interior", "restauração", "trauma", "dependência", "abuso", "cura emocional"],
  },
];

function scoreBook(title, desc) {
  const t = (title || "").toLowerCase();
  const d = (desc || "").toLowerCase();
  const scores = {};

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.title) if (t.includes(kw)) score += 4;
    for (const kw of rule.desc)  if (d.includes(kw)) score += 1;
    if (score > 0) scores[rule.category] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted; // [[category, score], ...]
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function supabaseFetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const reqOpts = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ""),
      method: opts.method || "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=minimal",
        ...(opts.headers || {}),
      },
      timeout: 15000,
    };
    const req = https.request(reqOpts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log("🔍 MODO DRY-RUN — nenhuma alteração será feita\n");

  // 1. Buscar todas as categorias
  const catsRes = await supabaseFetch("/categories?select=id,name");
  const categories = JSON.parse(catsRes.body);
  const catNameToId = Object.fromEntries(categories.map(c => [c.name, c.id]));
  const catIdToName = Object.fromEntries(categories.map(c => [c.id, c.name]));
  console.log(`✓ ${categories.length} categorias no banco`);

  // 2. Buscar TODOS os livros com título, descrição e categoria atual
  const booksRes = await supabaseFetch(
    "/books?select=id,title,slug,description_short,category_id&limit=1000"
  );
  const books = JSON.parse(booksRes.body);
  console.log(`✓ ${books.length} livros no banco\n`);

  // ID da categoria "Aconselhamento" (a que pode estar errada)
  const aconselhamentoId = catNameToId["Aconselhamento"];

  // 3. Filtrar livros com "Aconselhamento" que podem estar errados
  // (excluindo os que genuinamente são de aconselhamento — detectados pelo keyword match)
  const toCheck = books.filter(b => b.category_id === aconselhamentoId);
  console.log(`📋 ${toCheck.length} livros atualmente em "Aconselhamento"\n`);

  let updated = 0, kept = 0, uncertain = 0;
  const changes = [];

  for (const book of toCheck) {
    const scored = scoreBook(book.title, book.description_short);

    if (scored.length === 0) {
      // Sem keywords — manter em Aconselhamento por falta de evidência
      uncertain++;
      continue;
    }

    const [bestCat, bestScore] = scored[0];
    const secondScore = scored[1]?.[1] ?? 0;

    // Só muda se:
    // - melhor categoria tem score >= 4 (pelo menos 1 hit no título)
    // - e é mais de 1.5x o segundo lugar (sinal claro)
    const isConfident = bestScore >= 4 && (secondScore === 0 || bestScore / secondScore >= 1.5);

    if (isConfident && bestCat !== "Aconselhamento") {
      changes.push({ book, from: "Aconselhamento", to: bestCat, score: bestScore });
    } else if (bestCat === "Aconselhamento" && isConfident) {
      kept++;
    } else {
      uncertain++;
    }
  }

  // Mostrar preview das mudanças
  console.log(`\n📝 Mudanças a aplicar (${changes.length}):\n`);
  for (const { book, to, score } of changes) {
    console.log(`  [score:${score}] ${book.title.slice(0, 55).padEnd(55)} → ${to}`);
  }
  console.log(`\n✅ Mantidos em Aconselhamento (confirmados): ${kept}`);
  console.log(`⚠️  Incertos (sem keywords claras):            ${uncertain}`);

  if (DRY_RUN) {
    console.log("\n🔍 Dry-run concluído. Rode sem --dry-run para aplicar.");
    return;
  }

  // 4. Aplicar mudanças
  console.log("\n🔄 Atualizando banco...\n");
  let errors = 0;

  for (let i = 0; i < changes.length; i++) {
    const { book, to } = changes[i];
    const catId = catNameToId[to];
    if (!catId) { console.warn(`  ⚠️  Categoria "${to}" não encontrada`); continue; }

    const res = await supabaseFetch(`/books?id=eq.${book.id}`, {
      method: "PATCH",
      body: { category_id: catId },
    });

    if (res.status >= 200 && res.status < 300) {
      updated++;
    } else {
      console.error(`  ✗ Erro ${res.status}: ${book.title}`);
      errors++;
    }
    if (i % 10 === 9) await sleep(80);
  }

  console.log(`
✅ Concluído!
   🔄 Recategorizados:  ${updated}
   ✅ Mantidos corretamente em Aconselhamento: ${kept}
   ⚠️  Sem categoria clara (mantidos): ${uncertain}
   ❌ Erros: ${errors}
`);
}

main().catch(e => { console.error("ERRO:", e); process.exit(1); });
