"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchBooksQuick, type QuickBook } from "@/lib/actions/search-books-quick";
import { cn } from "@/lib/utils";

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickBook[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await searchBooksQuick(query);
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/editora/livros?busca=${encodeURIComponent(q)}`);
  }

  function close() {
    setOpen(false);
  }

  const showDropdown = open && query.trim().length >= 2;

  const resultsList = (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length > 0 ? (
        <>
          <ul className="divide-y divide-border">
            {results.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/editora/livros/${book.slug}`}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors"
                >
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted rounded" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    {book.author && (
                      <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                    )}
                    <p className="text-xs font-semibold text-brand mt-0.5">
                      {(book.price_promotional ?? book.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/editora/livros?busca=${encodeURIComponent(query.trim())}`}
            onClick={close}
            className="flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium text-brand hover:bg-brand-50 transition-colors border-t border-border"
          >
            Ver todos os resultados para &ldquo;{query.trim()}&rdquo; →
          </Link>
        </>
      ) : (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhum livro encontrado para &ldquo;{query.trim()}&rdquo;
        </p>
      )}
    </>
  );

  return (
    <>
      {/* Desktop / tablet */}
      <div ref={containerRef} className={cn("relative hidden sm:flex items-center")}>
        {!open ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Buscar livros"
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar livros..."
                className="pl-8 h-8 w-52 text-sm pr-7"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={close}
              aria-label="Fechar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        )}

        {showDropdown && (
          <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden">
            {resultsList}
          </div>
        )}
      </div>

      {/* Mobile: ícone visível no header */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buscar livros"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Mobile: overlay fullscreen */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <form onSubmit={handleSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={mobileInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar livros..."
                className="pl-9 pr-8 w-full"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
            <Button variant="ghost" size="sm" onClick={close}>
              Cancelar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {query.trim().length >= 2 ? (
              resultsList
            ) : (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                Digite para buscar livros
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
