import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { FiscalDashboard } from "@/components/admin/fiscal-dashboard";

export const metadata: Metadata = { title: "Fiscal — Admin Editora Jocum" };
export const revalidate = 60;

export interface FiscalOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_cpf: string | null;
  total: number;
  status: string;
  payment_method: string | null;
  fiscal_status: string;
  created_at: string;
  fiscal_documents: {
    id: string;
    status: string;
    document_type: string | null;
    document_number: string | null;
    document_url: string | null;
    xml_url: string | null;
    issued_at: string | null;
    error_message: string | null;
  }[];
}

export interface FinancialMovement {
  gross_amount: number;
  discount: number;
  shipping: number;
  gateway_fee: number;
  affiliate_commission: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

async function getFiscalOrders(): Promise<FiscalOrder[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_cpf, total, status, payment_method, fiscal_status, created_at, fiscal_documents(id, status, document_type, document_number, document_url, xml_url, issued_at, error_message)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as unknown as FiscalOrder[];
}

async function getMovements(): Promise<FinancialMovement[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("financial_movements")
    .select(
      "gross_amount, discount, shipping, gateway_fee, affiliate_commission, net_amount, status, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as unknown as FinancialMovement[];
}

export default async function AdminFiscalPage() {
  const [orders, movements] = await Promise.all([getFiscalOrders(), getMovements()]);

  const totalNfs = orders.filter((o) =>
    ["emitida", "autorizada"].includes(o.fiscal_status)
  ).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Fiscal"
        subtitle={`${orders.length} pedidos · ${totalNfs} NFs emitidas`}
      />
      <FiscalDashboard orders={orders} movements={movements} />
    </div>
  );
}
