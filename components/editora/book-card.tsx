"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Sparkles, TrendingUp } from "lucide-react";
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
  stock?: number;
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

  const outOfStock = typeof book.stock === "number" && book.stock === 0;
  const hasDiscount = book.pricePromotional && book.pricePromotional < book.price;
  const displayPrice = book.pricePromotional ?? book.price;
  const discountPct = hasDiscount
    ? Math.round((1 - book.pricePromotional! / book.price) * 100)
    : 0;

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
        "group flex flex-col h-full bg-white rounded-2xl overflow-hidden",
        "shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.13)]",
        "transition-all duration-300 hover:-translate-y-1",
        className
      )}
    >
      {/* Capa */}
      <Link href={`/editora/livros/${book.slug}`} className="relative block aspect-[2/3] overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
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
                "object-cover transition-all duration-500 group-hover:scale-[1.04]",
                ready ? "opacity-100" : "opacity-0"
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl text-brand/30">📖</span>
          </div>
        )}

        {/* Badges */}
        {ready && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {hasDiscount && (
              <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-full shadow-sm">
                -{discountPct}%
              </Badge>
            )}
            {book.isNew && (
              <Badge className="bg-brand hover:bg-brand text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Novo
              </Badge>
            )}
            {book.isBestseller && (
              <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-sm flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" /> + Vendido
              </Badge>
            )}
          </div>
        )}

        {/* Desktop: overlay no hover | Mobile: botão sempre visível no canto */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 hidden sm:flex">
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {outOfStock ? "Sem estoque" : "Adicionar"}
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="sm:hidden absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-foreground p-2 rounded-full shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Adicionar ao carrinho"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </Link>

      {/* Conteúdo */}
      {!ready ? (
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="h-3 rounded-full bg-muted animate-pulse w-1/2" />
          <div className="h-4 rounded-full bg-muted animate-pulse" />
          <div className="h-4 rounded-full bg-muted animate-pulse w-3/4" />
          <div className="h-6 rounded-full bg-muted animate-pulse w-1/3 mt-auto" />
          <div className="h-9 rounded-xl bg-muted animate-pulse mt-2" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 p-4 gap-2 animate-in fade-in duration-300">
          {book.author && (
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {book.author}
            </p>
          )}

          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
            {book.title}
          </h3>

          {/* Preço */}
          <div className="mt-auto pt-1">
            {hasDiscount && (
              <p className="text-[11px] text-muted-foreground line-through leading-none mb-0.5">
                {formatCurrency(book.price)}
              </p>
            )}
            <p className="text-lg font-bold text-brand leading-none">
              {formatCurrency(displayPrice)}
            </p>
          </div>

          {/* Botão principal */}
          <Button
            size="sm"
            disabled={outOfStock}
            className="w-full mt-1 bg-brand hover:bg-brand-700 text-white h-9 text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleBuyNow}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            {outOfStock ? "Sem estoque" : "Comprar agora"}
          </Button>
        </div>
      )}
    </article>
  );
}
