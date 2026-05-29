"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

type BookRec = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
};

export function CartRecommendations({ books }: { books: BookRec[] }) {
  const addItem = useCartStore((s) => s.addItem);

  if (books.length === 0) return null;

  function handleAdd(book: BookRec, e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      id: book.id,
      type: "book",
      title: book.title,
      slug: book.slug,
      coverUrl: book.cover_url,
      price: book.price_promotional ?? book.price,
    });
    toast.success("Adicionado ao carrinho", { description: book.title });
  }

  return (
    <section className="mt-12">
      <h2 className="font-heading font-bold text-lg mb-4">Você também vai gostar</h2>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        {books.map((book) => {
          const displayPrice = book.price_promotional ?? book.price;
          const hasDiscount = book.price_promotional && book.price_promotional < book.price;
          const savings = hasDiscount ? book.price - book.price_promotional! : 0;

          return (
            <div
              key={book.id}
              className="flex-shrink-0 w-36 sm:w-40 bg-white rounded-xl border border-border flex flex-col overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/editora/livros/${book.slug}`} className="relative block aspect-[3/4] bg-secondary">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                )}
                {hasDiscount && (
                  <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    -{Math.round((1 - book.price_promotional! / book.price) * 100)}%
                  </span>
                )}
              </Link>

              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug flex-1">
                  {book.title}
                </p>
                <div>
                  {hasDiscount && (
                    <p className="text-[10px] text-muted-foreground line-through leading-none">
                      {formatCurrency(book.price)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-brand">{formatCurrency(displayPrice)}</p>
                  {savings > 0 && (
                    <p className="text-[10px] text-emerald-600 font-medium">
                      Economize {formatCurrency(savings)}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleAdd(book, e)}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-700 text-white text-xs font-medium h-7 rounded-md transition-colors cursor-pointer mt-auto"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
