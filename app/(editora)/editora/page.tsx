import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Truck, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookCard } from "@/components/editora/book-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Editora Jocum — Livros que transformam vidas",
  description:
    "Conheça o catálogo completo da Editora Jocum. Livros cristãos sobre missões, liderança, família, oração e muito mais.",
};

export const revalidate = 60;

async function getHomeData() {
  const supabase = await createClient();

  const [bestsellers, newBooks, featuredBooks, reviewsResult] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_bestseller, is_new, authors(name)")
      .eq("is_active", true)
      .eq("is_bestseller", true)
      .order("sales_count", { ascending: false })
      .limit(8),

    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_new, authors(name)")
      .eq("is_active", true)
      .eq("is_new", true)
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_featured, authors(name)")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("rating_avg", { ascending: false })
      .limit(4),

    supabase
      .from("reviews")
      .select("id, rating, title, body, created_at, books(title, slug, cover_url)")
      .eq("status", "aprovada")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return {
    bestsellers: (bestsellers.data ?? []) as Record<string, unknown>[],
    newBooks: (newBooks.data ?? []) as Record<string, unknown>[],
    featuredBooks: (featuredBooks.data ?? []) as Record<string, unknown>[],
    reviews: (reviewsResult.data ?? []) as Record<string, unknown>[],
  };
}

function normalizeBook(b: Record<string, unknown>) {
  const authors = b.authors as { name: string } | null;
  return {
    id: b.id as string,
    title: b.title as string,
    slug: b.slug as string,
    author: authors?.name ?? null,
    coverUrl: b.cover_url as string | null,
    price: b.price as number,
    pricePromotional: b.price_promotional as number | null,
    ratingAvg: b.rating_avg as number,
    ratingCount: b.rating_count as number,
    isNew: b.is_new as boolean,
    isBestseller: b.is_bestseller as boolean,
  };
}

export default async function EditoraHomePage() {
  const { bestsellers, newBooks, featuredBooks, reviews } = await getHomeData();

  const hasBestsellers = bestsellers.length > 0;
  const hasNew = newBooks.length > 0;

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-foreground via-foreground/95 to-brand-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-center" />
        <div className="container mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-32 relative">
          <div className="max-w-2xl">
            <Badge className="mb-6 bg-brand hover:bg-brand text-white text-xs px-3 py-1">
              Editora Jocum Brasil
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance mb-6">
              Livros que transformam
              <span className="text-brand"> vidas</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-xl">
              Conhecer a Deus e fazê-lo conhecido. Explore nosso catálogo com mais de 200 títulos
              sobre missões, liderança, família, oração e vida cristã.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-brand hover:bg-brand-700 text-white font-semibold px-8"
                asChild
              >
                <Link href="/editora/livros">
                  Ver catálogo completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
                asChild
              >
                <Link href="/editora/ofertas">Ver ofertas</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decoração */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:flex items-center justify-center opacity-20">
          <BookOpen className="w-64 h-64" />
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="bg-brand text-white py-4">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-4 w-4 flex-shrink-0" />
              <span>Frete grátis acima de R$200</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <span>Compra 100% segura</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star className="h-4 w-4 flex-shrink-0" />
              <span>+200 títulos em estoque</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              <span>Entregamos para todo o Brasil</span>
            </div>
          </div>
        </div>
      </section>

      {/* DESTAQUES */}
      {featuredBooks.length > 0 && (
        <section className="py-16 bg-brand-50">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Destaques da Editora
                </h2>
                <p className="text-muted-foreground mt-1">Livros mais bem avaliados pelos leitores</p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 hidden sm:flex" asChild>
                <Link href="/editora/livros?ordenar=avaliacao">
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredBooks.map((b) => (
                <BookCard key={b.id as string} book={normalizeBook(b as Record<string, unknown>)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MAIS VENDIDOS */}
      {hasBestsellers && (
        <section className="py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Mais vendidos
                </h2>
                <p className="text-muted-foreground mt-1">Os favoritos dos nossos leitores</p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 hidden sm:flex" asChild>
                <Link href="/editora/livros?ordenar=mais-vendidos">
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {bestsellers.map((b) => (
                <BookCard key={b.id as string} book={normalizeBook(b as Record<string, unknown>)} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" className="border-brand text-brand hover:bg-brand-50" asChild>
                <Link href="/editora/livros?ordenar=mais-vendidos">
                  Ver todos os mais vendidos
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* LANÇAMENTOS */}
      {hasNew && (
        <section className="py-16 bg-secondary">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Lançamentos
                </h2>
                <p className="text-muted-foreground mt-1">Novidades que chegaram à editora</p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 hidden sm:flex" asChild>
                <Link href="/editora/livros?ordenar=lancamentos">
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newBooks.map((b) => (
                <BookCard key={b.id as string} book={normalizeBook(b as Record<string, unknown>)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROVA SOCIAL — Avaliações */}
      {reviews.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="text-center mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
                O que dizem nossos leitores
              </h2>
              <p className="text-muted-foreground">
                Avaliações verificadas de quem comprou e leu nossos livros
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review) => {
                const book = review.books as { title: string; slug: string; cover_url: string } | null;
                const rating = review.rating as number;
                const id = review.id as string;
                const title = review.title as string | null;
                const body = review.body as string | null;
                return (
                  <div
                    key={id}
                    className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
                  >
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/20 fill-muted"
                          }`}
                        />
                      ))}
                    </div>
                    {title && (
                      <p className="font-semibold text-sm text-foreground">"{title}"</p>
                    )}
                    {body && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {body}
                      </p>
                    )}
                    {book && (
                      <Link
                        href={`/editora/livros/${book.slug}`}
                        className="text-xs text-brand hover:underline mt-auto"
                      >
                        📖 {book.title}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-16 bg-foreground text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
            Pronto para explorar nosso catálogo?
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Mais de 200 títulos sobre missões, liderança, família, oração, evangelismo e muito mais.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-700 text-white font-semibold px-8"
              asChild
            >
              <Link href="/editora/livros">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/afiliados">Seja um afiliado</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
