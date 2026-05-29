import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { AdminDashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Admin Editora Jocum",
};

export const revalidate = 60;

type AnyRecord = Record<string, unknown>;

async function getDashboardData() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

  const [
    ordersResult,
    thisMonthOrdersResult,
    lastMonthOrdersResult,
    recentOrdersResult,
    topBooksResult,
    movementsResult,
    reviewsResult,
    leadsResult,
    ticketsResult,
    totalBooksResult,
  ] = await Promise.all([
    // All orders in 3 months
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .gte("created_at", threeMonthsAgo),

    // This month
    supabase
      .from("orders")
      .select("id, status, total")
      .gte("created_at", startOfMonth),

    // Last month
    supabase
      .from("orders")
      .select("id, status, total")
      .gte("created_at", startOfLastMonth)
      .lte("created_at", endOfLastMonth),

    // Recent orders for table
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customer_name")
      .order("created_at", { ascending: false })
      .limit(8),

    // Top books by sales_count
    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, sales_count, authors(name)")
      .eq("is_active", true)
      .order("sales_count", { ascending: false })
      .limit(5),

    // Financial movements for chart (6 months)
    supabase
      .from("financial_movements")
      .select("net_amount, status, created_at")
      .gte("created_at", sixMonthsAgo),

    // Reviews
    supabase
      .from("reviews")
      .select("id, status")
      .gte("created_at", threeMonthsAgo),

    // Leads
    supabase
      .from("leads")
      .select("id, created_at")
      .gte("created_at", startOfMonth),

    // SAC tickets
    supabase
      .from("support_tickets")
      .select("id, status"),

    // Total books
    supabase
      .from("books")
      .select("id", { count: "exact" })
      .eq("is_active", true),
  ]);

  return {
    orders: (ordersResult.data ?? []) as AnyRecord[],
    thisMonthOrders: (thisMonthOrdersResult.data ?? []) as AnyRecord[],
    lastMonthOrders: (lastMonthOrdersResult.data ?? []) as AnyRecord[],
    recentOrders: (recentOrdersResult.data ?? []) as AnyRecord[],
    topBooks: (topBooksResult.data ?? []) as AnyRecord[],
    movements: (movementsResult.data ?? []) as AnyRecord[],
    reviews: (reviewsResult.data ?? []) as AnyRecord[],
    leadsThisMonth: leadsResult.data?.length ?? 0,
    tickets: (ticketsResult.data ?? []) as AnyRecord[],
    totalBooks: totalBooksResult.count ?? 0,
  };
}

export default async function AdminEditoraDashboardPage() {
  const data = await getDashboardData();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Dashboard" subtitle="Visão geral da Editora" />
      <main className="flex-1 overflow-y-auto p-6">
        <AdminDashboard data={data} />
      </main>
    </div>
  );
}
