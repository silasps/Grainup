import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { AffiliatosTable } from "./affiliates-table";

export const metadata: Metadata = { title: "Afiliados — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

interface Affiliate {
  id: string;
  user_id: string;
  type: "jocum" | "diretor";
  name: string;
  email: string;
  cpf: string;
  phone: string;
  status: "pendente" | "ativo" | "suspenso" | "rejeitado";
  commission_rate: number;
  balance: number;
  balance_pending: number;
  leader_name: string | null;
  leader_email: string | null;
  serving_location: string | null;
  last_confirmed_at: string | null;
  requires_review?: boolean;
  next_review_at?: string | null;
  created_at: string;
}

async function getData() {
  const supabase = await createAdminClient();
  const [affiliatesRes, salesRes] = await Promise.all([
    supabase
      .from("affiliates")
      .select("id, user_id, type, name, email, cpf, phone, status, commission_rate, balance, balance_pending, leader_name, leader_email, serving_location, last_confirmed_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_sales")
      .select("affiliate_id, commission_amount, status"),
  ]);

  const affiliates = (affiliatesRes.data ?? []) as unknown as Affiliate[];
  const sales = (salesRes.data ?? []) as { affiliate_id: string; commission_amount: number; status: string }[];

  const salesByAffiliate = sales.reduce<Record<string, { total: number; confirmed: number }>>((acc, s) => {
    if (!acc[s.affiliate_id]) acc[s.affiliate_id] = { total: 0, confirmed: 0 };
    acc[s.affiliate_id].total++;
    if (s.status === "confirmada" || s.status === "paga") {
      acc[s.affiliate_id].confirmed += s.commission_amount;
    }
    return acc;
  }, {});

  return { affiliates, salesByAffiliate };
}

export default async function AdminAfiliadosPage() {
  const { affiliates, salesByAffiliate } = await getData();

  const stats = {
    total: affiliates.length,
    ativos: affiliates.filter((a) => a.status === "ativo").length,
    pendentes: affiliates.filter((a) => a.status === "pendente").length,
    suspensos: affiliates.filter((a) => a.status === "suspenso").length,
    balancePending: affiliates.reduce((s, a) => s + a.balance_pending, 0),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Afiliados"
        subtitle={`${stats.total} afiliados${stats.pendentes > 0 ? ` · ${stats.pendentes} pendentes` : ""}`}
      />
      <AffiliatosTable
        affiliates={affiliates}
        salesByAffiliate={salesByAffiliate}
        stats={stats}
      />
    </div>
  );
}
