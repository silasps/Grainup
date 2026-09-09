import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.BLING_CLIENT_ID;
  const redirectUri = process.env.BLING_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "BLING_CLIENT_ID / BLING_REDIRECT_URI não configurados." }, { status: 500 });
  }
  // api.bling.com.br é o domínio oficial atual — ver lib/bling/client.ts.
  const url = `https://api.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=grainup`;
  return NextResponse.redirect(url);
}
