"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroCarouselBook {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  price: number;
  pricePromotional?: number | null;
  isNew?: boolean;
  isBestseller?: boolean;
}

export function HeroBookCarousel({ books: rawBooks }: { books: HeroCarouselBook[] }) {
  const books = rawBooks.filter((b) => b.coverUrl);

  const [current, setCurrent] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (books.length <= 1) return;
    const timer = setInterval(
      () => setCurrent((c) => (c + 1) % books.length),
      4500
    );
    return () => clearInterval(timer);
  }, [books.length, tick]);

  if (books.length === 0) return null;

  function go(i: number) {
    setCurrent(i);
    setTick((t) => t + 1);
  }

  const book = books[current];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Capa principal — clicável */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full bg-brand/15 blur-3xl" />
        </div>

        <Link href={`/editora/livros/${book.slug}`} aria-label={book.title} className="group block">
          <div
            className={cn(
              "relative w-52 xl:w-64 aspect-[3/4] rounded-2xl overflow-hidden",
              "shadow-[0_24px_64px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
              "transition-transform duration-300 group-hover:scale-[1.03]"
            )}
          >
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="(min-width: 1280px) 256px, 208px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10 text-5xl">
                📖
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Thumbnails + setas */}
      {books.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => go((current - 1 + books.length) % books.length)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
            aria-label="Livro anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div className="flex gap-1.5">
            {books.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={b.title}
                className={cn(
                  "w-7 aspect-[3/4] rounded overflow-hidden ring-1 transition-all duration-200",
                  i === current
                    ? "ring-brand scale-110 opacity-100"
                    : "ring-white/20 opacity-40 hover:opacity-65"
                )}
              >
                {b.coverUrl ? (
                  <Image
                    src={b.coverUrl}
                    alt={b.title}
                    width={28}
                    height={37}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => go((current + 1) % books.length)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
            aria-label="Próximo livro"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
