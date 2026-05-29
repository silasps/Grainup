"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCard, type BookCardData } from "@/components/editora/book-card";
import { cn } from "@/lib/utils";

interface BookShelfProps {
  books: BookCardData[];
  className?: string;
}

export function BookShelf({ books, className }: BookShelfProps) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  }

  if (books.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Seta esquerda — desktop */}
      <button
        onClick={() => scroll("left")}
        aria-label="Rolar para a esquerda"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3",
          "hidden lg:flex items-center justify-center",
          "h-9 w-9 rounded-full bg-white shadow-md border border-border",
          "hover:bg-secondary transition-colors"
        )}
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      {/* Scroll container */}
      <div
        ref={ref}
        className={cn(
          "flex gap-3 overflow-x-auto scrollbar-hide",
          "snap-x snap-mandatory",
          "-mx-4 px-4 pb-2 lg:mx-0 lg:px-0"
        )}
      >
        {books.map((book) => (
          <div
            key={book.id}
            className="snap-start flex-shrink-0 w-[46vw] sm:w-44 lg:w-48 xl:w-52 flex flex-col"
          >
            <BookCard book={book} />
          </div>
        ))}

        {/* Espaço extra no final para o fade não cortar o último card */}
        <div className="flex-shrink-0 w-4 lg:hidden" aria-hidden />
      </div>

      {/* Fade right — sinaliza mais conteúdo (mobile/tablet) */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent lg:hidden"
        aria-hidden
      />

      {/* Seta direita — desktop */}
      <button
        onClick={() => scroll("right")}
        aria-label="Rolar para a direita"
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3",
          "hidden lg:flex items-center justify-center",
          "h-9 w-9 rounded-full bg-white shadow-md border border-border",
          "hover:bg-secondary transition-colors"
        )}
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
}
