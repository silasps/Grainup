import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BookCard } from "@/components/editora/book-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Novidades",
  description: "Os lançamentos mais recentes da Editora Jocum. Fique por dentro das novidades.",
};

export const revalidate = 60;

export default async function NovididadesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_new, is_bestseller, authors(name)")
    .eq("is_active", true)
    .eq("is_new", true)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Record<string, unknown>[];
  const books = rows.map((b) => ({
    id: b.id as string,
    title: b.title as string,
    slug: b.slug as string,
    author: (b.authors as { name: string } | null)?.name ?? null,
    coverUrl: b.cover_url as string | null,
    price: b.price as number,
    pricePromotional: b.price_promotional as number | null,
    ratingAvg: b.rating_avg as number,
    ratingCount: b.rating_count as number,
    isNew: b.is_new as boolean,
    isBestseller: b.is_bestseller as boolean,
  }));

  return (
    <div>
      {/* Hero — mesmo padrão da home */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-brand" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Lançamentos</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Novidades
          </h1>
          <p className="text-white/65 max-w-xl leading-relaxed">
            Os títulos mais recentes da Editora Jocum. Sempre chegando novos livros para a sua jornada de fé.
          </p>
        </div>
      </section>

      {/* Barra de benefício */}
      <section className="bg-brand text-white py-3">
        <div className="container mx-auto max-w-7xl px-4 flex items-center justify-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>Títulos recém chegados — <strong>fique por dentro dos lançamentos.</strong></span>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          {books.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {books.length} {books.length === 1 ? "lançamento" : "lançamentos"} disponíveis
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {books.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                Em breve novos lançamentos
              </h2>
              <p className="text-muted-foreground mb-6">
                Fique de olho — novos títulos estão chegando em breve.
              </p>
              <Link
                href="/editora/livros"
                className="text-brand hover:underline text-sm font-medium"
              >
                Ver catálogo completo
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
