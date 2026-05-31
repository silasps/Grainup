"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { Search, X, Tag, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface OfferRow {
  id: string;
  name: string;
  type: "book" | "combo" | "category" | "shipping";
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  book_id: string | null;
  combo_id: string | null;
  category_id: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  book: "Livro",
  combo: "Combo",
  category: "Categoria",
  shipping: "Frete",
};

const TYPE_COLORS: Record<string, string> = {
  book: "bg-blue-50 text-blue-700",
  combo: "bg-purple-50 text-purple-700",
  category: "bg-amber-50 text-amber-700",
  shipping: "bg-emerald-50 text-emerald-700",
};

function formatDiscount(type: string, value: number) {
  return type === "percentage" ? `${value}% off` : `${formatCurrency(value)} off`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

interface Props {
  offers: OfferRow[];
  books: { id: string; title: string }[];
  categories: { id: string; name: string }[];
}

export function OfertasTable({ offers, books, categories }: Props) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const router = useRouter();
  const supabase = createClient();

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (filterType !== "all" && o.type !== filterType) return false;
      if (filterStatus === "active" && !o.is_active) return false;
      if (filterStatus === "inactive" && o.is_active) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!o.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [offers, query, filterType, filterStatus]);

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("offers").update({ is_active: !current }).eq("id", id);
    router.refresh();
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: offers.length },
          { label: "Ativas", value: offers.filter((o) => o.is_active).length },
          { label: "Inativas", value: offers.filter((o) => !o.is_active).length },
          { label: "Filtradas", value: filtered.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none cursor-pointer"
        >
          <option value="all">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none cursor-pointer"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-360px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Desconto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Vigência</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
                <th className="px-5 py-3 bg-white" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {query || filterType !== "all" || filterStatus !== "all"
                      ? "Nenhuma oferta encontrada para os filtros aplicados."
                      : "Nenhuma oferta cadastrada."}
                  </td>
                </tr>
              ) : (
                filtered.map((offer) => {
                  const bookName = offer.book_id ? books.find((b) => b.id === offer.book_id)?.title : null;
                  const catName = offer.category_id ? categories.find((c) => c.id === offer.category_id)?.name : null;
                  const target = bookName ?? catName ?? (offer.type === "shipping" ? "Frete" : "Combo");

                  return (
                    <tr key={offer.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground line-clamp-1">{offer.name}</p>
                        {target && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{target}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[offer.type] ?? ""}`}>
                          {TYPE_LABELS[offer.type] ?? offer.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-brand text-xs">
                          {formatDiscount(offer.discount_type, offer.discount_value)}
                        </p>
                        {offer.min_order_value && (
                          <p className="text-[10px] text-muted-foreground">
                            mín. {formatCurrency(offer.min_order_value)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(offer.starts_at)} → {formatDate(offer.ends_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={offer.is_active ? "default" : "secondary"}
                          className={offer.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs" : "text-xs"}
                        >
                          {offer.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleActive(offer.id, offer.is_active)}
                        >
                          {offer.is_active ? "Desativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
