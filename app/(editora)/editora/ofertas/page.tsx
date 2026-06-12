import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { BookCard } from "@/components/editora/book-card";
import { HeroEyebrow } from "@/components/editora/hero-highlight";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Livros com desconto na Editora Jocum. Aproveite as melhores promoções em títulos cristãos.",
};

export const revalidate = 60;

export default async function OfertasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_new, is_bestseller, stock, authors(name)")
    .eq("is_active", true)
    .not("price_promotional", "is", null)
    .order("price_promotional", { ascending: true });

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
    isOffer: true,
    stock: b.stock as number,
  }));

  return (
    <div>
      {/* Hero — mesmo padrão da home */}
      <section className="bg-gradient-to-br from-[#F7F4EF] via-[#F2EFE9] to-brand-50 py-14">
        <div className="container mx-auto max-w-7xl px-4">
          <HeroEyebrow icon={Tag}>Promoções</HeroEyebrow>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Ofertas especiais
          </h1>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Livros com desconto selecionados para você. Aproveite enquanto durar o estoque.
          </p>
        </div>
      </section>

      {/* Barra de benefício */}
      <section className="bg-[#F7F4EF] border-y border-border py-3">
        <div className="container mx-auto max-w-7xl px-4 flex items-center justify-center gap-2 text-sm">
          <Tag className="h-4 w-4 shrink-0 text-brand" />
          <span className="text-sm text-muted-foreground">Descontos em títulos selecionados — <strong>enquanto durar o estoque.</strong></span>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          {books.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {books.length} {books.length === 1 ? "livro" : "livros"} em promoção
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {books.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                Nenhuma oferta no momento
              </h2>
              <p className="text-muted-foreground mb-6">
                Em breve teremos promoções especiais para você.
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
