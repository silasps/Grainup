"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, HelpCircle, ChevronDown, ChevronUp, Star, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveCategory, deleteCategory, saveFaq, deleteFaq, toggleFaq } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["faq_categories"]["Row"];
type Faq = Database["public"]["Tables"]["faqs"]["Row"];

const catSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  position: z.coerce.number(),
});

const faqSchema = z.object({
  category_id: z.string().nullable(),
  question: z.string().min(5, "Pergunta obrigatória"),
  answer: z.string().min(5, "Resposta obrigatória"),
  position: z.coerce.number(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

type CatForm = z.infer<typeof catSchema>;
type FaqForm = z.infer<typeof faqSchema>;

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function FaqAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  // FAQ form state
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [savingFaq, setSavingFaq] = useState(false);

  const catForm = useForm<CatForm>({ resolver: zodResolver(catSchema), defaultValues: { name: "", slug: "", position: 0 } });
  const faqForm = useForm<FaqForm>({
    resolver: zodResolver(faqSchema),
    defaultValues: { category_id: null, question: "", answer: "", position: 0, is_active: true, is_featured: false },
  });

  async function load() {
    const supabase = createClient();
    const [{ data: cats }, { data: faqsData }] = await Promise.all([
      supabase.from("faq_categories").select("*").order("position"),
      supabase.from("faqs").select("*").order("position"),
    ]);
    setCategories(cats ?? []);
    setFaqs(faqsData ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Category CRUD
  function openNewCat() {
    setEditingCat(null);
    catForm.reset({ name: "", slug: "", position: categories.length });
    setShowCatForm(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    catForm.reset({ name: cat.name, slug: cat.slug, position: cat.position });
    setShowCatForm(true);
  }

  async function submitCat(data: CatForm) {
    setSavingCat(true);
    const res = await saveCategory({ ...data, id: editingCat?.id });
    setSavingCat(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(editingCat ? "Categoria atualizada" : "Categoria criada");
    setShowCatForm(false);
    load();
  }

  async function handleDeleteCat(id: string) {
    if (!confirm("Excluir categoria? As FAQs serão desvinculadas.")) return;
    const res = await deleteCategory(id);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Categoria excluída");
    load();
  }

  // FAQ CRUD
  function openNewFaq(categoryId?: string) {
    setEditingFaq(null);
    faqForm.reset({
      category_id: categoryId ?? null,
      question: "",
      answer: "",
      position: faqs.filter((f) => f.category_id === (categoryId ?? null)).length,
      is_active: true,
      is_featured: false,
    });
    setShowFaqForm(true);
  }

  function openEditFaq(faq: Faq) {
    setEditingFaq(faq);
    faqForm.reset({
      category_id: faq.category_id,
      question: faq.question,
      answer: faq.answer,
      position: faq.position,
      is_active: faq.is_active,
      is_featured: faq.is_featured,
    });
    setShowFaqForm(true);
  }

  async function submitFaq(data: FaqForm) {
    setSavingFaq(true);
    const res = await saveFaq({ ...data, id: editingFaq?.id });
    setSavingFaq(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(editingFaq ? "FAQ atualizada" : "FAQ criada");
    setShowFaqForm(false);
    load();
  }

  async function handleDeleteFaq(id: string) {
    if (!confirm("Excluir esta FAQ?")) return;
    const res = await deleteFaq(id);
    if (res.error) { toast.error(res.error); return; }
    toast.success("FAQ excluída");
    load();
  }

  async function handleToggle(id: string, field: "is_active" | "is_featured", current: boolean) {
    const res = await toggleFaq(id, field, !current);
    if (res.error) { toast.error(res.error); return; }
    load();
  }

  const uncategorized = faqs.filter((f) => !f.category_id);

  if (loading) return null;

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="FAQ"
        description="Gerencie perguntas frequentes agrupadas por categoria"
        icon={<HelpCircle className="h-5 w-5" />}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openNewCat}>
              <Plus className="h-4 w-4 mr-1" /> Categoria
            </Button>
            <Button size="sm" onClick={() => openNewFaq()}>
              <Plus className="h-4 w-4 mr-1" /> FAQ
            </Button>
          </div>
        }
      />

      {/* Category form */}
      {showCatForm && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium mb-4">{editingCat ? "Editar categoria" : "Nova categoria"}</h3>
          <form onSubmit={catForm.handleSubmit(submitCat)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Nome</Label>
              <Input
                {...catForm.register("name")}
                placeholder="Pagamento"
                onChange={(e) => {
                  catForm.setValue("name", e.target.value);
                  if (!editingCat) catForm.setValue("slug", slugify(e.target.value));
                }}
              />
              {catForm.formState.errors.name && <p className="text-xs text-destructive">{catForm.formState.errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Label>Slug</Label>
              <Input {...catForm.register("slug")} placeholder="pagamento" />
              {catForm.formState.errors.slug && <p className="text-xs text-destructive">{catForm.formState.errors.slug.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Label>Posição</Label>
              <Input type="number" {...catForm.register("position")} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowCatForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCat}>
                {savingCat && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* FAQ form */}
      {showFaqForm && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium mb-4">{editingFaq ? "Editar FAQ" : "Nova FAQ"}</h3>
          <form onSubmit={faqForm.handleSubmit(submitFaq)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <Label>Categoria</Label>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  {...faqForm.register("category_id")}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Posição</Label>
                <Input type="number" {...faqForm.register("position")} />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...faqForm.register("is_active")} />
                  Ativa
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...faqForm.register("is_featured")} />
                  Destaque
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Pergunta</Label>
              <Input {...faqForm.register("question")} placeholder="Como faço para..." />
              {faqForm.formState.errors.question && <p className="text-xs text-destructive">{faqForm.formState.errors.question.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Label>Resposta</Label>
              <Textarea rows={4} {...faqForm.register("answer")} placeholder="Você pode..." />
              {faqForm.formState.errors.answer && <p className="text-xs text-destructive">{faqForm.formState.errors.answer.message}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowFaqForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingFaq}>
                {savingFaq && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories + FAQs */}
      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const catFaqs = faqs.filter((f) => f.category_id === cat.id).sort((a, b) => a.position - b.position);
          const expanded = expandedCat === cat.id;
          return (
            <div key={cat.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                <button
                  className="flex items-center gap-2 font-medium text-sm flex-1 text-left"
                  onClick={() => setExpandedCat(expanded ? null : cat.id)}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {cat.name}
                  <Badge variant="secondary" className="ml-1">{catFaqs.length}</Badge>
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openNewFaq(cat.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditCat(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteCat(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {expanded && (
                <div className="divide-y">
                  {catFaqs.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Nenhuma FAQ nesta categoria.</p>
                  )}
                  {catFaqs.map((faq) => (
                    <FaqRow key={faq.id} faq={faq} onEdit={openEditFaq} onDelete={handleDeleteFaq} onToggle={handleToggle} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
              <button
                className="flex items-center gap-2 font-medium text-sm flex-1 text-left"
                onClick={() => setExpandedCat(expandedCat === "__none__" ? null : "__none__")}
              >
                {expandedCat === "__none__" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Sem categoria
                <Badge variant="secondary" className="ml-1">{uncategorized.length}</Badge>
              </button>
            </div>
            {expandedCat === "__none__" && (
              <div className="divide-y">
                {uncategorized.map((faq) => (
                  <FaqRow key={faq.id} faq={faq} onEdit={openEditFaq} onDelete={handleDeleteFaq} onToggle={handleToggle} />
                ))}
              </div>
            )}
          </div>
        )}

        {categories.length === 0 && faqs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma FAQ cadastrada ainda.</p>
            <p className="text-xs mt-1">Crie uma categoria e adicione perguntas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FaqRow({
  faq,
  onEdit,
  onDelete,
  onToggle,
}: {
  faq: Faq;
  onEdit: (faq: Faq) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, field: "is_active" | "is_featured", current: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{faq.question}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{faq.answer}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {faq.is_featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
        <button onClick={() => onToggle(faq.id, "is_active", faq.is_active)} title={faq.is_active ? "Desativar" : "Ativar"}>
          {faq.is_active
            ? <ToggleRight className="h-5 w-5 text-green-500" />
            : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
        </button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(faq)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(faq.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
