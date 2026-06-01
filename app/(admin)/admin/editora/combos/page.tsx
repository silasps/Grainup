"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ToggleLeft,
  ToggleRight,
  Star,
  Search,
  X as XIcon,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveCombo, deleteCombo, toggleComboActive, toggleComboFeatured, seedDefaultCombos } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type ComboRow = Database["public"]["Tables"]["combos"]["Row"];

interface BookInCombo {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
}

interface ComboWithItems extends ComboRow {
  combo_items: Array<{
    id: string;
    book_id: string;
    quantity: number;
    books: BookInCombo | null;
  }>;
}

interface BookOption {
  id: string;
  title: string;
  price: number;
  cover_url: string | null;
}

interface SelectedBook {
  book_id: string;
  title: string;
  price: number;
  quantity: number;
}

const schema = z.object({
  name: z.string().min(3, "Nome obrigatório (mín. 3 caracteres)"),
  slug: z.string().min(3, "Slug obrigatório"),
  description: z.string().optional(),
  discount_type: z.enum(["fixed", "percentage"]),
  discount_value: z.number().min(0, "Desconto inválido"),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

type FormData = z.infer<typeof schema>;

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ComboForm({
  initial,
  allBooks,
  onSave,
  onCancel,
}: {
  initial?: ComboWithItems;
  allBooks: BookOption[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      discount_type: "fixed" as const,
      discount_value: initial
        ? Math.max(0, initial.price_original - initial.price_promotional)
        : 0,
      is_active: initial?.is_active ?? true,
      is_featured: initial?.is_featured ?? false,
    },
  });

  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>(
    initial?.combo_items.map((item) => ({
      book_id: item.book_id,
      title: item.books?.title ?? "",
      price: item.books?.price ?? 0,
      quantity: item.quantity,
    })) ?? []
  );
  const [bookSearch, setBookSearch] = useState("");
  const [slugManual, setSlugManual] = useState(!!initial?.slug);

  const nameVal = watch("name");
  const isActive = watch("is_active");
  const isFeatured = watch("is_featured");
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value") ?? 0;

  const priceOriginal = useMemo(
    () => selectedBooks.reduce((sum, b) => sum + b.price, 0),
    [selectedBooks]
  );

  const pricePromotional = useMemo(() => {
    if (priceOriginal <= 0) return 0;
    if (discountType === "percentage") {
      return Math.max(0, priceOriginal * (1 - discountValue / 100));
    }
    return Math.max(0, priceOriginal - discountValue);
  }, [priceOriginal, discountType, discountValue]);

  useEffect(() => {
    if (!slugManual && nameVal) {
      setValue("slug", slugify(nameVal));
    }
  }, [nameVal, slugManual, setValue]);

  const filteredBooks = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const q = normalize(bookSearch);
    return allBooks.filter(
      (b) =>
        !selectedBooks.find((s) => s.book_id === b.id) &&
        (!q || normalize(b.title).includes(q))
    );
  }, [allBooks, selectedBooks, bookSearch]);

  function addBook(book: BookOption) {
    setSelectedBooks((prev) => [
      ...prev,
      { book_id: book.id, title: book.title, price: book.price, quantity: 1 },
    ]);
    setBookSearch("");
  }

  function removeBook(bookId: string) {
    setSelectedBooks((prev) => prev.filter((b) => b.book_id !== bookId));
  }

  async function onSubmit(data: FormData) {
    const { error } = await saveCombo(
      {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image_url: null,
        price_original: priceOriginal,
        price_promotional: pricePromotional,
        is_active: data.is_active,
        is_featured: data.is_featured,
      },
      selectedBooks.map((b) => ({ book_id: b.book_id, quantity: b.quantity })),
      initial?.id
    );
    if (error) {
      toast.error("Erro ao salvar combo", { description: error });
      return;
    }
    toast.success(initial ? "Combo atualizado!" : "Combo criado!");
    onSave();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5"
    >
      <h2 className="font-semibold text-foreground">
        {initial ? "Editar combo" : "Novo combo"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            placeholder="Ex: Kit Missões Mundiais"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="kit-missoes-mundiais"
            {...register("slug")}
            onChange={(e) => {
              setSlugManual(true);
              setValue("slug", slugify(e.target.value));
            }}
          />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="description">
            Descrição{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (opcional)
            </span>
          </Label>
          <Textarea
            id="description"
            rows={2}
            placeholder="Breve descrição do combo..."
            {...register("description")}
          />
        </div>

        {/* Preço original + Desconto — sub-grid alinhado pela base */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-4 items-end">

        <div className="flex flex-col gap-1.5">
          <Label>Preço original (soma dos livros)</Label>
          <div className="h-10 w-full flex items-center rounded-md border border-border bg-secondary/40 px-3 text-sm font-semibold text-foreground">
            {priceOriginal > 0
              ? formatCurrency(priceOriginal)
              : <span className="text-muted-foreground font-normal">Adicione livros acima</span>}
          </div>
        </div>

        {/* Desconto */}
        <div className="flex flex-col gap-1.5">
          <Label>Desconto</Label>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border overflow-hidden shrink-0">
              {(["fixed", "percentage"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue("discount_type", t)}
                  className={`px-3 h-10 text-sm font-medium transition-colors ${
                    discountType === t
                      ? "bg-brand text-white"
                      : "bg-white text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {t === "fixed" ? "R$" : "%"}
                </button>
              ))}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discountType === "percentage" ? 100 : undefined}
              placeholder={discountType === "percentage" ? "Ex: 15" : "Ex: 30,00"}
              {...register("discount_value", { valueAsNumber: true })}
            />
          </div>
          {errors.discount_value && (
            <p className="text-xs text-destructive">{errors.discount_value.message}</p>
          )}
        </div>

        </div>{/* fim sub-grid preço + desconto */}

        {/* Preço promocional — read-only, calculado */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label>Preço promocional (calculado)</Label>
          <div className={`h-10 flex items-center justify-between rounded-md border px-3 text-sm font-semibold ${
            pricePromotional > 0 && priceOriginal > 0
              ? "border-brand/40 bg-brand/5 text-brand"
              : "border-border bg-secondary/40 text-muted-foreground font-normal"
          }`}>
            <span>
              {pricePromotional > 0 && priceOriginal > 0
                ? formatCurrency(pricePromotional)
                : "—"}
            </span>
            {pricePromotional > 0 && priceOriginal > 0 && discountValue > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                economia de {formatCurrency(priceOriginal - pricePromotional)}
              </span>
            )}
          </div>
        </div>

        <div className="sm:col-span-2 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setValue("is_active", !isActive)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            {isActive ? (
              <ToggleRight className="h-6 w-6 text-brand" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
            {isActive ? "Ativo" : "Inativo"}
          </button>

          <button
            type="button"
            onClick={() => setValue("is_featured", !isFeatured)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Star
              className={`h-5 w-5 ${
                isFeatured
                  ? "text-amber-500 fill-amber-400"
                  : "text-muted-foreground"
              }`}
            />
            {isFeatured ? "Destaque" : "Sem destaque"}
          </button>
        </div>

        {/* Livros do combo */}
        <div className="sm:col-span-2 flex flex-col gap-2">
          <Label>
            Livros do combo{" "}
            <span className="text-muted-foreground font-normal text-xs">
              ({selectedBooks.length} selecionado
              {selectedBooks.length !== 1 ? "s" : ""})
            </span>
          </Label>

          {selectedBooks.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-1">
              {selectedBooks.map((book) => (
                <div
                  key={book.book_id}
                  className="flex items-center gap-3 bg-secondary/40 rounded-lg px-3 py-2"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm font-medium truncate">
                    {book.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatCurrency(book.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBook(book.book_id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="Buscar livro para adicionar..."
              className="pl-9"
            />
            {bookSearch && (
              <button
                type="button"
                onClick={() => setBookSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {bookSearch && filteredBooks.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-sm">
              {filteredBooks.slice(0, 8).map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => addBook(book)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 border-b border-border last:border-0 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="flex-1 truncate">{book.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatCurrency(book.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {bookSearch && filteredBooks.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">
              Nenhum livro encontrado.
            </p>
          )}
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

export default function CombosAdminPage() {
  const supabase = createClient();
  const [combos, setCombos] = useState<ComboWithItems[]>([]);
  const [allBooks, setAllBooks] = useState<BookOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ComboWithItems | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: combosData }, { data: booksData }] = await Promise.all([
      supabase
        .from("combos")
        .select(
          "*, combo_items(id, book_id, quantity, books(id, title, price, cover_url))"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("books")
        .select("id, title, price, cover_url")
        .eq("is_active", true)
        .order("title"),
    ]);
    setCombos((combosData as ComboWithItems[]) ?? []);
    setAllBooks((booksData as BookOption[]) ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function handleSeed() {
    setSeeding(true);
    const { error } = await seedDefaultCombos();
    setSeeding(false);
    if (error) {
      toast.error("Erro ao semear combos", { description: error });
      return;
    }
    toast.success("4 combos padrão criados!");
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await deleteCombo(id);
    if (error) {
      toast.error("Erro ao remover combo");
      return;
    }
    toast.success("Combo removido");
    setCombos((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggleActive(combo: ComboWithItems) {
    const { error } = await toggleComboActive(combo.id, !combo.is_active);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    setCombos((prev) =>
      prev.map((c) =>
        c.id === combo.id ? { ...c, is_active: !c.is_active } : c
      )
    );
  }

  async function handleToggleFeatured(combo: ComboWithItems) {
    const { error } = await toggleComboFeatured(combo.id, !combo.is_featured);
    if (error) {
      toast.error("Erro ao atualizar destaque");
      return;
    }
    setCombos((prev) =>
      prev.map((c) =>
        c.id === combo.id ? { ...c, is_featured: !c.is_featured } : c
      )
    );
  }

  const totalActive = combos.filter((c) => c.is_active).length;
  const totalFeatured = combos.filter((c) => c.is_featured).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Combos"
        subtitle={`${combos.length} combo${combos.length !== 1 ? "s" : ""} cadastrado${combos.length !== 1 ? "s" : ""}`}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: combos.length },
            { label: "Ativos", value: totalActive },
            { label: "Destaque", value: totalFeatured },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-border p-4"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {!showForm && !editing && (
          <div className="flex justify-end">
            <Button
              className="bg-brand hover:bg-brand-700 text-white gap-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" /> Novo combo
            </Button>
          </div>
        )}

        {showForm && (
          <ComboForm
            allBooks={allBooks}
            onSave={() => {
              load();
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editing && (
          <ComboForm
            initial={editing}
            allBooks={allBooks}
            onSave={() => {
              load();
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : combos.length === 0 && !showForm ? (
          <div className="bg-white border border-border rounded-xl p-10 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">
              Nenhum combo cadastrado
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Crie combos temáticos com preço especial para a loja.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding && <Loader2 className="h-4 w-4 animate-spin" />}
                Semear 4 combos padrão
              </Button>
              <Button
                className="bg-brand hover:bg-brand-700 text-white gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" /> Criar primeiro combo
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                      Nome
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white hidden md:table-cell">
                      Livros
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                      Preço
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground bg-white">
                      Ativo
                    </th>
                    <th className="px-5 py-3 bg-white" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {combos.map((combo) => {
                    const discount =
                      combo.price_original - combo.price_promotional;
                    return (
                      <tr
                        key={combo.id}
                        className="hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground line-clamp-1">
                            {combo.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            /{combo.slug}
                          </p>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {combo.combo_items.length} livro
                            {combo.combo_items.length !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-foreground text-sm">
                            {formatCurrency(combo.price_promotional)}
                          </p>
                          {discount > 0 && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(combo.price_original)}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={combo.is_active}
                            onClick={() => handleToggleActive(combo)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                              combo.is_active ? "bg-brand" : "bg-input"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                                combo.is_active ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(combo);
                                setShowForm(false);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(combo.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        )}
      </main>
    </div>
  );
}
