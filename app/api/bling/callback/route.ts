import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/bling/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código não encontrado." }, { status: 400 });
  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/admin/editora/configuracoes?bling=ok", req.nextUrl.origin));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
