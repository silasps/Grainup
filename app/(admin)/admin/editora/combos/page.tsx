"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ExternalLink,
  ImageIcon,
  Upload,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveCombo, deleteCombo, toggleComboActive, toggleComboFeatured, seedDefaultCombos } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type ComboRow = Database["public"]["Tables"]["combos"]["Row"];

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1600;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas não suportado")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha")), "image/jpeg", 0.82);
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = url;
  });
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `combos/${Date.now()}.jpg`;
  const fd = new FormData();
  fd.append("file", new File([blob], path, { type: "image/jpeg" }));
  fd.append("bucket", "images");
  fd.append("path", path);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha no upload");
  return json.url as string;
}

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
  price_promotional: z.number().min(0.01, "Informe o preço do combo"),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  bling_product_id: z.union([z.number().int().positive(), z.nan()]).optional().nullable(),
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      price_promotional: initial?.price_promotional ?? undefined,
      is_active: initial?.is_active ?? true,
      is_featured: initial?.is_featured ?? false,
      bling_product_id: initial?.bling_product_id ?? null,
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
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File) {
    const local = URL.createObjectURL(file);
    setImageUrl(local);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      URL.revokeObjectURL(local);
      setImageUrl(url);
    } catch (e) {
      toast.error("Erro ao enviar imagem", { description: (e as Error).message });
      URL.revokeObjectURL(local);
      setImageUrl(initial?.image_url ?? null);
    } finally {
      setUploading(false);
    }
  }

  const nameVal = watch("name");
  const isActive = watch("is_active");
  const isFeatured = watch("is_featured");
  const pricePromotionalVal = watch("price_promotional") ?? 0;

  const initialBookIds = useMemo(
    () => (initial?.combo_items ?? []).map((i) => i.book_id).sort().join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialImageUrl = initial?.image_url ?? null;

  const hasChanges =
    isDirty ||
    selectedBooks.map((b) => b.book_id).sort().join(",") !== initialBookIds ||
    imageUrl !== initialImageUrl;

  const [showBackConfirm, setShowBackConfirm] = useState(false);

  function handleBack() {
    if (hasChanges) {
      setShowBackConfirm(true);
    } else {
      onCancel();
    }
  }

  const priceOriginal = useMemo(
    () => selectedBooks.reduce((sum, b) => sum + b.price, 0),
    [selectedBooks]
  );

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
        image_url: imageUrl,
        price_original: priceOriginal,
        price_promotional: data.price_promotional,
        discount_type: "fixed",
        is_active: data.is_active,
        is_featured: data.is_featured,
        bling_product_id: data.bling_product_id && !isNaN(data.bling_product_id) ? data.bling_product_id : null,
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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <h2 className="font-semibold text-foreground">
          {initial ? "Editar combo" : "Novo combo"}
        </h2>
      </div>

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
          {watch("slug") && (
            <Link
              href={`/editora/combos/${watch("slug")}`}
              target="_blank"
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              /editora/combos/{watch("slug")}
            </Link>
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

        {/* Imagem de fundo do card */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label>
            Imagem do card{" "}
            <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
          />
          {imageUrl ? (
            <div className="flex flex-col gap-2">
              {/* preview simulando o header do card */}
              <div className="relative w-full h-[112px] rounded-xl overflow-hidden bg-foreground">
                <Image src={imageUrl} alt="" fill className="object-cover object-center opacity-30" sizes="600px" unoptimized />
                <div className="relative flex items-start gap-3 p-4">
                  <div className="bg-brand rounded-lg p-2 shrink-0">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Prévia do header</p>
                    <p className="text-white/60 text-xs">Aparece com 30% de opacidade sobre o fundo escuro</p>
                  </div>
                  {uploading && <Loader2 className="h-4 w-4 text-white animate-spin ml-auto" />}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Trocar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)} className="text-destructive gap-1.5">
                  <XIcon className="h-3.5 w-3.5" /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-5 cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-colors"
            >
              {uploading ? <Loader2 className="h-6 w-6 text-brand animate-spin shrink-0" /> : <ImageIcon className="h-6 w-6 text-muted-foreground/50 shrink-0" />}
              <div>
                <p className="text-sm font-medium text-foreground">{uploading ? "Enviando…" : "Clique para adicionar imagem de fundo"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ideal: <strong>800 × 240 px</strong> (proporção ~3:1). A imagem aparecerá com 30% de opacidade sobre o fundo escuro do card. JPG, PNG ou WebP.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preços */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Soma dos livros</Label>
            <div className="h-10 w-full flex items-center rounded-md border border-border bg-secondary/40 px-3 text-sm font-semibold text-foreground">
              {priceOriginal > 0
                ? formatCurrency(priceOriginal)
                : <span className="text-muted-foreground font-normal">Adicione livros abaixo</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price_promotional">Preço do combo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">R$</span>
              <Input
                id="price_promotional"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                className="pl-9"
                {...register("price_promotional", {
                  valueAsNumber: true,
                  setValueAs: (v) => {
                    const n = parseFloat(v);
                    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
                  },
                })}
              />
            </div>
            {errors.price_promotional && (
              <p className="text-xs text-destructive">{errors.price_promotional.message}</p>
            )}
            {pricePromotionalVal > 0 && priceOriginal > pricePromotionalVal && (
              <p className="text-xs text-emerald-600 font-medium">
                economia de {formatCurrency(priceOriginal - pricePromotionalVal)}
              </p>
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

      {/* Integração Bling */}
      <div className="flex flex-col gap-3 border border-border rounded-xl p-4 bg-secondary/20">
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <Label htmlFor="bling_product_id" className="flex items-center gap-2">
              ID do produto no Bling
              <span className="text-muted-foreground font-normal text-xs">(opcional — necessário para NF-e)</span>
            </Label>
            <Input
              id="bling_product_id"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 123456789"
              className="max-w-xs"
              {...register("bling_product_id", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              ID do produto com composição criado no Bling. Quando preenchido, os pedidos com este combo são enviados ao Bling com cada livro como linha individual (preço proporcional), permitindo a emissão correta da NF-e.
            </p>
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-brand hover:text-brand/80 select-none list-none flex items-center gap-1">
            <span className="group-open:hidden">▶ Como criar o produto composição no Bling</span>
            <span className="hidden group-open:inline">▼ Como criar o produto composição no Bling</span>
          </summary>
          <ol className="mt-3 flex flex-col gap-2 text-xs text-foreground">
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">1.</span>
              <span>No Bling, acesse <strong>Produtos → Cadastrar produto</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">2.</span>
              <span>Preencha o nome (igual ao combo), o SKU e defina o preço igual ao <strong>preço do combo</strong> ({pricePromotionalVal > 0 ? formatCurrency(pricePromotionalVal) : "informado acima"}).</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">3.</span>
              <span>Em <strong>Tipo</strong>, selecione <strong>Composição (Kit)</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">4.</span>
              <span>Na aba <strong>Componentes</strong>, adicione cada livro do combo pelo SKU com a quantidade correspondente.</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">5.</span>
              <span>Em <strong>Tipo de estoque</strong>, selecione <strong>Virtual</strong>. Em <strong>Lançamento de estoque</strong>, selecione <strong>Somente componentes</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">6.</span>
              <span>Salve o produto. O ID aparece na URL: <code className="bg-muted px-1 rounded">bling.com.br/produtos/<strong>123456789</strong></code></span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-brand">7.</span>
              <span>Cole o ID no campo acima e salve o combo.</span>
            </li>
          </ol>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>Importante:</strong> no Bling, acesse <strong>Configurações → Vendas</strong> e ative <strong>&ldquo;Desmembrar produtos com composição na nota fiscal&rdquo;</strong>. Isso faz a NF-e listar cada livro separadamente, como exige a legislação fiscal (SEFAZ/SP Consulta 19383/2019).
          </div>
        </details>
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

      <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterações não salvas</DialogTitle>
            <DialogDescription>
              Você fez alterações neste combo que ainda não foram salvas. Se voltar agora, essas alterações serão perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBackConfirm(false)}>
              Continuar editando
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowBackConfirm(false); onCancel(); }}
            >
              Descartar e voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        {!showForm && !editing && (
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
        )}

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
                          <Link
                            href={`/editora/combos/${combo.slug}`}
                            target="_blank"
                            className="text-xs text-brand hover:underline flex items-center gap-1 mt-0.5"
                          >
                            /editora/combos/{combo.slug}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
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
