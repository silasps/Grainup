import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
}

async function getBooks(): Promise<BookRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, stock, is_active, is_bestseller, is_new, sales_count, rating_avg, rating_count, authors(name)")
    .order("title");
  return (data ?? []) as unknown as BookRow[];
}

export default async function AdminLivrosPage() {
  const books = await getBooks();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Livros"
        subtitle={`${books.length} livros cadastrados`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{books.filter((b) => b.is_active).length}</span> ativos ·{" "}
              <span className="font-medium text-foreground">{books.filter((b) => b.is_bestseller).length}</span> bestsellers ·{" "}
              <span className="font-medium text-foreground">{books.filter((b) => b.is_new).length}</span> lançamentos
            </div>
          </div>
          <Button className="bg-brand hover:bg-brand-700 text-white gap-2" asChild>
            <Link href="/admin/editora/livros/novo">
              <Plus className="h-4 w-4" />
              Novo livro
            </Link>
          </Button>
        </div>

        <Suspense>
          <BooksTable books={books} />
        </Suspense>
      </main>
    </div>
  );
}
