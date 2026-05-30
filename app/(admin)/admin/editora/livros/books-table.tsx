"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { Pencil, Eye, Search, X } from "lucide-react";

interface BookRow {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  stock: number;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  authors: { name: string } | null;
}

export function BooksTable({ books }: { books: BookRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const filtered = query.trim()
    ? books.filter((b) => {
        const q = query.toLowerCase();
        const author = (b.authors as { name: string } | null)?.name ?? "";
        return b.title.toLowerCase().includes(q) || author.toLowerCase().includes(q);
      })
    : books;

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar por título ou autor..."
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => handleQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length === 0
            ? "Nenhum livro encontrado"
            : `${filtered.length} de ${books.length} livros`}
        </p>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
        <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Livro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Autor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Preço</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Estoque</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Vendas</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
                <th className="px-5 py-3 bg-white" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((book) => {
                const author = book.authors as { name: string } | null;
                const hasDiscount = book.price_promotional && book.price_promotional < book.price;
                return (
                  <tr key={book.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                          {book.cover_url ? (
                            <Image
                              src={book.cover_url}
                              alt={book.title}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]">📖</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground line-clamp-1 max-w-[200px]">
                            {book.title}
                          </p>
                          <div className="flex gap-1 mt-0.5">
                            {book.is_bestseller && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700">
                                Top
                              </Badge>
                            )}
                            {book.is_new && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-brand-50 text-brand">
                                Novo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                      {author?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        {hasDiscount ? (
                          <>
                            <p className="font-semibold text-brand text-xs">
                              {formatCurrency(book.price_promotional!)}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-through">
                              {formatCurrency(book.price)}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-foreground text-xs">
                            {formatCurrency(book.price)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className={book.stock <= 5 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                        {book.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">
                      {book.sales_count ?? 0}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={book.is_active ? "default" : "secondary"}
                        className={book.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs" : "text-xs"}
                      >
                        {book.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={`/editora/livros/${book.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/admin/editora/livros/${book.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
