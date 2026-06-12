import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookGrid } from "@/components/editora/book-grid";
import { NewsletterForm } from "@/components/editora/newsletter-form";

export const metadata: Metadata = {
  title: "Catálogo de Livros — Editora Jocum",
  description:
    "Explore o catálogo completo da Editora Jocum. Mais de 200 títulos sobre missões, liderança, família, oração, evangelismo e vida cristã.",
};

export const revalidate = 60;

async function getCatalogData() {
  const supabase = await createClient();

  const [booksResult, categoriesResult] = await Promise.all([
    supabase
      .from("books")
      .select(`
        id, title, slug, cover_url, price, price_promotional,
        rating_avg, rating_count, is_bestseller, is_new, is_featured,
        category_id, stock, authors(name)
      `)
      .eq("is_active", true)
      .order("title"),

    supabase
      .from("categories")
      .select("id, name, slug")
      .order("name"),
  ]);

  return {
    books: booksResult.data ?? [],
    categories: categoriesResult.data ?? [],
  };
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LivrosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { books, categories } = await getCatalogData();

  return (
    <div className="min-h-screen bg-background">
      <BookGrid
        books={books}
        categories={categories}
        searchParams={params}
      />
      <section className="py-14 bg-brand/5 border-t border-brand/10">
        <div className="container mx-auto max-w-xl px-4">
          <NewsletterForm origin="livros" />
        </div>
      </section>
    </div>
  );
}
