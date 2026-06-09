import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { AffiliatosTable } from "./affiliates-table";

export const metadata: Metadata = { title: "Afiliados — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

export default async function AdminAfiliadosPage() {
  const supabase = await createAdminClient();

  const [affiliatesRes, salesRes, withdrawalsRes] = await Promise.all([
    supabase
      .from("affiliates")
      .select("id, user_id, type, name, email, cpf, phone, status, commission_rate, balance, balance_pending, total_confirmed_sales, leader_name, leader_email, leader_phone, serving_location, last_confirmed_at, requires_review, next_review_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_sales")
      .select("affiliate_id, commission_amount, status"),
    supabase
      .from("affiliate_withdrawals")
      .select("id, affiliate_id, amount, status, pix_key, pix_key_type, notes, requested_at, paid_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const affiliates = (affiliatesRes.data ?? []) as unknown as import("./affiliates-table").Affiliate[];
  const sales = (salesRes.data ?? []) as { affiliate_id: string; commission_amount: number; status: string }[];
  const withdrawals = (withdrawalsRes.data ?? []) as unknown as import("./affiliates-table").Withdrawal[];

  const salesByAffiliate = sales.reduce<Record<string, { total: number; confirmed: number }>>((acc, s) => {
    if (!acc[s.affiliate_id]) acc[s.affiliate_id] = { total: 0, confirmed: 0 };
    acc[s.affiliate_id].total++;
    if (s.status === "confirmada" || s.status === "paga") acc[s.affiliate_id].confirmed += s.commission_amount;
    return acc;
  }, {});

  const stats = {
    total: affiliates.length,
    ativos: affiliates.filter((a) => a.status === "ativo").length,
    pendentes: affiliates.filter((a) => a.status === "pendente").length,
    suspensos: affiliates.filter((a) => a.status === "suspenso").length,
    balancePending: affiliates.reduce((s, a) => s + (a.balance ?? 0), 0),
    withdrawalsPending: withdrawals.filter((w) => w.status === "pendente").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Afiliados"
        subtitle={`${stats.total} afiliados${stats.pendentes > 0 ? ` · ${stats.pendentes} pendentes` : ""}${stats.withdrawalsPending > 0 ? ` · ${stats.withdrawalsPending} saques aguardando` : ""}`}
      />
      <AffiliatosTable
        affiliates={affiliates}
        salesByAffiliate={salesByAffiliate}
        withdrawals={withdrawals}
        stats={stats}
      />
    </div>
  );
}
