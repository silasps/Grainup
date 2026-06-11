import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getBlingNfeByOrder } from "@/lib/bling";

export const runtime = "nodejs";
export const maxDuration = 60;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const results = { nf: 0, skus: 0, errors: [] as string[] };

  // ── 1. Sync NF para pedidos pagos sem invoice_number ──────────────────────
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id, bling_order_id")
    .eq("status", "pago")
    .is("invoice_number", null)
    .not("bling_order_id", "is", null)
    .limit(50) as { data: Array<{ id: string; bling_order_id: number }> | null };

  for (const order of pendingOrders ?? []) {
    try {
      const nfe = await getBlingNfeByOrder(order.bling_order_id);
      if (nfe?.chaveAcesso) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("orders").update({
          invoice_number: nfe.chaveAcesso,
          ...(nfe.linkDanfe ? { invoice_url: nfe.linkDanfe } : {}),
        }).eq("id", order.id);
        results.nf++;
      }
    } catch (e) {
      results.errors.push(`NF order ${order.id}: ${e}`);
    }
  }

  // ── 2. Sync SKUs: Bling produtos → books.sku ──────────────────────────────
  const apiKey = process.env.BLING_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://www.bling.com.br/Api/v3/produtos?limite=100&pagina=1", {
        headers: { "Content-Type": "application/json", apikey: apiKey },
      });
      if (res.ok) {
        const json = await res.json() as { data?: Array<{ id: number; codigo: string; nome: string }> };
        const blingProducts = json.data ?? [];

        const { data: books } = await supabase
          .from("books")
          .select("id, title, sku");

        for (const book of books ?? []) {
          const bookNorm = normalize(book.title ?? "");
          const match = blingProducts.find((p) => normalize(p.nome) === bookNorm);
          if (match && match.codigo && match.codigo !== book.sku) {
            await supabase.from("books").update({ sku: match.codigo }).eq("id", book.id);
            results.skus++;
          }
        }
      }
    } catch (e) {
      results.errors.push(`SKU sync: ${e}`);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
