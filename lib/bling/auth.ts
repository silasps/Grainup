import { createAdminClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";

function basicAuth() {
  const id = process.env.BLING_CLIENT_ID;
  const secret = process.env.BLING_CLIENT_SECRET;
  if (!id || !secret) throw new Error("BLING_CLIENT_ID / BLING_CLIENT_SECRET não configurados.");
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

async function saveTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("bling_tokens").upsert({
    id: 1,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function doRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!res.ok) throw new Error(`Falha ao renovar token Bling: ${await res.text()}`);
  const json = await res.json();
  await saveTokens(json.access_token, json.refresh_token, json.expires_in);
  return json.access_token;
}

export async function getAccessToken(): Promise<string> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from("bling_tokens").select("*").eq("id", 1).single();
  if (!data) throw new Error("Bling não autorizado. Acesse /admin/config para conectar.");
  if (new Date(data.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      return await doRefresh(data.refresh_token);
    } catch (err) {
      // O Bling invalida o refresh_token antigo assim que ele é usado uma vez. Se outra
      // chamada concorrente (webhook, cron, outra requisição) já renovou nesse meio-tempo,
      // essa aqui falha com "Invalid refresh token" mesmo a conexão estando saudável —
      // reconfere o banco antes de propagar o erro como se a conexão tivesse realmente morrido.
      await new Promise((resolve) => setTimeout(resolve, 800));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: retry } = await (supabase as any).from("bling_tokens").select("*").eq("id", 1).single();
      if (retry && new Date(retry.expires_at).getTime() - Date.now() >= 5 * 60 * 1000) {
        return retry.access_token;
      }
      throw err;
    }
  }
  return data.access_token;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const redirectUri = process.env.BLING_REDIRECT_URI;
  if (!redirectUri) throw new Error("BLING_REDIRECT_URI não configurada.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });
  if (!res.ok) throw new Error(`Erro ao trocar código Bling: ${await res.text()}`);
  const json = await res.json();
  await saveTokens(json.access_token, json.refresh_token, json.expires_in);
}
