import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { OfertasTable } from "./ofertas-table";

export const metadata: Metadata = { title: "Ofertas — Admin Editora Jocum" };
export const revalidate = 60;

export default async function AdminOfertasPage() {
  const supabase = await createAdminClient();

  const [{ data: offers }, { data: books }, { data: categories }] = await Promise.all([
    supabase
      .from("offers")
      .select("id, name, type, discount_type, discount_value, min_order_value, starts_at, ends_at, is_active, created_at, book_id, combo_id, category_id")
      .order("created_at", { ascending: false }),
    supabase.from("books").select("id, title").eq("is_active", true).order("title"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Ofertas"
        subtitle={`${(offers ?? []).length} oferta${(offers ?? []).length !== 1 ? "s" : ""} cadastrada${(offers ?? []).length !== 1 ? "s" : ""}`}
      />
      <OfertasTable
        offers={(offers ?? []) as Parameters<typeof OfertasTable>[0]["offers"]}
        books={books ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
