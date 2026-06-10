"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendAffiliateApprovedEmail, sendWithdrawalStatusEmail } from "@/lib/email";

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

export type AffiliateType = "geral" | "jocum" | "diretor";

interface CreateAffiliateInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  type: AffiliateType;
  commission_rate: number;
  serving_location?: string | null;
  leader_name?: string | null;
  leader_email?: string | null;
  requires_review: boolean;
}

/** Busca usuário existente pelo e-mail para pré-preencher o formulário */
export async function lookupUserByEmailAction(email: string) {
  const supabase = await createAdminClient();
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return { user: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("full_name, cpf, phone")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { full_name?: string; cpf?: string; phone?: string } | null };

  // Verifica se já é afiliado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAffiliate } = await (supabase as any)
    .from("affiliates").select("id").eq("user_id", user.id).maybeSingle();

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? "",
      cpf: profile?.cpf ?? "",
      phone: profile?.phone ?? "",
      alreadyAffiliate: !!existingAffiliate,
    },
  };
}

export async function createAffiliateWithAccountAction(input: CreateAffiliateInput & { password: string }) {
  const supabase = await createAdminClient();
  const now = new Date();

  // Cria ou busca usuário no auth
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = users.find((u) => u.email === input.email);
  let userId: string;
  let accountCreated = false;

  if (!existing) {
    const { data: au, error: ae } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.name },
    });
    if (ae || !au.user) throw new Error(ae?.message ?? "Erro ao criar conta");
    userId = au.user.id;
    accountCreated = true;
  } else {
    userId = existing.id;
  }

  const role = input.type === "jocum" ? "afiliado_jocum"
             : input.type === "diretor" ? "afiliado_diretor"
             : "afiliado_geral";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role" }
  );

  const payload = {
    user_id: userId,
    type: input.type,
    name: input.name,
    email: input.email,
    cpf: input.cpf.replace(/\D/g, ""),
    phone: input.phone.replace(/\D/g, ""),
    status: "ativo" as const,
    commission_rate: input.type === "geral" ? 30 : input.commission_rate,
    serving_location: input.serving_location || null,
    leader_name: input.leader_name || null,
    leader_email: input.leader_email || null,
    leader_phone: null,
    last_confirmed_at: now.toISOString(),
    requires_review: input.requires_review,
    next_review_at: input.requires_review ? addMonths(now, 6).toISOString() : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: affiliate, error } = await (supabase as any)
    .from("affiliates").insert(payload).select().single();
  if (error) throw new Error(error.message);

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from("affiliate_links").insert({ affiliate_id: affiliate.id, book_id: null, code });

  return { affiliate, code, accountCreated };
}

export async function createAffiliateAction(input: CreateAffiliateInput) {
  const supabase = await createAdminClient();
  const now = new Date();

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = users.find((u) => u.email === input.email);

  const payload = {
    user_id: existingUser?.id ?? crypto.randomUUID(),
    type: input.type,
    name: input.name,
    email: input.email,
    cpf: input.cpf.replace(/\D/g, ""),
    phone: input.phone.replace(/\D/g, ""),
    status: "ativo" as const,
    commission_rate: input.type === "geral" ? 30 : input.commission_rate,
    serving_location: input.serving_location || null,
    leader_name: input.leader_name || null,
    leader_email: input.leader_email || null,
    leader_phone: null,
    last_confirmed_at: now.toISOString(),
    requires_review: input.requires_review,
    next_review_at: input.requires_review ? addMonths(now, 6).toISOString() : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: affiliate, error } = await (supabase as any)
    .from("affiliates")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from("affiliate_links").insert({ affiliate_id: affiliate.id, book_id: null, code });

  if (existingUser) {
    const role = input.type === "jocum" ? "afiliado_jocum"
               : input.type === "diretor" ? "afiliado_diretor"
               : "afiliado_geral";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_roles").upsert(
      { user_id: existingUser.id, role },
      { onConflict: "user_id,role" }
    );
  }

  return affiliate;
}

export async function approveAndCreateLinkAction(affiliateId: string) {
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("affiliate_links")
    .select("id")
    .eq("affiliate_id", affiliateId)
    .limit(1);

  if (!existing?.length) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from("affiliate_links").insert({ affiliate_id: affiliateId, book_id: null, code });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("user_id, type")
    .eq("id", affiliateId)
    .single();

  if (affiliate?.user_id) {
    const role = (affiliate as unknown as { type: string }).type === "jocum" ? "afiliado_jocum"
               : (affiliate as unknown as { type: string }).type === "diretor" ? "afiliado_diretor"
               : "afiliado_geral";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_roles").upsert(
      { user_id: affiliate.user_id, role },
      { onConflict: "user_id,role" }
    );

    // Email de aprovação
    const { data: aff } = await supabase.from("affiliates").select("email, name").eq("id", affiliateId).single();
    const { data: link } = await supabase.from("affiliate_links").select("code").eq("affiliate_id", affiliateId).limit(1).single();
    if (aff?.email && link?.code) {
      const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";
      sendAffiliateApprovedEmail(aff.email, aff.name, `${SITE}/r/${link.code}`).catch(console.error);
    }
  }
}

export async function updateWithdrawalStatusAction(
  withdrawalId: string,
  status: "processando" | "pago" | "recusado",
  notes?: string,
) {
  const supabase = await createAdminClient();

  // Busca o saque para saber o valor e o afiliado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wd } = await (supabase as any)
    .from("affiliate_withdrawals")
    .select("affiliate_id, amount, status")
    .eq("id", withdrawalId)
    .single() as { data: { affiliate_id: string; amount: number; status: string } | null };

  if (!wd) throw new Error("Saque não encontrado");

  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("affiliate_withdrawals")
    .update({
      status,
      notes: notes ?? null,
      processed_at: status === "pago" ? now : null,
      paid_at: status === "pago" ? now : null,
    })
    .eq("id", withdrawalId);

  // Se pago: debita o saldo do afiliado e confirma as comissões
  if (status === "pago") {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("balance")
      .eq("id", wd.affiliate_id)
      .single();
    if (aff) {
      await supabase
        .from("affiliates")
        .update({ balance: Math.max(0, aff.balance - wd.amount) })
        .eq("id", wd.affiliate_id);
    }
    // Marca as vendas pendentes como pagas
    await supabase
      .from("affiliate_sales")
      .update({ status: "paga" })
      .eq("affiliate_id", wd.affiliate_id)
      .eq("status", "confirmada");
  }

  // Email ao afiliado
  if (status === "pago" || status === "recusado") {
    const { data: aff } = await supabase.from("affiliates").select("email, name").eq("id", wd.affiliate_id).single();
    if (aff?.email) {
      sendWithdrawalStatusEmail(aff.email, aff.name, status, wd.amount, notes).catch(console.error);
    }
  }

  // Se recusado: devolve o valor ao saldo
  if (status === "recusado" && wd.status === "pendente") {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("balance")
      .eq("id", wd.affiliate_id)
      .single();
    if (aff) {
      await supabase
        .from("affiliates")
        .update({ balance: aff.balance + wd.amount })
        .eq("id", wd.affiliate_id);
    }
  }
}

export async function deleteAffiliateAction(affiliateId: string) {
  const supabase = await createAdminClient();
  // Remove link, vendas e o registro do afiliado (cascade deve cobrir o resto)
  await supabase.from("affiliate_links").delete().eq("affiliate_id", affiliateId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("affiliate_coupons").delete().eq("affiliate_id", affiliateId);
  const { error } = await supabase.from("affiliates").delete().eq("id", affiliateId);
  if (error) throw new Error(error.message);
}
