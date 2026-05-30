"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

type ReviewStatus = "pendente" | "aprovada" | "rejeitada";

interface ReviewRow {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  created_at: string;
  books: { title: string; slug: string } | null;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

const STATUS_CLASS: Record<ReviewStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  aprovada: "bg-emerald-100 text-emerald-700",
  rejeitada: "bg-red-100 text-red-700",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
    </span>
  );
}

export default function AdminAvaliacoesPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | "all">("all");
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, book_id, user_id, rating, title, body, status, created_at, books(title, slug)")
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as unknown as ReviewRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: ReviewStatus) {
    const supabase = createClient();
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "aprovada" ? "Avaliação aprovada" : "Avaliação rejeitada");
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    startTransition(() => router.refresh());
  }

  const filtered = reviews.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const book = (r.books as { title: string } | null)?.title ?? "";
      if (!book.toLowerCase().includes(q) && !(r.title ?? "").toLowerCase().includes(q) && !(r.body ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pending = reviews.filter((r) => r.status === "pendente").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Avaliações"
        subtitle={loading ? "Carregando..." : `${reviews.length} avaliações${pending > 0 ? ` · ${pending} pendentes` : ""}`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por livro ou comentário..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {(["all", "pendente", "aprovada", "rejeitada"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-brand text-white"
                    : "bg-white border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "Todas" : STATUS_LABEL[s]}
                {s === "pendente" && pending > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1 rounded-full">{pending}</span>
                )}
              </button>
            ))}
          </div>
          {(query || filterStatus !== "all") && (
            <span className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border shadow-sm">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Livro</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Nota</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">Comentário</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">Status</th>
                  <th className="px-5 py-3 bg-white" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Carregando...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      {query || filterStatus !== "all" ? "Nenhuma avaliação encontrada." : "Nenhuma avaliação ainda."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((review) => {
                    const book = review.books as { title: string } | null;
                    return (
                      <tr key={review.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium line-clamp-1 max-w-[180px]">{book?.title ?? "—"}</p>
                        </td>
                        <td className="px-5 py-3">
                          <Stars rating={review.rating} />
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell max-w-xs">
                          {review.title && <p className="font-medium text-xs mb-0.5">{review.title}</p>}
                          {review.body && <p className="text-xs text-muted-foreground line-clamp-2">{review.body}</p>}
                          {!review.title && !review.body && <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          {new Intl.DateTimeFormat("pt-BR").format(new Date(review.created_at))}
                        </td>
                        <td className="px-5 py-3">
                          <Badge className={`text-xs ${STATUS_CLASS[review.status]}`} variant="secondary">
                            {STATUS_LABEL[review.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 justify-end">
                            {review.status !== "aprovada" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                onClick={() => updateStatus(review.id, "aprovada")}
                                title="Aprovar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {review.status !== "rejeitada" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                onClick={() => updateStatus(review.id, "rejeitada")}
                                title="Rejeitar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
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
    </div>
  );
}
