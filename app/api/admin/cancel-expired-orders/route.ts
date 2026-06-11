import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "aguardando_pagamento")
    .eq("payment_status", "recusado")
    .lt("created_at", cutoff);

  if (error) {
    console.error("[cancel-expired-orders]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  const ids = expired.map((o) => o.id);
  await supabase
    .from("orders")
    .update({ status: "cancelado" })
    .in("id", ids);

  console.log(`[cancel-expired-orders] Cancelados ${ids.length} pedidos`);
  return NextResponse.json({ cancelled: ids.length });
}
