import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { FinanceiroDashboard } from "@/components/admin/financeiro-dashboard";

export const metadata: Metadata = { title: "Financeiro — Admin Editora Jocum" };
export const revalidate = 60;

interface Movement {
  id: string;
  gross_amount: number;
  discount: number;
  shipping: number;
  gateway_fee: number;
  affiliate_commission: number;
  net_amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

async function getMovements(): Promise<Movement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_movements")
    .select(
      "id, gross_amount, discount, shipping, gateway_fee, affiliate_commission, net_amount, payment_method, status, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []) as unknown as Movement[];
}

export default async function AdminFinanceiroPage() {
  const movements = await getMovements();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Financeiro"
        subtitle={`${movements.length} movimentações`}
      />
      <FinanceiroDashboard movements={movements} />
    </div>
  );
}
