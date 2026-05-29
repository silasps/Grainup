#!/usr/bin/env node
/**
 * Faz upload das capas de livros para o Supabase Storage e atualiza cover_url no banco.
 * Uso: node scripts/upload-covers.js
 * Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COVERS_DIR = path.join(__dirname, "data", "covers");
const BUCKET = "book-covers";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const chunks = [];

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => JSON.parse(body.toString()),
            text: () => body.toString(),
          });
        });
      }
    );

    req.on("error", reject);

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else {
        req.write(options.body);
      }
    }

    req.end();
  });
}

async function supabaseRequest(method, path, body, contentType) {
  const headers = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  };
  if (contentType) headers["Content-Type"] = contentType;

  const options = { method, headers };
  if (body) options.body = body;

  return fetch(`${SUPABASE_URL}${path}`, options);
}

async function createBucketIfNotExists() {
  // Check if bucket exists
  const res = await supabaseRequest("GET", `/storage/v1/bucket/${BUCKET}`, null, null);
  if (res.ok) {
    console.log(`✅ Bucket "${BUCKET}" já existe`);
    return;
  }

  // Create bucket
  const createRes = await supabaseRequest(
    "POST",
    "/storage/v1/bucket",
    JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    "application/json"
  );

  if (!createRes.ok) {
    const err = createRes.text();
    console.error("❌ Erro ao criar bucket:", err);
    process.exit(1);
  }
  console.log(`✅ Bucket "${BUCKET}" criado com sucesso`);
}

async function uploadFile(filePath, objectName) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const res = await supabaseRequest(
    "POST",
    `/storage/v1/object/${BUCKET}/${objectName}`,
    buffer,
    contentType
  );

  if (!res.ok) {
    // Try upsert if already exists
    const upRes = await supabaseRequest(
      "PUT",
      `/storage/v1/object/${BUCKET}/${objectName}`,
      buffer,
      contentType
    );
    return upRes.ok;
  }

  return true;
}

async function updateBookCoverUrl(slug, publicUrl) {
  const res = await supabaseRequest(
    "PATCH",
    `/rest/v1/books?slug=eq.${encodeURIComponent(slug)}`,
    JSON.stringify({ cover_url: publicUrl }),
    "application/json"
  );
  return res.ok;
}

function getPublicUrl(objectName) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectName}`;
}

async function main() {
  console.log("🚀 Iniciando upload de capas...\n");

  await createBucketIfNotExists();

  const files = fs.readdirSync(COVERS_DIR).filter((f) =>
    [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(f).toLowerCase())
  );

  console.log(`📁 ${files.length} arquivos encontrados em ${COVERS_DIR}\n`);

  let uploaded = 0;
  let failed = 0;
  let updated = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(COVERS_DIR, file);
    const ext = path.extname(file);
    const slug = path.basename(file, ext);
    const objectName = `${slug}${ext}`;

    process.stdout.write(`[${i + 1}/${files.length}] Enviando ${file}... `);

    const ok = await uploadFile(filePath, objectName);
    if (ok) {
      uploaded++;
      const publicUrl = getPublicUrl(objectName);
      const dbOk = await updateBookCoverUrl(slug, publicUrl);
      if (dbOk) updated++;
      process.stdout.write("✅\n");
    } else {
      failed++;
      process.stdout.write("❌\n");
    }

    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  console.log(`
✅ Upload concluído!
   📤 Enviados:       ${uploaded}
   🔗 URLs atualizadas: ${updated}
   ❌ Falhas:         ${failed}
`);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});
