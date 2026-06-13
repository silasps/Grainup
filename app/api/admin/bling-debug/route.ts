import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/bling/auth";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "pedidos/vendas";
  const email = req.nextUrl.searchParams.get("email");

  try {
    const token = await getAccessToken();

    if (email) {
      // Busca contato por email para ver estrutura completa
      const res = await fetch(`https://www.bling.com.br/Api/v3/contatos?email=${encodeURIComponent(email)}&situacao=A`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const list = await res.json() as { data?: Array<{ id: number }> };
      const contatoId = list.data?.[0]?.id;
      if (!contatoId) return NextResponse.json({ error: "contato não encontrado", list });

      const detail = await fetch(`https://www.bling.com.br/Api/v3/contatos/${contatoId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const body = await detail.json();
      return NextResponse.json({ contatoId, status: detail.status, body });
    }

    if (!id) return NextResponse.json({ error: "?id= ou ?email= obrigatório" }, { status: 400 });

    const res = await fetch(`https://www.bling.com.br/Api/v3/${tipo}/${id}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const body = await res.json();
    return NextResponse.json({ status: res.status, body });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
