import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookShelf } from "@/components/editora/book-shelf";
import { NewsletterForm } from "@/components/editora/newsletter-form";
import { DestaqueBanner } from "@/components/editora/destaque-banner";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Editora Jocum — Livros que transformam vidas",
  description:
    "Conheça o catálogo completo da Editora Jocum. Livros cristãos sobre missões, liderança, família, oração e muito mais.",
};

export const revalidate = 60;

async function getHomeData() {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [bestsellers, newBooks, featuredBooks, reviewsResult, destaquesResult] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_bestseller, is_new, authors(name)")
      .eq("is_active", true)
      .eq("is_bestseller", true)
      .order("bestseller_position", { ascending: true, nullsFirst: false })
      .order("sales_count", { ascending: false })
      .limit(10),

    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_new, authors(name)")
      .eq("is_active", true)
      .eq("is_new", true)
      .order("new_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("books")
      .select("id, title, slug, cover_url, price, price_promotional, rating_avg, rating_count, is_featured, authors(name)")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("featured_position", { ascending: true, nullsFirst: false })
      .order("rating_avg", { ascending: false })
      .limit(8),

    supabase
      .from("reviews")
      .select("id, rating, title, body, created_at, books(title, slug, cover_url)")
      .eq("status", "aprovada")
      .order("created_at", { ascending: false })
      .limit(6),

    supabase
      .from("destaques")
      .select("id, title, image_url, image_mobile_url, video_url, cta_url, focal_x, focal_y")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("position", { ascending: true })
      .limit(10),
  ]);

  return {
    bestsellers: (bestsellers.data ?? []) as Record<string, unknown>[],
    newBooks: (newBooks.data ?? []) as Record<string, unknown>[],
    featuredBooks: (featuredBooks.data ?? []) as Record<string, unknown>[],
    reviews: (reviewsResult.data ?? []) as Record<string, unknown>[],
    destaques: (destaquesResult.data ?? []) as {
      id: string;
      title: string;
      image_url: string | null;
      image_mobile_url: string | null;
      video_url: string | null;
      cta_url: string | null;
      focal_x: number | null;
      focal_y: number | null;
    }[],
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
  const { bestsellers, newBooks, featuredBooks, reviews, destaques } = await getHomeData();

  const featuredNorm = featuredBooks.map(normalizeBook);
  const bestsellersNorm = bestsellers.map(normalizeBook);
  const newBooksNorm = newBooks.map(normalizeBook);

  return (
    <div className="flex flex-col">
      {/* HERO + DESTAQUES (carrossel unificado) */}
      <DestaqueBanner
        destaques={destaques}
        heroCovers={[...featuredNorm, ...bestsellersNorm]
          .filter(b => b.coverUrl)
          .slice(0, 3)
          .map(b => ({ url: b.coverUrl!, title: b.title, slug: b.slug }))}
      />

      {/* DESTAQUES — prateleira horizontal */}
      {featuredNorm.length > 0 && (
        <section className="py-14 bg-brand-50">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Destaques da Editora
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Livros mais bem avaliados pelos leitores
                </p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 text-sm shrink-0" asChild>
                <Link href="/editora/livros?ordenar=avaliacao">
                  Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <BookShelf books={featuredNorm} />
          </div>
        </section>
      )}

      {/* MAIS VENDIDOS — prateleira horizontal */}
      {bestsellersNorm.length > 0 && (
        <section className="py-14">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Mais vendidos
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Os favoritos dos nossos leitores
                </p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 text-sm shrink-0" asChild>
                <Link href="/editora/livros?ordenar=mais-vendidos">
                  Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <BookShelf books={bestsellersNorm} />
          </div>
        </section>
      )}

      {/* LANÇAMENTOS — prateleira horizontal */}
      {newBooksNorm.length > 0 && (
        <section className="py-14 bg-secondary">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Lançamentos
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Novidades que acabaram de chegar
                </p>
              </div>
              <Button variant="ghost" className="text-brand hover:text-brand-700 text-sm shrink-0" asChild>
                <Link href="/editora/livros?ordenar=lancamentos">
                  Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <BookShelf books={newBooksNorm} />
          </div>
        </section>
      )}

      {/* PROVA SOCIAL — Avaliações */}
      {reviews.length > 0 && (
        <section className="py-14">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="text-center mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
                O que dizem nossos leitores
              </h2>
              <p className="text-muted-foreground text-sm">
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
                    className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3"
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

      {/* BENEFÍCIOS — versão clara com cards */}
      <section className="py-8 bg-[#F7F4EF] border-y border-border">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { Icon: Truck,       title: "Frete grátis",   sub: "acima de R$200" },
              { Icon: ShieldCheck, title: "Compra segura",  sub: "pagamento protegido" },
              { Icon: Star,        title: "+200 títulos",   sub: "em estoque" },
              { Icon: BookOpen,    title: "Todo o Brasil",  sub: "entregamos para você" },
            ].map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm">
                <div className="bg-brand-50 rounded-xl p-2 shrink-0">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-14 bg-brand/5 border-y border-brand/10">
        <div className="container mx-auto max-w-xl px-4">
          <NewsletterForm origin="home" />
        </div>
      </section>

      {/* CTA FINAL — claro com destaque brand */}
      <section className="py-16 bg-gradient-to-br from-brand-50 via-[#F7F4EF] to-brand-100">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand/70 bg-white border border-brand-100 px-3 py-1.5 rounded-full mb-5">
            Editora Jocum Brasil
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Pronto para explorar nosso catálogo?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Mais de 200 títulos sobre missões, liderança, família, oração, evangelismo e muito mais.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-brand hover:bg-brand-700 text-white font-semibold px-8 shadow-md hover:shadow-lg" asChild>
              <Link href="/editora/livros">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand/30 text-brand hover:bg-white font-semibold px-8" asChild>
              <Link href="/editora/afiliados">Seja um afiliado</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
