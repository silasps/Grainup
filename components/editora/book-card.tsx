"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, ShoppingCart, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { useCartStore } from "@/stores/cart";
import { toast } from "sonner";

export interface BookCardData {
  id: string;
  title: string;
  slug: string;
  author?: string | null;
  coverUrl?: string | null;
  price: number;
  pricePromotional?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  descriptionShort?: string | null;
  isNew?: boolean;
  isBestseller?: boolean;
  isOffer?: boolean;
  isFreeShipping?: boolean;
}

interface BookCardProps {
  book: BookCardData;
  className?: string;
}

export function BookCard({ book, className }: BookCardProps) {
  const [ready, setReady] = useState(!book.coverUrl);
  const addItem = useCartStore((s) => s.addItem);
  const setBuyNow = useCartStore((s) => s.setBuyNow);
  const router = useRouter();

  const hasDiscount = book.pricePromotional && book.pricePromotional < book.price;
  const displayPrice = book.pricePromotional ?? book.price;
  const discountPct = hasDiscount
    ? Math.round((1 - book.pricePromotional! / book.price) * 100)
    : 0;
  const savings = hasDiscount ? book.price - book.pricePromotional! : 0;

  function cartItem() {
    return {
      id: book.id,
      type: "book" as const,
      title: book.title,
      slug: book.slug,
      coverUrl: book.coverUrl ?? null,
      price: displayPrice,
    };
  }

  function handleBuyNow(e: React.MouseEvent) {
    e.preventDefault();
    setBuyNow(cartItem());
    router.push("/checkout");
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem(cartItem());
    toast.success("Adicionado ao carrinho", {
      description: book.title,
      action: { label: "Ver carrinho", onClick: () => router.push("/editora/carrinho") },
    });
  }

  return (
    <article
      className={cn(
        "group flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      {/* Capa — clique vai para detalhe */}
      <Link href={`/editora/livros/${book.slug}`} className="relative block aspect-[3/4] bg-secondary overflow-hidden">
        {book.coverUrl ? (
          <>
            {!ready && <div className="absolute inset-0 z-10 animate-pulse bg-muted" />}
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              onLoad={() => setReady(true)}
              onError={() => setReady(true)}
              className={cn(
                "object-cover transition-all duration-300 group-hover:scale-[1.02]",
                ready ? "opacity-100" : "opacity-0"
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <span className="text-3xl text-brand/40">📖</span>
          </div>
        )}

        {ready && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && (
              <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                -{discountPct}%
              </Badge>
            )}
            {book.isNew && (
              <Badge className="bg-brand hover:bg-brand text-white text-[10px] px-1.5 py-0.5">
                Novo
              </Badge>
            )}
            {book.isBestseller && (
              <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                + Vendido
              </Badge>
            )}
          </div>
        )}
      </Link>

      {/* Conteúdo */}
      {!ready ? (
        <div className="flex flex-col flex-1 p-3 gap-2">
          <div className="h-3 rounded bg-muted animate-pulse w-2/3" />
          <div className="h-4 rounded bg-muted animate-pulse" />
          <div className="h-4 rounded bg-muted animate-pulse w-3/4" />
          <div className="h-5 rounded bg-muted animate-pulse w-1/3 mt-auto" />
          <div className="h-8 rounded bg-muted animate-pulse mt-1" />
          <div className="h-8 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 p-3 gap-1.5 animate-in fade-in duration-300">
          {book.author && (
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          )}

          <h3 className="flex-1 text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {book.title}
          </h3>

          {(book.ratingCount ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= Math.round(book.ratingAvg ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted-foreground/30"
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground">({book.ratingCount})</span>
            </div>
          )}

          {/* Preço */}
          <div className="mt-auto pt-1">
            {hasDiscount && (
              <p className="text-[10px] text-muted-foreground line-through leading-none mb-0.5">
                {formatCurrency(book.price)}
              </p>
            )}
            <p className="text-base font-bold text-brand leading-none">
              {formatCurrency(displayPrice)}
            </p>
            {savings > 0 && (
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Economize {formatCurrency(savings)}
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-1.5 mt-1">
            <Button
              size="sm"
              className="w-full bg-brand hover:bg-brand-700 text-white h-8 text-xs font-semibold cursor-pointer"
              onClick={handleBuyNow}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              Comprar agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs cursor-pointer"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
