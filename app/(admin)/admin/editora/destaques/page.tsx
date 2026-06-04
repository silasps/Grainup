"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight,
  ImageIcon, Monitor, Smartphone, Tablet, GripVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveDestaque, deleteDestaque, toggleDestaque } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import type { Database } from "@/types/database";

type Destaque = Database["public"]["Tables"]["destaques"]["Row"];

const schema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  subtitle: z.string().optional(),
  image_url: z.string().optional(),
  cta_label: z.string().optional(),
  cta_url: z.string().optional(),
  type: z.enum(["oferta", "novidade", "anuncio"]),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.boolean(),
  position: z.number().int().min(0),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS = { oferta: "Oferta", novidade: "Novidade", anuncio: "Anúncio" };
const TYPE_COLORS = {
  oferta:   "bg-red-500 text-white",
  novidade: "bg-brand text-white",
  anuncio:  "bg-foreground text-white",
};

type PreviewSize = "mobile" | "tablet" | "desktop";

function ImagePreview({ url }: { url: string }) {
  const [size, setSize] = useState<PreviewSize>("desktop");

  const widths: Record<PreviewSize, string> = {
    mobile: "w-[320px]",
    tablet: "w-[500px]",
    desktop: "w-full max-w-[780px]",
  };
  const heights: Record<PreviewSize, string> = {
    mobile: "h-[260px]",
    tablet: "h-[260px]",
    desktop: "h-[300px]",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {(["mobile", "tablet", "desktop"] as PreviewSize[]).map((s) => {
          const Icon = s === "mobile" ? Smartphone : s === "tablet" ? Tablet : Monitor;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                size === s ? "bg-brand text-white border-brand" : "text-muted-foreground border-border hover:border-brand/50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {s === "mobile" ? "375px" : s === "tablet" ? "768px" : "1280px"}
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-muted flex justify-center p-2">
        <div className={`relative ${widths[size]} ${heights[size]} transition-all duration-300 rounded overflow-hidden`}>
          <Image src={url} alt="Preview" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
            <p className="text-white font-bold text-sm line-clamp-2">Título do destaque</p>
            <p className="text-white/70 text-xs mt-0.5">Subtítulo aqui</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tamanho recomendado: <strong>1920 × 600 px</strong>, formato JPG/WebP, máximo 500 KB.
      </p>
    </div>
  );
}

export default function DestaquesPage() {
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "anuncio",
      is_active: true,
      position: 0,
    },
  });

  const imageUrl = watch("image_url") ?? "";

  async function fetchDestaques() {
    const supabase = createClient();
    const { data } = await supabase
      .from("destaques")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setDestaques(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchDestaques(); }, []);

  function openNew() {
    reset({ type: "anuncio", is_active: true, position: destaques.length });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(d: Destaque) {
    reset({
      title: d.title,
      subtitle: d.subtitle ?? "",
      image_url: d.image_url ?? "",
      cta_label: d.cta_label ?? "",
      cta_url: d.cta_url ?? "",
      type: d.type,
      starts_at: d.starts_at ? d.starts_at.slice(0, 16) : "",
      ends_at: d.ends_at ? d.ends_at.slice(0, 16) : "",
      is_active: d.is_active,
      position: d.position,
    });
    setEditingId(d.id);
    setShowForm(true);
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await saveDestaque({
        ...data,
        subtitle: data.subtitle || null,
        image_url: data.image_url || null,
        cta_label: data.cta_label || null,
        cta_url: data.cta_url || null,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        ...(editingId ? { id: editingId } : {}),
      });
      if (result.error) {
        toast.error("Erro ao salvar destaque", { description: result.error });
      } else {
        toast.success(editingId ? "Destaque atualizado" : "Destaque criado");
        setShowForm(false);
        fetchDestaques();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este destaque?")) return;
    startTransition(async () => {
      const result = await deleteDestaque(id);
      if (result.error) toast.error("Erro ao remover", { description: result.error });
      else { toast.success("Removido"); fetchDestaques(); }
    });
  }

  function handleToggle(d: Destaque) {
    startTransition(async () => {
      await toggleDestaque(d.id, !d.is_active);
      fetchDestaques();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        title="Destaques"
        description="Gerencie os slides do hero da página inicial. Tipos: oferta, novidade ou anúncio."
        action={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo destaque
          </Button>
        }
      />

      {/* Formulário */}
      {showForm && (
        <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-5">
          <h2 className="font-semibold text-foreground">
            {editingId ? "Editar destaque" : "Novo destaque"}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(["oferta", "novidade", "anuncio"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" value={t} {...register("type")} className="accent-brand" />
                    <span className="text-sm capitalize">{TYPE_LABELS[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Título *</Label>
                <Input {...register("title")} placeholder="Ex: Últimas Unidades" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Subtítulo</Label>
                <Input {...register("subtitle")} placeholder="Frase complementar" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Label do botão</Label>
                <Input {...register("cta_label")} placeholder="Ex: Compre Agora" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Link do botão</Label>
                <Input {...register("cta_url")} placeholder="/editora/livros/slug" />
              </div>
            </div>

            {/* Imagem */}
            <div className="flex flex-col gap-1.5">
              <Label>URL da imagem</Label>
              <Input {...register("image_url")} placeholder="https://..." />
              {imageUrl && <ImagePreview url={imageUrl} />}
              {!imageUrl && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-muted-foreground text-sm">
                  <ImageIcon className="h-5 w-5 flex-shrink-0" />
                  <span>Cole uma URL de imagem acima para ver a prévia em diferentes tamanhos de tela.</span>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Disponível de</Label>
                <Input type="datetime-local" {...register("starts_at")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Disponível até</Label>
                <Input type="datetime-local" {...register("ends_at")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Posição</Label>
                <Input type="number" min={0} {...register("position", { valueAsNumber: true })} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("is_active")} className="accent-brand" />
              <span className="text-sm">Ativo</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Salvar alterações" : "Criar destaque"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : destaques.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <GripVertical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum destaque criado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {destaques.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 border border-border rounded-xl p-4 bg-card"
            >
              {/* Thumb */}
              <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {d.image_url ? (
                  <Image
                    src={d.image_url}
                    alt={d.title}
                    width={80}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge className={`text-xs ${TYPE_COLORS[d.type]}`}>{TYPE_LABELS[d.type]}</Badge>
                  {!d.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">#{d.position}</span>
                </div>
                <p className="font-medium truncate text-sm">{d.title}</p>
                {d.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{d.subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(d)}
                  disabled={pending}
                  className="text-muted-foreground"
                >
                  {d.is_active
                    ? <ToggleRight className="h-5 w-5 text-brand" />
                    : <ToggleLeft className="h-5 w-5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(d.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
