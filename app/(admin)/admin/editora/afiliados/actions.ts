"use server";

import { createAdminClient } from "@/lib/supabase/server";

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

interface CreateAffiliateInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  type: "jocum" | "diretor";
  commission_rate: number;
  serving_location?: string | null;
  leader_name?: string | null;
  leader_email?: string | null;
  requires_review: boolean;
}

export async function createAffiliateAction(input: CreateAffiliateInput) {
  const supabase = await createAdminClient();
  const now = new Date();

  // Try to find an existing Supabase user by email to link the account
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
    commission_rate: input.commission_rate,
    serving_location: input.serving_location || null,
    leader_name: input.leader_name || null,
    leader_email: input.leader_email || null,
    leader_phone: null,
    last_confirmed_at: now.toISOString(),
    requires_review: input.requires_review,
    next_review_at: input.requires_review ? addMonths(now, 6).toISOString() : null,
  };

  const { data: affiliate, error } = await supabase
    .from("affiliates")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Create default general link for this affiliate
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from("affiliate_links").insert({ affiliate_id: affiliate.id, book_id: null, code });

  return affiliate;
}

export async function approveAndCreateLinkAction(affiliateId: string) {
  const supabase = await createAdminClient();

  // Only create if no links exist yet
  const { data: existing } = await supabase
    .from("affiliate_links")
    .select("id")
    .eq("affiliate_id", affiliateId)
    .limit(1);

  if (!existing?.length) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from("affiliate_links").insert({ affiliate_id: affiliateId, book_id: null, code });
  }
}
