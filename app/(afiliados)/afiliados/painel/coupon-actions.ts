"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function createCouponAction(input: {
  code: string;
  discountPercent: number;
  maxUses: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, status, balance")
    .eq("user_id", user.id)
    .single();

  if (!affiliate || affiliate.status !== "ativo") return { error: "Conta de afiliado inativa." };

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
    return { error: "Código inválido. Use apenas letras, números, _ ou - (3 a 20 caracteres)." };
  }
  if (input.discountPercent < 1 || input.discountPercent > 100) {
    return { error: "Desconto deve ser entre 1% e 100%." };
  }

  // Se desconto > 50%, verificar se afiliado tem saldo
  // (o débito acontece por venda; aqui só alertamos se o saldo está zerado)
  if (input.discountPercent > 50 && affiliate.balance <= 0) {
    return { error: "Saldo insuficiente para criar cupom com desconto acima de 50%." };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("affiliate_coupons")
    .insert({
      affiliate_id: affiliate.id,
      code,
      discount_percent: input.discountPercent,
      max_uses: input.maxUses ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Esse código já está em uso. Escolha outro." };
    return { error: error.message };
  }

  return { error: null, coupon: data };
}

export async function toggleCouponAction(couponId: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = await createAdminClient();

  // verify ownership
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) return { error: "Afiliado não encontrado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("affiliate_coupons")
    .update({ active })
    .eq("id", couponId)
    .eq("affiliate_id", affiliate.id);

  if (error) return { error: error.message };
  return { error: null };
}
