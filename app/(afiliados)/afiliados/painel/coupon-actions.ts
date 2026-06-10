"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

function getAffiliateMargin(type: string, sales: number): number {
  if (type !== "geral") return 50;
  if (sales >= 100) return 50;
  if (sales >= 50)  return 40;
  if (sales >= 25)  return 30;
  if (sales >= 10)  return 20;
  return 10;
}

export async function createCouponAction(input: {
  code: string;
  discountType: "percent" | "fixed";
  discountPercent: number;
  discountFixed: number | null;
  maxUses: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "SESSION_EXPIRED" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: affiliate } = await (supabase as any)
    .from("affiliates")
    .select("id, status, balance, type, total_confirmed_sales")
    .eq("user_id", user.id)
    .single() as { data: { id: string; status: string; balance: number; type: string; total_confirmed_sales: number } | null };

  if (!affiliate || affiliate.status !== "ativo") return { error: "Conta de afiliado inativa." };

  const margin = getAffiliateMargin(affiliate.type, affiliate.total_confirmed_sales ?? 0);

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
    return { error: "Código inválido. Use apenas letras, números, _ ou - (3 a 20 caracteres)." };
  }

  if (input.discountType === "percent") {
    if (input.discountPercent < 1 || input.discountPercent > 100)
      return { error: "Desconto deve ser entre 1% e 100%." };
    if (input.discountPercent > margin && affiliate.balance <= 0)
      return { error: `Saldo insuficiente para criar cupom com desconto acima de ${margin}% (sua margem atual).` };
  } else {
    if (!input.discountFixed || input.discountFixed <= 0)
      return { error: "Informe um valor de desconto válido." };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("affiliate_coupons")
    .insert({
      affiliate_id: affiliate.id,
      code,
      discount_type: input.discountType,
      discount_percent: input.discountType === "percent" ? input.discountPercent : 0,
      discount_fixed: input.discountType === "fixed" ? input.discountFixed : null,
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
  if (!user) return { error: "SESSION_EXPIRED" };

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

export async function deleteCouponAction(couponId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "SESSION_EXPIRED" };

  const { data: affiliate } = await supabase.from("affiliates").select("id").eq("user_id", user.id).single();
  if (!affiliate) return { error: "Afiliado não encontrado." };

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("affiliate_coupons")
    .delete()
    .eq("id", couponId)
    .eq("affiliate_id", affiliate.id);

  if (error) return { error: error.message };
  return { error: null };
}
