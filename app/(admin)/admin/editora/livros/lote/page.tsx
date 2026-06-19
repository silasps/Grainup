import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { BatchLote } from "@/components/admin/batch-lote";

export const metadata: Metadata = { title: "Atualização em lote — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

export interface BookFull {
  id: string;
  title: string;
  slug: string;
  price: number;
  price_promotional: number | null;
  stock: number;
  pages: number | null;
  relevance: number | null;
  bling_product_id: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  isbn: string | null;
  sku: string | null;
  publisher: string | null;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  description_short: string | null;
  authors: { name: string } | null;
  categories: { name: string } | null;
}

async function getBooks(): Promise<BookFull[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(`
      id, title, slug, price, price_promotional, stock, pages, relevance, bling_product_id,
      is_active, is_featured, is_new, is_bestseller,
      isbn, sku, publisher, weight_grams, height_cm, width_cm, length_cm,
      description_short,
      authors(name), categories(name)
    `)
    .order("title");
  return (data ?? []) as unknown as BookFull[];
}

export default async function LotePage() {
  const books = await getBooks();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Atualização em lote"
        subtitle={`${books.length} livros no catálogo`}
      />
      <main className="flex-1 overflow-y-auto">
        <BatchLote books={books} />
      </main>
    </div>
  );
}
