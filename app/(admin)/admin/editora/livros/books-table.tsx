"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { Pencil, Eye, Search, X } from "lucide-react";
import { toast } from "sonner";
import { updateBookRelevanceAction } from "./actions";

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
  sku: string | null;
  bling_product_id: number | null;
  relevance: number | null;
  pages: number | null;
}

const RELEVANCE_COLORS: Record<number, string> = {
  1: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  2: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  3: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  4: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  5: "bg-brand-50 text-brand hover:bg-brand-100",
};

const RELEVANCE_ACTIVE: Record<number, string> = {
  1: "bg-slate-200 text-slate-800 ring-2 ring-slate-400",
  2: "bg-sky-200 text-sky-800 ring-2 ring-sky-500",
  3: "bg-amber-200 text-amber-800 ring-2 ring-amber-500",
  4: "bg-orange-200 text-orange-800 ring-2 ring-orange-500",
  5: "bg-brand-100 text-brand ring-2 ring-brand",
};

function RelevanceCell({ book, onSave }: { book: BookRow; onSave: (id: string, v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(e: React.MouseEvent, value: number) {
    e.stopPropagation();
    const next = book.relevance === value ? null : value;
    startTransition(async () => {
      const res = await updateBookRelevanceAction(book.id, next);
      if (res.error) {
        toast.error(res.error);
      } else {
        onSave(book.id, next);
        toast.success(next ? `Relevância ${next} salva` : "Relevância removida");
      }
      setEditing(false);
    });
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button
            key={v}
            onClick={(e) => handleSelect(e, v)}
            disabled={isPending}
            className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50 ${
              book.relevance === v ? RELEVANCE_ACTIVE[v] : RELEVANCE_COLORS[v]
            }`}
            title={`Relevância ${v}`}
          >
            {v}
          </button>
        ))}
        <button
          onClick={handleClose}
          className="ml-0.5 text-muted-foreground hover:text-foreground"
          title="Cancelar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleOpen}
      title="Clique para editar relevância"
      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold transition-all ${
        book.relevance
          ? `${RELEVANCE_COLORS[book.relevance]} ring-1 ring-inset ring-current/20`
          : "text-muted-foreground/40 hover:text-muted-foreground border border-dashed border-border hover:border-muted-foreground/40 bg-transparent"
      }`}
    >
      {book.relevance ?? "·"}
    </button>
  );
}

export function BooksTable({ books: initialBooks }: { books: BookRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [books, setBooks] = useState(initialBooks);

  function handleRelevanceSave(id: string, relevance: number | null) {
    setBooks((prev) => prev.map((b) => b.id === id ? { ...b, relevance } : b));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">SKU</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Preço</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Relevância</th>
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
                  <tr
                    key={book.id}
                    onClick={() => router.push(`/admin/editora/livros/${book.id}`)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
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
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {book.sku
                          ? <span className="font-mono text-xs text-foreground">{book.sku}</span>
                          : <span className="text-xs text-muted-foreground/40">—</span>}
                        {!book.bling_product_id && (
                          <span className="inline-flex items-center w-fit text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5" title="Produto ainda não enviado ao Bling">
                            ⚠ Pendente Bling
                          </span>
                        )}
                      </div>
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
                      <RelevanceCell book={book} onSave={handleRelevanceSave} />
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
                          <a href={`/editora/livros/${book.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/admin/editora/livros/${book.id}`} onClick={(e) => e.stopPropagation()}>
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
