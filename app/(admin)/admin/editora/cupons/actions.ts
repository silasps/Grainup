"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["super_admin", "admin_editora"])
    .maybeSingle();
  return data ? user : null;
}

export async function createPromoCouponAction(input: {
  code: string;
  label: string;
  discountType: "percent" | "fixed";
  discountPercent: number;
  discountFixed: number | null;
  maxUses: number | null;
  expiresAt: string | null;
}) {
  if (!await assertAdmin()) return { error: "Sem permissão." };

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code))
    return { error: "Código inválido. Use letras, números, _ ou - (3–20 caracteres)." };

  if (input.discountType === "percent") {
    if (input.discountPercent < 1 || input.discountPercent > 100)
      return { error: "Desconto percentual deve ser entre 1% e 100%." };
  } else {
    if (!input.discountFixed || input.discountFixed <= 0)
      return { error: "Informe um valor de desconto válido." };
  }

  const admin = await createAdminClient();

  // Verifica unicidade global (affiliate_coupons + promo_coupons)
  const [{ count: affCount }, { count: promoCount }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("affiliate_coupons").select("id", { count: "exact", head: true }).eq("code", code),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("promo_coupons").select("id", { count: "exact", head: true }).eq("code", code),
  ]);
  if ((affCount ?? 0) > 0 || (promoCount ?? 0) > 0)
    return { error: "Esse código já está em uso. Escolha outro." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("promo_coupons")
    .insert({
      code,
      label: input.label.trim() || null,
      discount_type: input.discountType,
      discount_percent: input.discountType === "percent" ? input.discountPercent : 0,
      discount_fixed: input.discountType === "fixed" ? input.discountFixed : null,
      max_uses: input.maxUses ?? null,
      expires_at: input.expiresAt || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/editora/cupons");
  return { error: null, coupon: data };
}

export async function togglePromoCouponAction(id: string, active: boolean) {
  if (!await assertAdmin()) return { error: "Sem permissão." };
  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("promo_coupons").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/cupons");
  return { error: null };
}

export async function deletePromoCouponAction(id: string) {
  if (!await assertAdmin()) return { error: "Sem permissão." };
  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("promo_coupons").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/cupons");
  return { error: null };
}
