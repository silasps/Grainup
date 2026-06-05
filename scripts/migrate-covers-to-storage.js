#!/usr/bin/env node
/**
 * Baixa capas de livros que apontam para editorajocum.com.br,
 * faz upload para o bucket book-covers no Supabase Storage
 * e atualiza o cover_url no banco.
 *
 * Uso: node scripts/migrate-covers-to-storage.js
 */

try {
  require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
} catch {}

const https = require("https");
const http = require("http");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "book-covers";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function httpGet(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error("too many redirects"));
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GrainUp/1.0)" },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
          res.resume();
          return httpGet(next, redirectCount + 1).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            contentType: res.headers["content-type"] || "",
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on("error", reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function supabaseRequest(method, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(SUPABASE_URL + path);
    const headers = {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "return=representation",
    };
    if (contentType) headers["Content-Type"] = contentType;

    const bodyBuf = body
      ? Buffer.isBuffer(body)
        ? body
        : Buffer.from(typeof body === "string" ? body : JSON.stringify(body))
      : null;
    if (bodyBuf) headers["Content-Length"] = bodyBuf.length;

    const req = https.request(
      { hostname: parsed.hostname, port: 443, path: parsed.pathname + parsed.search, method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Buffer.concat(chunks).toString(),
            json: () => JSON.parse(Buffer.concat(chunks).toString()),
          })
        );
      }
    );
    req.on("error", reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function getPublicUrl(objectName) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectName}`;
}

function extFromContentType(ct) {
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  return ".jpg";
}

async function fetchBooks() {
  const res = await supabaseRequest(
    "GET",
    `/rest/v1/books?cover_url=ilike.*editorajocum.com.br*&select=id,slug,cover_url&order=title.asc`,
    null,
    null
  );
  if (!res.ok) throw new Error("Erro ao buscar livros: " + res.text());
  return res.json();
}

async function uploadToStorage(objectName, buffer, contentType) {
  let res = await supabaseRequest(
    "POST",
    `/storage/v1/object/${BUCKET}/${encodeURIComponent(objectName)}`,
    buffer,
    contentType
  );
  if (!res.ok) {
    res = await supabaseRequest(
      "PUT",
      `/storage/v1/object/${BUCKET}/${encodeURIComponent(objectName)}`,
      buffer,
      contentType
    );
  }
  return res.ok;
}

async function updateCoverUrl(id, publicUrl) {
  const res = await supabaseRequest(
    "PATCH",
    `/rest/v1/books?id=eq.${encodeURIComponent(id)}`,
    JSON.stringify({ cover_url: publicUrl }),
    "application/json"
  );
  return res.ok;
}

async function main() {
  console.log("🔍 Buscando livros com capas no editorajocum.com.br...\n");
  const books = await fetchBooks();
  console.log(`📚 ${books.length} livros encontrados\n`);

  if (books.length === 0) {
    console.log("✅ Nada a migrar.");
    return;
  }

  let migrated = 0, failed = 0;

  for (let i = 0; i < books.length; i++) {
    const { id, slug, cover_url } = books[i];
    process.stdout.write(`[${i + 1}/${books.length}] ${slug}... `);

    try {
      const imgRes = await httpGet(cover_url);
      if (!imgRes.ok) {
        process.stdout.write(`❌ HTTP ${imgRes.status}\n`);
        failed++;
        continue;
      }

      const originalFilename = cover_url.split("/").pop().split("?")[0];
      const dotIndex = originalFilename.lastIndexOf(".");
      const ext = dotIndex !== -1
        ? originalFilename.slice(dotIndex)
        : extFromContentType(imgRes.contentType);
      const objectName = `${slug}${ext}`;
      const ct = imgRes.contentType.split(";")[0].trim() || "image/jpeg";

      const uploaded = await uploadToStorage(objectName, imgRes.body, ct);
      if (!uploaded) {
        process.stdout.write("❌ falha no upload\n");
        failed++;
        continue;
      }

      const publicUrl = getPublicUrl(objectName);
      const updated = await updateCoverUrl(id, publicUrl);
      if (!updated) {
        process.stdout.write("⚠️  upload ok, falha ao atualizar BD\n");
        failed++;
        continue;
      }

      process.stdout.write(`✅ → ${objectName}\n`);
      migrated++;
    } catch (err) {
      process.stdout.write(`❌ ${err.message}\n`);
      failed++;
    }

    if (i < books.length - 1) await new Promise((r) => setTimeout(r, 80));
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Migrados:  ${migrated}
  ❌ Falhas:    ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});
