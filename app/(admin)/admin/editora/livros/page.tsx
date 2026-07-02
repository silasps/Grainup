import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList } from "lucide-react";
import { UxGate } from "@/components/admin/ux-gate";
import { TopBooksByPurchaseChart, type BookEventRow } from "@/components/admin/top-books-by-purchase-chart";
import { getUxUpgradeStatus } from "@/lib/actions/ux-upgrades";
import { LEADS_FUNNEL_UX_UPGRADE_KEY } from "@/lib/ux-upgrade-keys";
import { BooksTable } from "./books-table";

export const metadata: Metadata = { title: "Livros — Admin Editora Jocum" };
export const revalidate = 60;

interface BookRow {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  stock: number;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  authors: { name: string } | null;
  sku: string | null;
  bling_product_id: number | null;
  relevance: number | null;
  pages: number | null;
}

async function getBooks(): Promise<BookRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, stock, is_active, is_bestseller, is_new, sales_count, rating_avg, rating_count, sku, bling_product_id, relevance, pages, authors(name)")
    .order("title");
  return (data ?? []) as unknown as BookRow[];
}

async function getBookEvents(): Promise<BookEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("book_events")
    .select("book_id, event_type, created_at, books(id, title, slug, cover_url)")
    .order("created_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as unknown as BookEventRow[];
}

export default async function AdminLivrosPage() {
  const [books, events, uxInfo] = await Promise.all([
    getBooks(),
    getBookEvents(),
    getUxUpgradeStatus(LEADS_FUNNEL_UX_UPGRADE_KEY),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Livros"
        subtitle={`${books.length} livros cadastrados`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Top 5 livros por compra — só visível com a atualização paga
            (trial ou comprada) ou em prévia de super admin. Sem versão
            antiga: esse widget nunca existiu nessa página antes. */}
        <UxGate
          info={uxInfo}
          newVersion={
            <div className="mb-6">
              <TopBooksByPurchaseChart events={events} limit={5} />
            </div>
          }
          oldVersion={null}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{books.filter((b) => b.is_active).length}</span> ativos ·{" "}
            <span className="font-medium text-foreground">{books.filter((b) => b.is_bestseller).length}</span> bestsellers ·{" "}
            <span className="font-medium text-foreground">{books.filter((b) => b.is_new).length}</span> lançamentos
          </p>
          <div className="flex gap-2 self-end sm:self-auto">
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/admin/editora/livros/lote">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Atualização em lote</span>
              </Link>
            </Button>
            <Button className="bg-brand hover:bg-brand-700 text-white gap-2" asChild>
              <Link href="/admin/editora/livros/novo">
                <Plus className="h-4 w-4" />
                Novo livro
              </Link>
            </Button>
          </div>
        </div>

        <Suspense>
          <BooksTable books={books} />
        </Suspense>
      </main>
    </div>
  );
}
