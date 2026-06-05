"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils/format";
import { Upload, Loader2, ArrowLeft, Save, UserPlus, X } from "lucide-react";

interface Author { id: string; name: string; bio: string | null; photo_url: string | null }
interface Category { id: string; name: string }
interface BookData {
  id: string;
  title: string;
  slug: string;
  author_id: string | null;
  category_id: string | null;
  cover_url: string | null;
  description_short: string | null;
  description_full: string | null;
  price: number;
  price_promotional: number | null;
  stock: number;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  pages: number | null;
  isbn: string | null;
  sku: string | null;
  publisher: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
}

interface Props {
  book: BookData | null;
  authors: Author[];
  categories: Category[];
}

export function BookForm({ book, authors: initialAuthors, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const authorPhotoRef = useRef<HTMLInputElement>(null);
  const newAuthorPhotoRef = useRef<HTMLInputElement>(null);

  // Book fields
  const [title, setTitle] = useState(book?.title ?? "");
  const [slug, setSlug] = useState(book?.slug ?? "");
  const [authorId, setAuthorId] = useState(book?.author_id ?? "");
  const [categoryId, setCategoryId] = useState(book?.category_id ?? "");
  const [descShort, setDescShort] = useState(book?.description_short ?? "");
  const [descFull, setDescFull] = useState(book?.description_full ?? "");
  const [price, setPrice] = useState(String(book?.price ?? ""));
  const [pricePromo, setPricePromo] = useState(String(book?.price_promotional ?? ""));
  const [stock, setStock] = useState(String(book?.stock ?? "0"));
  const [pages, setPages] = useState(String(book?.pages ?? ""));
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [sku, setSku] = useState(book?.sku ?? "");
  const [publisher, setPublisher] = useState(book?.publisher ?? "");
  const [weightGrams, setWeightGrams] = useState(String(book?.weight_grams ?? ""));
  const [isActive, setIsActive] = useState(book?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(book?.is_featured ?? false);
  const [isNew, setIsNew] = useState(book?.is_new ?? false);
  const [isBestseller, setIsBestseller] = useState(book?.is_bestseller ?? false);
  const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "");
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  // Author management
  const [authorsList, setAuthorsList] = useState<Author[]>(initialAuthors);
  const [newAuthorMode, setNewAuthorMode] = useState(false);
  const [authorSaving, setAuthorSaving] = useState(false);
  const [authorPhotoUploading, setAuthorPhotoUploading] = useState(false);

  // Editing existing author
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editAuthorBio, setEditAuthorBio] = useState("");
  const [editAuthorPhoto, setEditAuthorPhoto] = useState("");

  // Creating new author
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [newAuthorPhoto, setNewAuthorPhoto] = useState("");

  // Sync edit fields when selected author changes
  useEffect(() => {
    const found = authorsList.find((a) => a.id === authorId);
    setEditAuthorName(found?.name ?? "");
    setEditAuthorBio(found?.bio ?? "");
    setEditAuthorPhoto(found?.photo_url ?? "");
  }, [authorId, authorsList]);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!book) setSlug(slugify(v));
  }

  function handleCoverSelect(file: File) {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setPendingCoverFile(file);
  }

  async function handleAuthorPhotoUpload(file: File, isNew: boolean) {
    const setState = isNew ? setNewAuthorPhoto : setEditAuthorPhoto;
    setAuthorPhotoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const name = isNew ? newAuthorName : editAuthorName;
      const path = `${slugify(name || "autor")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("author-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("author-photos").getPublicUrl(path);
      setState(urlData.publicUrl);
      toast.success("Foto enviada!");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setAuthorPhotoUploading(false);
    }
  }

  async function handleSaveAuthor() {
    if (!authorId || !editAuthorName.trim()) return;
    setAuthorSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("authors").update({
        name: editAuthorName.trim(),
        slug: slugify(editAuthorName.trim()),
        bio: editAuthorBio || null,
        photo_url: editAuthorPhoto || null,
      }).eq("id", authorId);
      if (error) throw error;
      setAuthorsList((prev) =>
        prev.map((a) =>
          a.id === authorId
            ? { ...a, name: editAuthorName.trim(), bio: editAuthorBio || null, photo_url: editAuthorPhoto || null }
            : a
        )
      );
      toast.success("Autor atualizado!");
    } catch {
      toast.error("Erro ao salvar autor");
    } finally {
      setAuthorSaving(false);
    }
  }

  async function handleCreateAuthor() {
    if (!newAuthorName.trim()) {
      toast.error("Nome do autor é obrigatório");
      return;
    }
    setAuthorSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("authors").insert({
        name: newAuthorName.trim(),
        slug: slugify(newAuthorName.trim()),
        bio: newAuthorBio || null,
        photo_url: newAuthorPhoto || null,
      }).select("id, name, bio, photo_url").single();
      if (error) throw error;
      const created = data as Author;
      setAuthorsList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setAuthorId(created.id);
      setNewAuthorMode(false);
      setNewAuthorName("");
      setNewAuthorBio("");
      setNewAuthorPhoto("");
      toast.success("Autor criado!");
    } catch {
      toast.error("Erro ao criar autor");
    } finally {
      setAuthorSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !price) {
      toast.error("Título e preço são obrigatórios");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      let finalCoverUrl = coverUrl;
      if (pendingCoverFile) {
        const ext = pendingCoverFile.name.split(".").pop() ?? "jpg";
        const path = `${slugify(title || "livro")}-${Date.now()}.${ext}`;
        const { error, data } = await supabase.storage.from("book-covers").upload(path, pendingCoverFile, { upsert: true });
        if (error) { toast.error("Erro ao enviar capa"); return; }
        finalCoverUrl = supabase.storage.from("book-covers").getPublicUrl(data.path).data.publicUrl;
        setCoverUrl(finalCoverUrl);
        setPendingCoverFile(null);
        URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl("");
      }

      const payload = {
        title,
        slug,
        author_id: authorId || null,
        category_id: categoryId || null,
        cover_url: finalCoverUrl || null,
        description_short: descShort || null,
        description_full: descFull || null,
        price: parseFloat(price),
        price_promotional: pricePromo ? parseFloat(pricePromo) : null,
        stock: parseInt(stock) || 0,
        pages: pages ? parseInt(pages) : null,
        isbn: isbn || null,
        sku: sku || null,
        publisher: publisher || null,
        weight_grams: weightGrams ? parseInt(weightGrams) : null,
        is_active: isActive,
        is_featured: isFeatured,
        is_new: isNew,
        is_bestseller: isBestseller,
      };

      if (book) {
        const { error } = await supabase.from("books").update(payload).eq("id", book.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Livro atualizado!");
      } else {
        const { error } = await supabase.from("books").insert(payload);
        if (error) { toast.error(error.message); return; }
        toast.success("Livro criado!");
      }
      router.back();
    });
  }

  const selectedAuthor = authorsList.find((a) => a.id === authorId);

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" type="button" className="w-fit -mt-2 cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main fields */}
          <div className="lg:col-span-2 space-y-5">
            {/* Informações principais */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold">Informações principais</h3>

              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Título do livro"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="slug-do-livro"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc-short">Descrição curta</Label>
                <Textarea
                  id="desc-short"
                  value={descShort}
                  onChange={(e) => setDescShort(e.target.value)}
                  placeholder="Resumo em 1–2 frases"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc-full">Descrição completa</Label>
                <Textarea
                  id="desc-full"
                  value={descFull}
                  onChange={(e) => setDescFull(e.target.value)}
                  placeholder="Descrição completa do livro"
                  rows={5}
                />
              </div>
            </div>

            {/* Autor */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Autor</h3>
                {!newAuthorMode && (
                  <button
                    type="button"
                    onClick={() => setNewAuthorMode(true)}
                    className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-700 font-medium transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Novo autor
                  </button>
                )}
              </div>

              {newAuthorMode ? (
                /* ── Criação de novo autor ── */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2.5 bg-brand-50 rounded-lg border border-brand/20">
                    <UserPlus className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    <p className="text-xs text-brand-700 font-medium">Criando novo autor</p>
                    <button
                      type="button"
                      onClick={() => { setNewAuthorMode(false); setNewAuthorName(""); setNewAuthorBio(""); setNewAuthorPhoto(""); }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input
                      value={newAuthorName}
                      onChange={(e) => setNewAuthorName(e.target.value)}
                      placeholder="Nome do autor"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Biografia</Label>
                    <Textarea
                      value={newAuthorBio}
                      onChange={(e) => setNewAuthorBio(e.target.value)}
                      placeholder="Breve biografia do autor"
                      rows={3}
                    />
                  </div>

                  {/* Foto do novo autor */}
                  <div className="space-y-2">
                    <Label>Foto</Label>
                    <div className="flex items-center gap-3">
                      {newAuthorPhoto ? (
                        <div className="relative h-16 w-16 rounded-full overflow-hidden border border-border flex-shrink-0">
                          <Image src={newAuthorPhoto} alt="Foto" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center flex-shrink-0">
                          <Upload className="h-5 w-5 text-muted-foreground opacity-50" />
                        </div>
                      )}
                      <input
                        ref={newAuthorPhotoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAuthorPhotoUpload(f, true); }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => newAuthorPhotoRef.current?.click()}
                        disabled={authorPhotoUploading}
                        className="gap-1.5"
                      >
                        {authorPhotoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {newAuthorPhoto ? "Trocar foto" : "Upload foto"}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateAuthor}
                    disabled={authorSaving || !newAuthorName.trim()}
                    className="bg-brand hover:bg-brand-700 text-white gap-1.5"
                  >
                    {authorSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Criar autor
                  </Button>
                </div>
              ) : (
                /* ── Selecionar + editar autor existente ── */
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="author">Selecionar autor</Label>
                    <select
                      id="author"
                      value={authorId}
                      onChange={(e) => setAuthorId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Nenhum autor</option>
                      {authorsList.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedAuthor && (
                    <div className="space-y-4 pt-3 border-t border-border">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Dados do autor
                      </p>

                      <div className="space-y-1.5">
                        <Label>Nome</Label>
                        <Input
                          value={editAuthorName}
                          onChange={(e) => setEditAuthorName(e.target.value)}
                          placeholder="Nome do autor"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Biografia</Label>
                        <Textarea
                          value={editAuthorBio}
                          onChange={(e) => setEditAuthorBio(e.target.value)}
                          placeholder="Breve biografia do autor"
                          rows={3}
                        />
                      </div>

                      {/* Foto do autor existente */}
                      <div className="space-y-2">
                        <Label>Foto</Label>
                        <div className="flex items-center gap-3">
                          {editAuthorPhoto ? (
                            <div className="relative h-16 w-16 rounded-full overflow-hidden border border-border flex-shrink-0">
                              <Image src={editAuthorPhoto} alt="Foto" fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center flex-shrink-0">
                              <Upload className="h-5 w-5 text-muted-foreground opacity-50" />
                            </div>
                          )}
                          <input
                            ref={authorPhotoRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAuthorPhotoUpload(f, false); }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => authorPhotoRef.current?.click()}
                            disabled={authorPhotoUploading}
                            className="gap-1.5"
                          >
                            {authorPhotoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {editAuthorPhoto ? "Trocar foto" : "Upload foto"}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSaveAuthor}
                        disabled={authorSaving || !editAuthorName.trim()}
                        className="gap-1.5"
                      >
                        {authorSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Salvar autor
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preço e estoque */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold">Preço e estoque</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Preço *</Label>
                  <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.90" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price-promo">Preço promocional</Label>
                  <Input id="price-promo" type="number" step="0.01" value={pricePromo} onChange={(e) => setPricePromo(e.target.value)} placeholder="39.90" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="50" />
                </div>
              </div>
            </div>

            {/* Dados físicos e editoriais */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold">Dados físicos e editoriais</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pages">Páginas</Label>
                  <Input id="pages" type="number" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="200" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Peso (g)</Label>
                  <Input id="weight" type="number" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="300" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="LIV-001" />
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="publisher">Editora</Label>
                  <Input id="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Editora Jocum" />
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Cover upload */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Capa</h3>
              {(localPreviewUrl || coverUrl) ? (
                <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-border">
                  <Image src={localPreviewUrl || coverUrl} alt="Capa" fill className="object-cover" unoptimized={!!localPreviewUrl} />
                  {localPreviewUrl && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Não salvo
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[3/4] w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Nenhuma capa</p>
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoverSelect(file); }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {localPreviewUrl ? "Trocar capa" : "Selecionar capa"}
              </Button>
            </div>

            {/* Flags */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Configurações</h3>
              {[
                { label: "Ativo (visível na loja)", value: isActive, set: setIsActive },
                { label: "Destaque na home", value: isFeatured, set: setIsFeatured },
                { label: "Lançamento", value: isNew, set: setIsNew },
                { label: "Mais vendido", value: isBestseller, set: setIsBestseller },
              ].map((flag) => (
                <label key={flag.label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-foreground">{flag.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.value}
                    onClick={() => flag.set(!flag.value)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      flag.value ? "bg-brand" : "bg-input"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        flag.value ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>

            {/* Save button */}
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-700 text-white gap-2"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? "Salvando..." : book ? "Salvar alterações" : "Criar livro"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
