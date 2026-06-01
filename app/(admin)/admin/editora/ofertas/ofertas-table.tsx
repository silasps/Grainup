"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/format";
import {
  Search,
  X,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { saveOffer, deleteOffer, toggleOffer, importPromotionalBooks } from "./actions";
import { toast } from "sonner";

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
  return type === "percentage"
    ? `${value}% off`
    : `${formatCurrency(value)} off`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

const offerSchema = z.object({
  name: z.string().min(3, "Nome obrigatório"),
  type: z.enum(["book", "combo", "category", "shipping"]),
  book_id: z.string().nullable().optional(),
  combo_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0.01, "Desconto obrigatório"),
  min_order_value: z.number().nullable().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.boolean(),
});

type OfferFormData = z.infer<typeof offerSchema>;

interface ComboOption {
  id: string;
  name: string;
}

function OfertaForm({
  initial,
  books,
  categories,
  combos,
  onSave,
  onCancel,
}: {
  initial?: OfferRow;
  books: { id: string; title: string }[];
  categories: { id: string; name: string }[];
  combos: ComboOption[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "book",
      book_id: initial?.book_id ?? null,
      combo_id: initial?.combo_id ?? null,
      category_id: initial?.category_id ?? null,
      discount_type: initial?.discount_type ?? "fixed",
      discount_value: initial?.discount_value ?? 0,
      min_order_value: initial?.min_order_value ?? null,
      starts_at: initial?.starts_at ? initial.starts_at.slice(0, 16) : "",
      ends_at: initial?.ends_at ? initial.ends_at.slice(0, 16) : "",
      is_active: initial?.is_active ?? true,
    },
  });

  const type = watch("type");
  const discountType = watch("discount_type");
  const isActive = watch("is_active");

  async function onSubmit(data: OfferFormData) {
    const payload = {
      name: data.name,
      type: data.type,
      book_id: data.type === "book" ? (data.book_id ?? null) : null,
      combo_id: data.type === "combo" ? (data.combo_id ?? null) : null,
      category_id:
        data.type === "category" ? (data.category_id ?? null) : null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_value: data.min_order_value || null,
      starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      is_active: data.is_active,
    };

    const { error } = await saveOffer(payload, initial?.id);
    if (error) {
      toast.error("Erro ao salvar oferta", { description: error });
      return;
    }
    toast.success(initial ? "Oferta atualizada!" : "Oferta criada!");
    onSave();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5"
    >
      <h2 className="font-semibold text-foreground">
        {initial ? "Editar oferta" : "Nova oferta"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="o-name">Nome</Label>
          <Input
            id="o-name"
            placeholder="Ex: Desconto Kit Missões"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <div className="flex gap-2 flex-wrap">
            {(["book", "combo", "category", "shipping"] as const).map((t) => (
              <label
                key={t}
                className={`flex-1 min-w-[80px] text-center py-2 px-3 rounded-lg text-sm cursor-pointer transition-all border ${
                  type === t
                    ? "border-brand bg-brand text-white font-semibold"
                    : "border-border text-muted-foreground hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  value={t}
                  {...register("type")}
                  onChange={() => setValue("type", t)}
                  className="sr-only"
                />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        {type === "book" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-book">Livro</Label>
            <select
              id="o-book"
              {...register("book_id")}
              className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">Selecionar livro...</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === "combo" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-combo">Combo</Label>
            <select
              id="o-combo"
              {...register("combo_id")}
              className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">Selecionar combo...</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === "category" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-cat">Categoria</Label>
            <select
              id="o-cat"
              {...register("category_id")}
              className="h-10 rounded-md border border-border bg-white pl-3 pr-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">Selecionar categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Tipo de desconto</Label>
          <div className="flex gap-2">
            {(["fixed", "percentage"] as const).map((dt) => (
              <label
                key={dt}
                className={`flex-1 text-center py-2 px-3 rounded-lg text-sm cursor-pointer transition-all border ${
                  discountType === dt
                    ? "border-brand bg-brand text-white font-semibold"
                    : "border-border text-muted-foreground hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  value={dt}
                  {...register("discount_type")}
                  onChange={() => setValue("discount_type", dt)}
                  className="sr-only"
                />
                {dt === "fixed" ? "Valor fixo" : "Percentual"}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="o-discount">
            {discountType === "percentage" ? "Desconto (%)" : "Desconto (R$)"}
          </Label>
          <Input
            id="o-discount"
            type="number"
            step="0.01"
            min="0"
            {...register("discount_value", { valueAsNumber: true })}
          />
          {errors.discount_value && (
            <p className="text-xs text-destructive">
              {errors.discount_value.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="o-min">
            Pedido mínimo (R$){" "}
            <span className="text-muted-foreground font-normal text-xs">
              (opcional)
            </span>
          </Label>
          <Input
            id="o-min"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register("min_order_value", { valueAsNumber: true })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="o-start">
            Início{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (opcional)
            </span>
          </Label>
          <Input id="o-start" type="datetime-local" {...register("starts_at")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="o-end">
            Fim{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (opcional)
            </span>
          </Label>
          <Input id="o-end" type="datetime-local" {...register("ends_at")} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setValue("is_active", !isActive)}
            className="text-brand"
          >
            {isActive ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <span className="text-sm font-medium text-foreground">
            {isActive ? "Ativa (aplicada na loja)" : "Inativa"}
          </span>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-brand hover:bg-brand-700 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

interface Props {
  offers: OfferRow[];
  books: { id: string; title: string }[];
  categories: { id: string; name: string }[];
}

export function OfertasTable({ offers: initialOffers, books, categories }: Props) {
  const [offers, setOffers] = useState<OfferRow[]>(initialOffers);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [combos, setCombos] = useState<ComboOption[]>([]);
  const [importing, setImporting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("combos")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setCombos(data ?? []));
  }, [supabase]);

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

  async function handleToggle(id: string, current: boolean) {
    await toggleOffer(id, !current);
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, is_active: !current } : o))
    );
  }

  async function handleDelete(id: string) {
    const { error } = await deleteOffer(id);
    if (error) {
      toast.error("Erro ao remover oferta");
      return;
    }
    toast.success("Oferta removida");
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  async function handleImport() {
    setImporting(true);
    const { error, imported } = await importPromotionalBooks();
    setImporting(false);
    if (error) {
      toast.error("Erro ao importar", { description: error });
      return;
    }
    if (imported === 0) {
      toast.info("Nenhuma oferta nova para importar", {
        description: "Todos os livros em promoção já têm oferta cadastrada.",
      });
      return;
    }
    toast.success(`${imported} oferta${imported !== 1 ? "s" : ""} importada${imported !== 1 ? "s" : ""}!`, {
      description: "Livros com preço promocional foram criados como ofertas.",
    });
    router.refresh();
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
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

      {/* Form */}
      {showForm && (
        <div className="mb-6">
          <OfertaForm
            books={books}
            categories={categories}
            combos={combos}
            onSave={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <OfertaForm
            initial={editing}
            books={books}
            categories={categories}
            combos={combos}
            onSave={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Filters + Actions */}
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
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
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
            <option key={v} value={v}>
              {l}
            </option>
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

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Importar promoções
          </Button>

          {!showForm && !editing && (
            <Button
              className="bg-brand hover:bg-brand-700 text-white gap-1.5 text-xs"
              size="sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Nova oferta
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-420px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border shadow-sm">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                  Nome
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">
                  Tipo
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                  Desconto
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden lg:table-cell">
                  Vigência
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                  Status
                </th>
                <th className="px-5 py-3 bg-white" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {query || filterType !== "all" || filterStatus !== "all"
                      ? "Nenhuma oferta encontrada para os filtros aplicados."
                      : "Nenhuma oferta cadastrada."}
                  </td>
                </tr>
              ) : (
                filtered.map((offer) => {
                  const bookName = offer.book_id
                    ? books.find((b) => b.id === offer.book_id)?.title
                    : null;
                  const catName = offer.category_id
                    ? categories.find((c) => c.id === offer.category_id)?.name
                    : null;
                  const comboName = offer.combo_id
                    ? combos.find((c) => c.id === offer.combo_id)?.name
                    : null;
                  const target =
                    bookName ??
                    catName ??
                    comboName ??
                    (offer.type === "shipping" ? "Frete" : null);

                  return (
                    <tr
                      key={offer.id}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground line-clamp-1">
                          {offer.name}
                        </p>
                        {target && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {target}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${TYPE_COLORS[offer.type] ?? ""}`}
                        >
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
                          className={
                            offer.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
                              : "text-xs"
                          }
                        >
                          {offer.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-muted-foreground"
                            onClick={() => handleToggle(offer.id, offer.is_active)}
                          >
                            {offer.is_active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditing(offer);
                              setShowForm(false);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(offer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
  );
}
