import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { CuponsTable } from "./cupons-table";

export const metadata: Metadata = { title: "Cupons — Admin Editora Jocum" };
export const revalidate = 0;

export default async function AdminCuponsPage() {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coupons } = await (supabase as any)
    .from("promo_coupons")
    .select("id, code, label, discount_type, discount_percent, discount_fixed, max_uses, uses_count, active, expires_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Cupons promocionais"
        subtitle="Cupons avulsos para campanhas e presentes — sem vínculo com afiliados"
      />
      <CuponsTable initialCoupons={coupons ?? []} />
    </div>
  );
}
