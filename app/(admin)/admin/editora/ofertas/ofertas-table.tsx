"use client";

import { useState } from "react";
import Image from "next/image";
import { Tag, X, Check, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";
import { setPromoPrice } from "./actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface BookOfferRow {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
}

function InlinePromo({ book }: { book: BookOfferRow }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(book.price_promotional ? String(book.price_promotional) : "");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(book.price_promotional);

  async function save() {
    const val = draft.trim() === "" ? null : parseFloat(draft.replace(",", "."));
    if (val !== null && (isNaN(val) || val <= 0 || val >= book.price)) {
      toast.error("Preço inválido — deve ser menor que o preço original");
      return;
    }
    setLoading(true);
    const { error } = await setPromoPrice(book.id, val);
    setLoading(false);
    if (error) { toast.error(error); return; }
    setCurrent(val);
    setEditing(false);
    toast.success(val ? "Preço promocional salvo" : "Promoção removida");
  }

  const discount = current ? Math.round((1 - current / book.price) * 100) : 0;

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">R$</span>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="h-8 w-28 text-sm font-mono"
          placeholder="0,00"
        />
        <button onClick={save} disabled={loading} className="p-1 rounded hover:bg-emerald-50 text-emerald-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      {current ? (
        <>
          <span className="font-semibold text-emerald-600">{formatCurrency(current)}</span>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">−{discount}%</Badge>
          <button
            onClick={() => { setDraft(String(current)); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-brand hover:underline"
          >editar</button>
          <button
            onClick={async () => {
              setLoading(true);
              await setPromoPrice(book.id, null);
              setCurrent(null);
              setLoading(false);
              toast.success("Promoção removida");
            }}
            disabled={loading}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-destructive hover:underline"
          >{loading ? "…" : "remover"}</button>
        </>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand transition-colors border border-dashed border-border rounded px-2 py-1 hover:border-brand"
        >
          <Tag className="h-3 w-3" />
          Adicionar promoção
        </button>
      )}
    </div>
  );
}

export function OfertasTable({ books }: { books: BookOfferRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "none">("all");

  const filtered = books.filter((b) => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? !!b.price_promotional :
      !b.price_promotional;
    return matchSearch && matchFilter;
  });

  const activeCount = books.filter((b) => b.price_promotional).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar livro…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "none"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap",
                filter === f
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-muted-foreground border-border hover:border-brand hover:text-brand"
              )}
            >
              {f === "all" ? `Todos (${books.length})` : f === "active" ? `Em promoção (${activeCount})` : `Sem promoção (${books.length - activeCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Nenhum livro encontrado.</p>
        ) : filtered.map((book) => (
          <div key={book.id} className="flex items-center gap-4 px-4 py-3">
            <div className="relative h-12 w-9 flex-shrink-0 rounded overflow-hidden border border-border bg-secondary">
              {book.cover_url && <Image src={book.cover_url} alt={book.title} fill sizes="36px" className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{book.title}</p>
              <p className="text-xs text-muted-foreground">Preço normal: {formatCurrency(book.price)}</p>
            </div>
            <InlinePromo book={book} />
          </div>
        ))}
      </div>
    </div>
  );
}
