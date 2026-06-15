import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createEnrollmentForOrder } from "@/lib/actions/ead/checkout-actions";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || body.type !== "payment") return NextResponse.json({ ok: true });

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const db = await createAdminClient();

  // Resolve o token MP do tenant via metadata ou via order → course → tenant
  // Estratégia: buscar orderId do external_reference usando um pagamento genérico
  // primeiro com o token da plataforma (se disponível) para obter o external_reference,
  // depois confirmar com o token do tenant.

  // 1. Tenta buscar o payment com o token padrão da plataforma (pode falhar em produção
  //    se o pagamento foi criado com credencial diferente — ok, usamos metadata como fallback)
  let orderId: string | null = null;
  let tenantId: string | null = null;

  // 2. Busca via MP API usando token do tenant
  //    O tenant_id vem no campo metadata.tenant_id que gravamos ao criar o pagamento
  //    OU o buscamos via orders a partir do external_reference no body (se o MP enviar)
  if (body.data?.metadata?.tenant_id) {
    tenantId = body.data.metadata.tenant_id;
  }

  // Busca o token do tenant para verificar o pagamento com MP
  let mpToken: string | null = process.env.MERCADOPAGO_ACCESS_TOKEN ?? null;

  if (tenantId) {
    const { data: settings } = await db
      .from("tenant_settings")
      .select("mp_access_token")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (settings?.mp_access_token) mpToken = settings.mp_access_token;
  }

  // Verifica pagamento com a API do MP
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  });

  if (!res.ok) {
    // Se falhou com o token que temos, tenta descobrir o tenant pelo orderId
    // que pode estar no body como external_reference (alguns eventos MP incluem)
    console.error("[EAD Webhook] MP API error:", res.status);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const payment = await res.json();
  orderId = payment.external_reference ?? null;

  // Descobre tenant via order → order_items → ead_courses se ainda não temos
  if (!tenantId && orderId) {
    const { data: item } = await db
      .from("order_items")
      .select("ead_course_id")
      .eq("order_id", orderId)
      .not("ead_course_id", "is", null)
      .maybeSingle();

    if (item?.ead_course_id) {
      const { data: course } = await db
        .from("ead_courses")
        .select("tenant_id")
        .eq("id", item.ead_course_id)
        .maybeSingle();
      tenantId = course?.tenant_id ?? null;
    }
  }

  if (!orderId) return NextResponse.json({ ok: true });

  if (payment.status === "approved") {
    // Idempotência: verifica se já processamos este pagamento
    const { data: existing } = await db
      .from("orders")
      .select("payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (existing?.payment_status === "aprovado") {
      return NextResponse.json({ ok: true }); // já processado
    }

    await db
      .from("orders")
      .update({ status: "pago", payment_status: "aprovado", notes: `MP:${paymentId}` })
      .eq("id", orderId);

    // Cria matrícula EAD
    await createEnrollmentForOrder(orderId);

  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await db
      .from("orders")
      .update({ payment_status: "recusado", notes: `MP:${paymentId}` })
      .eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
