import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CartPageClient } from "@/components/editora/cart-page-client";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Meu Carrinho",
};

type BookRec = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
};

async function getRecommendedBooks(): Promise<BookRec[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, slug, cover_url, price, price_promotional, is_bestseller, rating_avg")
    .eq("is_active", true)
    .order("is_bestseller", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(8);
  return (data as BookRec[] | null) ?? [];
}

export default async function CarrinhoPage() {
  const recommended = await getRecommendedBooks();

  return (
    <div className="bg-secondary/40 min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-heading font-bold text-2xl mb-6">Meu Carrinho</h1>

        <CartPageClient />

        {/* Recommendations */}
        {recommended.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading font-bold text-lg mb-4">Você também vai gostar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recommended.map((book) => {
                const displayPrice = book.price_promotional ?? book.price;
                const hasDiscount = book.price_promotional && book.price_promotional < book.price;
                return (
                  <Link
                    key={book.id}
                    href={`/editora/livros/${book.slug}`}
                    className="bg-white rounded-xl border border-border p-3 flex flex-col gap-2 hover:shadow-md transition-shadow group"
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                        {book.title}
                      </p>
                    </div>
                    <div>
                      {hasDiscount && (
                        <p className="text-[10px] text-muted-foreground line-through">
                          {formatCurrency(book.price)}
                        </p>
                      )}
                      <p className="text-sm font-bold text-brand">{formatCurrency(displayPrice)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
