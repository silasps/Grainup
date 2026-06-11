"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { toggleBookFlag, saveVitrineOrder } from "./actions";
import { Search, X, Plus, Trash2, TrendingUp, Star, Sparkles, Loader2, GripVertical, RotateCcw } from "lucide-react";

interface BookRow {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  sales_count: number;
  rating_avg: number;
  created_at: string;
  featured_position: number | null;
  bestseller_position: number | null;
  new_position: number | null;
  authors: { name: string } | null;
}

type BookFlag = "is_featured" | "is_bestseller" | "is_new";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function Cover({ book }: { book: Pick<BookRow, "cover_url" | "title"> }) {
  return (
    <div className="relative w-7 h-9 rounded bg-secondary overflow-hidden flex-shrink-0">
      {book.cover_url ? (
        <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="28px" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px]">📖</div>
      )}
    </div>
  );
}

function SearchAdd({
  allBooks,
  activeIds,
  onAdd,
}: {
  allBooks: BookRow[];
  activeIds: Set<string>;
  onAdd: (book: BookRow) => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = normalize(query);
    return allBooks
      .filter((b) => !activeIds.has(b.id) && normalize(b.title).includes(q))
      .slice(0, 8);
  }, [allBooks, activeIds, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar livro para adicionar..."
          className="pl-9 pr-9"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query && results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 border border-border rounded-lg bg-white shadow-md max-h-56 overflow-y-auto">
          {results.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => { onAdd(book); setQuery(""); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 border-b border-border last:border-0 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-brand shrink-0" />
              <span className="flex-1 truncate">{book.title}</span>
              <span className="text-xs text-muted-foreground">{formatCurrency(book.price)}</span>
            </button>
          ))}
        </div>
      )}
      {query && results.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">Nenhum livro encontrado.</p>
      )}
    </div>
  );
}

function SortableList({
  books,
  flag,
  pending,
  onRemove,
  onReorder,
  renderMeta,
  emptyText,
}: {
  books: BookRow[];
  flag: BookFlag;
  pending: Record<string, boolean>;
  onRemove: (id: string) => void;
  onReorder: (newOrder: BookRow[]) => void;
  renderMeta?: (book: BookRow) => React.ReactNode;
  emptyText: string;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);

  // Non-passive touchmove needed to preventDefault (block page scroll during drag)
  useEffect(() => {
    const el = tbodyRef.current;
    if (!el) return;
    function onTouchMove(e: TouchEvent) {
      if (dragIndex.current === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = target?.closest<HTMLElement>("[data-idx]");
      if (row) {
        const idx = parseInt(row.dataset.idx ?? "-1", 10);
        if (idx >= 0 && idx < 10) setDragOver(idx);
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [books.length]);

  if (books.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  function handleDrop(toIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === toIndex) { setDragOver(null); return; }
    const next = [...books];
    const [item] = next.splice(from, 1);
    next.splice(toIndex, 0, item);
    onReorder(next);
    setDragOver(null);
    dragIndex.current = null;
  }

  function handleTouchEnd() {
    if (dragIndex.current !== null && dragOver !== null) handleDrop(dragOver);
    dragIndex.current = null;
    setDragOver(null);
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody ref={tbodyRef}>
          {books.map((book, i) => {
            const draggable = i < 10;
            const isDragOver = dragOver === i;
            return (
              <tr
                key={book.id}
                data-idx={i}
                draggable={draggable}
                onDragStart={draggable ? () => { dragIndex.current = i; } : undefined}
                onDragOver={draggable ? (e) => { e.preventDefault(); setDragOver(i); } : undefined}
                onDrop={draggable ? (e) => { e.preventDefault(); handleDrop(i); } : undefined}
                onDragEnd={() => setDragOver(null)}
                onTouchStart={draggable ? () => { dragIndex.current = i; } : undefined}
                onTouchEnd={draggable ? handleTouchEnd : undefined}
                className={`border-b border-border last:border-0 transition-colors ${isDragOver ? "bg-brand/5 border-brand/30" : "hover:bg-secondary/20"}`}
              >
                <td className="pl-3 pr-1 py-3 w-6">
                  {draggable
                    ? <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                    : <span className="text-[10px] text-muted-foreground/30 pl-1">{i + 1}</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Cover book={book} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{(book.authors as { name: string } | null)?.name ?? "—"}</p>
                    </div>
                  </div>
                </td>
                {renderMeta && (
                  <td className="px-3 py-3 text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {renderMeta(book)}
                  </td>
                )}
                <td className="px-3 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={!!pending[book.id + flag]}
                    onClick={() => onRemove(book.id)}
                  >
                    {pending[book.id + flag]
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function sortByPosition(books: BookRow[], posKey: keyof BookRow, fallback: (a: BookRow, b: BookRow) => number) {
  return [...books].sort((a, b) => {
    const pa = a[posKey] as number | null;
    const pb = b[posKey] as number | null;
    if (pa !== null && pb !== null) return pa - pb;
    if (pa !== null) return -1;
    if (pb !== null) return 1;
    return fallback(a, b);
  });
}

export default function VitrinePage() {
  const supabase = createClient();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [destaques, setDestaques] = useState<BookRow[]>([]);
  const [bestsellers, setBestsellers] = useState<BookRow[]>([]);
  const [lancamentos, setLancamentos] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url, price, is_featured, is_bestseller, is_new, sales_count, rating_avg, created_at, featured_position, bestseller_position, new_position, authors(name)")
      .eq("is_active", true)
      .order("title");
    const all = (data ?? []) as unknown as BookRow[];
    setBooks(all);
    setDestaques(sortByPosition(all.filter(b => b.is_featured), "featured_position", (a, b) => b.rating_avg - a.rating_avg));
    setBestsellers(sortByPosition(all.filter(b => b.is_bestseller && b.sales_count > 0), "bestseller_position", (a, b) => b.sales_count - a.sales_count));
    setLancamentos(sortByPosition(all.filter(b => b.is_new), "new_position", (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(bookId: string, flag: BookFlag, value: boolean) {
    setPending((p) => ({ ...p, [bookId + flag]: true }));
    try {
      await toggleBookFlag(bookId, flag, value);
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, [flag]: value } : b)));
      if (!value) {
        const remove = (list: BookRow[]) => list.filter(b => b.id !== bookId);
        if (flag === "is_featured") setDestaques(remove);
        if (flag === "is_bestseller") setBestsellers(remove);
        if (flag === "is_new") setLancamentos(remove);
      } else {
        const book = books.find(b => b.id === bookId);
        if (book) {
          const updated = { ...book, [flag]: true };
          if (flag === "is_featured") setDestaques(prev => [...prev, updated]);
          if (flag === "is_bestseller") setBestsellers(prev => [...prev, updated]);
          if (flag === "is_new") setLancamentos(prev => [...prev, updated]);
        }
      }
    } catch {
      toast.error("Erro ao atualizar livro");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[bookId + flag]; return n; });
    }
  }

  async function reorder(flag: BookFlag, newList: BookRow[]) {
    if (flag === "is_featured") setDestaques(newList);
    if (flag === "is_bestseller") setBestsellers(newList);
    if (flag === "is_new") setLancamentos(newList);
    try {
      await saveVitrineOrder(flag, newList.map(b => b.id));
    } catch {
      toast.error("Erro ao salvar ordem");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <AdminHeader title="Vitrine" subtitle="Carregando..." />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Vitrine" subtitle="Seções exibidas na página inicial da editora" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Tabs defaultValue="destaques">
          <TabsList className="mb-6">
            <TabsTrigger value="destaques" className="gap-1.5">
              <Star className="h-3.5 w-3.5" />
              Destaques
              <Badge variant="secondary" className="text-[10px] ml-0.5">{destaques.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="mais-vendidos" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Mais Vendidos
              <Badge variant="secondary" className="text-[10px] ml-0.5">{bestsellers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Lançamentos
              <Badge variant="secondary" className="text-[10px] ml-0.5">{lancamentos.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="destaques" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Arraste para reordenar os 10 primeiros. Busque para adicionar.</p>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" onClick={() => reorder("is_featured", [...destaques].sort((a, b) => b.rating_avg - a.rating_avg))}>
                <RotateCcw className="h-3 w-3" /> Ordenar por avaliação
              </Button>
            </div>
            <SearchAdd allBooks={books} activeIds={new Set(destaques.map(b => b.id))} onAdd={(b) => toggle(b.id, "is_featured", true)} />
            <SortableList
              books={destaques} flag="is_featured" pending={pending}
              onRemove={(id) => toggle(id, "is_featured", false)}
              onReorder={(list) => reorder("is_featured", list)}
              renderMeta={(b) => <>★ {b.rating_avg?.toFixed(1) ?? "—"}</>}
              emptyText="Nenhum livro em destaque. Busque acima para adicionar."
            />
          </TabsContent>

          <TabsContent value="mais-vendidos" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Arraste para reordenar os 10 primeiros. Busque para adicionar manualmente.</p>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" onClick={() => reorder("is_bestseller", [...bestsellers].sort((a, b) => b.sales_count - a.sales_count))}>
                <RotateCcw className="h-3 w-3" /> Ordenar por vendas
              </Button>
            </div>
            <SearchAdd allBooks={books} activeIds={new Set(bestsellers.map(b => b.id))} onAdd={(b) => toggle(b.id, "is_bestseller", true)} />
            <SortableList
              books={bestsellers} flag="is_bestseller" pending={pending}
              onRemove={(id) => toggle(id, "is_bestseller", false)}
              onReorder={(list) => reorder("is_bestseller", list)}
              renderMeta={(b) => <>{b.sales_count ?? 0} vendas</>}
              emptyText="Nenhum livro na lista. Busque acima para adicionar."
            />
          </TabsContent>

          <TabsContent value="lancamentos" className="space-y-4">
            <p className="text-sm text-muted-foreground">Arraste para reordenar os 10 primeiros. Busque para adicionar outros.</p>
            <SearchAdd allBooks={books} activeIds={new Set(lancamentos.map(b => b.id))} onAdd={(b) => toggle(b.id, "is_new", true)} />
            <SortableList
              books={lancamentos} flag="is_new" pending={pending}
              onRemove={(id) => toggle(id, "is_new", false)}
              onReorder={(list) => reorder("is_new", list)}
              renderMeta={(b) => fmtDate(b.created_at)}
              emptyText="Nenhum lançamento. Busque acima para adicionar."
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
