import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { OfertasTable } from "./ofertas-table";

export const metadata: Metadata = { title: "Ofertas — Admin Editora Jocum" };
export const revalidate = 0;

export default async function AdminOfertasPage() {
  const supabase = await createAdminClient();
  const { data: books } = await supabase
    .from("books")
    .select("id, title, cover_url, price, price_promotional")
    .eq("is_active", true)
    .order("title");

  const active = (books ?? []).filter((b) => b.price_promotional).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Ofertas especiais"
        subtitle={`${active} livro${active !== 1 ? "s" : ""} em promoção`}
      />
      <OfertasTable books={(books ?? []) as Parameters<typeof OfertasTable>[0]["books"]} />
    </div>
  );
}
