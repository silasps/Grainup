"use server";

import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { sendEadEnrollmentEmail } from "@/lib/email/ead";

function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `EAD${ts}${rand}`;
}

function isPublicUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("https://") || (url.startsWith("http://") && !url.includes("localhost"));
}

async function getTenantMpToken(tenantId: string): Promise<string | null> {
  const db = await createAdminClient();
  const { data } = await db
    .from("tenant_settings")
    .select("mp_access_token")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data?.mp_access_token ?? null;
}

// ─── Cria a order EAD (sem endereço, sem frete) ───────────────────────────

export async function createEadOrderAction(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);
  if (!tenant) return { error: "Tenant não encontrado." };

  const db = await createAdminClient();
  const { data: course } = await db
    .from("ead_courses")
    .select("id, title, price, price_promotional, is_free, access_days")
    .eq("id", courseId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!course) return { error: "Curso não encontrado." };
  if (course.is_free) return { error: "Use matricular grátis para cursos gratuitos." };

  // Idempotência: se já existe order aguardando para este user+course, retorna ela
  const { data: existing } = await db
    .from("orders")
    .select("id, order_number")
    .eq("user_id", user.id)
    .eq("status", "aguardando_pagamento")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Verifica se é para o mesmo curso
    const { data: existingItem } = await db
      .from("order_items")
      .select("id")
      .eq("order_id", existing.id)
      .eq("ead_course_id", courseId)
      .maybeSingle();
    if (existingItem) return { error: null, orderId: existing.id, orderNumber: existing.order_number };
  }

  const price = course.price_promotional ?? course.price;
  const orderNumber = generateOrderNumber();

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, cpf, phone")
    .eq("id", user.id)
    .maybeSingle();

  // Cria order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderErr } = await (db.from("orders") as any)
    .insert({
      user_id:          user.id,
      order_number:     orderNumber,
      status:           "aguardando_pagamento",
      payment_status:   "pendente",
      payment_method:   null,
      subtotal:         price,
      discount:         0,
      shipping_cost:    0,
      total:            price,
      customer_name:    profile?.full_name ?? user.email?.split("@")[0] ?? "Aluno",
      customer_email:   user.email ?? "",
      customer_cpf:     profile?.cpf ?? null,
      shipping_address: null,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (orderErr || !order) return { error: orderErr?.message ?? "Erro ao criar pedido." };

  // Cria order_item com ead_course_id (cast necessário — campo EAD não está no tipo base)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemErr } = await (db.from("order_items") as any).insert({
    order_id:      order.id,
    ead_course_id: course.id,
    title:         course.title,
    quantity:      1,
    unit_price:    price,
    total_price:   price,
  }) as { error: { message: string } | null };

  if (itemErr) return { error: itemErr.message };

  return { error: null, orderId: order.id, orderNumber, price, tenantId: tenant.id };
}

// ─── PIX EAD ──────────────────────────────────────────────────────────────

export async function createEadPixPaymentAction(input: {
  orderId:       string;
  orderNumber:   string;
  amount:        number;
  customerEmail: string;
  customerName:  string;
  customerCpf:   string;
  tenantId:      string;
}) {
  const mpToken = await getTenantMpToken(input.tenantId);
  if (!mpToken) return { error: "Credenciais MP do tenant não configuradas." };

  const isTest = mpToken.startsWith("TEST-");

  if (isTest) {
    // Sandbox: retorna PIX mock
    const db = await createAdminClient();
    await db.from("orders").update({ payment_method: "pix", notes: `MP:sandbox-${input.orderId}` }).eq("id", input.orderId);
    return {
      error: null,
      qrCode: `00020126580014BR.GOV.BCB.PIX0136${input.orderId}5204000053039865802BR5925EAD GRAINUP TESTE6009SAO PAULO62070503***6304FAKE`,
      qrCodeBase64: null,
    };
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(client);
    const [firstName, ...rest] = input.customerName.trim().split(" ");

    const result = await paymentClient.create({
      body: {
        transaction_amount: Math.round(input.amount * 100) / 100,
        description:        `Curso EAD - Pedido ${input.orderNumber}`,
        payment_method_id:  "pix",
        payer: {
          email:          input.customerEmail,
          first_name:     firstName,
          last_name:      rest.join(" ") || firstName,
          identification: { type: "CPF", number: input.customerCpf.replace(/\D/g, "") },
        },
        external_reference: input.orderId,
        metadata: { tenant_id: input.tenantId },
        ...(isPublicUrl() && { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/ead/mp-webhook` }),
      },
    });

    const db = await createAdminClient();
    await db.from("orders").update({
      payment_method: "pix",
      notes: `MP:${result.id}`,
    }).eq("id", input.orderId);

    return {
      error: null,
      qrCode:       result.point_of_interaction?.transaction_data?.qr_code ?? null,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    };
  } catch (err) {
    console.error("[EAD PIX]", err);
    return { error: "Erro ao gerar o PIX. Tente novamente." };
  }
}

// ─── Cartão EAD ───────────────────────────────────────────────────────────

export async function createEadCardPaymentAction(input: {
  orderId:         string;
  orderNumber:     string;
  token:           string;
  installments:    number;
  paymentMethodId: string;
  issuerId:        string;
  amount:          number;
  customerEmail:   string;
  customerName:    string;
  customerCpf:     string;
  tenantId:        string;
}) {
  const mpToken = await getTenantMpToken(input.tenantId);
  if (!mpToken) return { error: "Credenciais MP do tenant não configuradas.", status: "error" as const };

  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(client);
    const [firstName, ...rest] = input.customerName.trim().split(" ");

    const result = await paymentClient.create({
      body: {
        transaction_amount: Math.round(input.amount * 100) / 100,
        token:              input.token,
        installments:       input.installments,
        payment_method_id:  input.paymentMethodId,
        issuer_id:          Number(input.issuerId) || undefined,
        description:        `Curso EAD - Pedido ${input.orderNumber}`,
        payer: {
          email:          input.customerEmail,
          first_name:     firstName,
          last_name:      rest.join(" ") || firstName,
          identification: { type: "CPF", number: input.customerCpf.replace(/\D/g, "") },
        },
        external_reference: input.orderId,
        metadata: { tenant_id: input.tenantId },
        ...(isPublicUrl() && { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/ead/mp-webhook` }),
      },
    });

    const db = await createAdminClient();

    if (result.status === "approved") {
      await db.from("orders")
        .update({ status: "pago", payment_status: "aprovado", payment_method: "credito", notes: `MP:${result.id}` })
        .eq("id", input.orderId);

      // Criar matrícula imediatamente (cartão aprovado na hora)
      await createEnrollmentForOrder(input.orderId);
      return { error: null, status: "approved" as const };
    }

    if (result.status === "in_process" || result.status === "pending") {
      await db.from("orders")
        .update({ payment_method: "credito", notes: `MP:${result.id}` })
        .eq("id", input.orderId);
      return { error: null, status: "pending" as const };
    }

    return { error: result.status_detail ?? "Pagamento recusado.", status: result.status as string };
  } catch (err) {
    console.error("[EAD Card]", err);
    return { error: "Erro ao processar pagamento. Tente novamente.", status: "error" as const };
  }
}

// ─── Matrícula gratuita ───────────────────────────────────────────────────

export async function enrollFreeAction(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);
  if (!tenant) return { error: "Tenant não encontrado." };

  const db = await createAdminClient();
  const { data: course } = await db
    .from("ead_courses")
    .select("id, slug, title, is_free, access_days")
    .eq("id", courseId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!course) return { error: "Curso não encontrado." };
  if (!course.is_free) return { error: "Este curso não é gratuito." };

  const expiresAt = course.access_days > 0
    ? new Date(Date.now() + course.access_days * 86_400_000).toISOString()
    : new Date(Date.now() + 3650 * 86_400_000).toISOString(); // 10 anos = vitalício

  const { error } = await db
    .from("ead_enrollments")
    .upsert(
      {
        user_id:      user.id,
        course_id:    courseId,
        order_id:     null,
        status:       "ativa",
        expires_at:   expiresAt,
        completed_at: null,
        cancelled_at: null,
        notes:        "Matrícula gratuita",
      },
      { onConflict: "user_id,course_id" }
    );

  if (error) return { error: error.message };

  // E-mail de confirmação (fire-and-forget)
  const studentEmailRes = await db.auth.admin.getUserById(user.id);
  const studentEmail = studentEmailRes.data?.user?.email;
  const { data: profile } = await db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const settings = await getTenantSettings(tenant.id);
  if (studentEmail) {
    sendEadEnrollmentEmail({
      to:           studentEmail,
      studentName:  profile?.full_name ?? "Aluno",
      tenantName:   tenant.name,
      primaryColor: settings?.primary_color ?? "#1B4332",
      courseTitle:  course.title ?? courseId,
      courseUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/ead/cursos/${course.slug}`,
      expiresAt:    expiresAt,
    }).catch((err) => console.error("[EAD Email] enrollFree:", err));
  }

  return { error: null, slug: course.slug };
}

// ─── Polling de status ────────────────────────────────────────────────────

export async function checkEadPaymentStatusAction(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: null };

  const db = await createAdminClient();
  const { data } = await db
    .from("orders")
    .select("payment_status, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { status: data?.payment_status ?? null, orderStatus: data?.status ?? null };
}

// ─── Criação de matrícula após pagamento aprovado ─────────────────────────
// Chamado pelo webhook EAD e pelo card flow (aprovado instantaneamente).

export async function createEnrollmentForOrder(orderId: string) {
  const db = await createAdminClient();

  const { data: item } = await db
    .from("order_items")
    .select("ead_course_id, order_id")
    .eq("order_id", orderId)
    .not("ead_course_id", "is", null)
    .maybeSingle();

  if (!item?.ead_course_id) return;

  const { data: order } = await db
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.user_id) return;

  const { data: course } = await db
    .from("ead_courses")
    .select("title, slug, access_days, tenant_id")
    .eq("id", item.ead_course_id)
    .maybeSingle();

  const accessDays = course?.access_days ?? 180;
  const expiresAt = accessDays > 0
    ? new Date(Date.now() + accessDays * 86_400_000).toISOString()
    : new Date(Date.now() + 3650 * 86_400_000).toISOString();

  await db
    .from("ead_enrollments")
    .upsert(
      {
        user_id:      order.user_id,
        course_id:    item.ead_course_id,
        order_id:     orderId,
        status:       "ativa",
        expires_at:   expiresAt,
        completed_at: null,
        cancelled_at: null,
        notes:        null,
      },
      { onConflict: "user_id,course_id" }
    );

  // E-mail de confirmação de matrícula (fire-and-forget)
  if (course?.tenant_id) {
    const [userRes, tenantRes, settingsRes, profileRes] = await Promise.all([
      db.auth.admin.getUserById(order.user_id),
      db.from("tenants").select("name").eq("id", course.tenant_id).maybeSingle(),
      db.from("tenant_settings").select("primary_color").eq("tenant_id", course.tenant_id).maybeSingle(),
      db.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle(),
    ]);

    const studentEmail = userRes.data?.user?.email;
    if (studentEmail) {
      sendEadEnrollmentEmail({
        to:           studentEmail,
        studentName:  profileRes.data?.full_name ?? "Aluno",
        tenantName:   tenantRes.data?.name ?? "GrainUp EAD",
        primaryColor: settingsRes.data?.primary_color ?? "#1B4332",
        courseTitle:  course.title ?? "Curso",
        courseUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/ead/cursos/${course.slug}`,
        expiresAt,
      }).catch((err) => console.error("[EAD Email] createEnrollmentForOrder:", err));
    }
  }
}
