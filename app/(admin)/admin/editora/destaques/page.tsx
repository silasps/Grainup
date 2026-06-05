"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight,
  ImageIcon, Monitor, Smartphone, Tablet, GripVertical,
  Upload, X as XIcon, PlayCircle,
} from "lucide-react";
import { saveDestaque, deleteDestaque, toggleDestaque } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Destaque = Database["public"]["Tables"]["destaques"]["Row"];

const schema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  subtitle: z.string().optional(),
  cta_url: z.string().optional(),
  video_url: z.string().optional(),
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

// ── compressão client-side via canvas ───────────────────────────────────────
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const maxW = 1920;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas não suportado")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Falha na compressão")); return; }
          resolve(blob);
        },
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = objUrl;
  });
}

async function uploadImageToSupabase(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `destaques/${Date.now()}.jpg`;
  const fd = new FormData();
  fd.append("file", new File([blob], path, { type: "image/jpeg" }));
  fd.append("bucket", "images");
  fd.append("path", path);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha no upload");
  return json.url as string;
}

// ── preview responsivo ───────────────────────────────────────────────────────
function ImagePreview({ src }: { src: string }) {
  const [size, setSize] = useState<PreviewSize>("desktop");
  const widths  = { mobile: "w-[320px]", tablet: "w-[500px]", desktop: "w-full max-w-[780px]" };
  const heights = { mobile: "h-[240px]", tablet: "h-[200px]", desktop: "h-[244px]" };

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
                size === s
                  ? "bg-brand text-white border-brand"
                  : "text-muted-foreground border-border hover:border-brand/50"
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
          <Image src={src} alt="Prévia" fill className="object-cover object-center" unoptimized />
        </div>
      </div>
    </div>
  );
}

// ── widget de upload de imagem ───────────────────────────────────────────────
function ImageUploadWidget({
  currentUrl,
  onUploaded,
  onClear,
  uploading,
  setUploading,
}: {
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onClear: () => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  // preview local temporário antes de subir
  async function handleFile(file: File) {
    const local = URL.createObjectURL(file);
    setPreview(local);
    setUploading(true);
    try {
      const url = await uploadImageToSupabase(file);
      URL.revokeObjectURL(local);
      setPreview(url);
      onUploaded(url);
    } catch (e) {
      toast.error("Erro ao enviar imagem", { description: (e as Error).message });
      URL.revokeObjectURL(local);
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  function clear() {
    setPreview(null);
    onClear();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {preview ? (
        <div className="flex flex-col gap-2">
          <ImagePreview src={preview} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Trocar imagem
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-destructive gap-1.5">
              <XIcon className="h-3.5 w-3.5" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-8 cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-colors select-none"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-brand animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {uploading ? "Comprimindo e enviando…" : "Clique ou arraste uma imagem aqui"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Qualquer formato (JPG, PNG, WebP, HEIC…). Será comprimida automaticamente.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-background border border-border rounded-full">📷 Câmera</span>
            <span className="px-2 py-0.5 bg-background border border-border rounded-full">🖥️ Computador</span>
            <span className="px-2 py-0.5 bg-background border border-border rounded-full">📱 Celular</span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tamanho ideal: <strong>1200 × 600 px</strong> (proporção 2:1). Mantenha o conteúdo principal no centro — a imagem é cortada diferente no mobile e no desktop. O sistema comprime automaticamente para JPEG antes de enviar.
      </p>
    </div>
  );
}

// ── página ───────────────────────────────────────────────────────────────────
export default function DestaquesPage() {
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "anuncio", is_active: true, position: 0 },
  });

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
    setImageUrl(null);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(d: Destaque) {
    reset({
      title: d.title,
      subtitle: d.subtitle ?? "",
      cta_url: d.cta_url ?? "",
      video_url: (d as Destaque & { video_url?: string | null }).video_url ?? "",
      type: d.type,
      starts_at: d.starts_at ? d.starts_at.slice(0, 16) : "",
      ends_at: d.ends_at ? d.ends_at.slice(0, 16) : "",
      is_active: d.is_active,
      position: d.position,
    });
    setImageUrl(d.image_url);
    setEditingId(d.id);
    setShowForm(true);
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await saveDestaque({
        title: data.title,
        subtitle: data.subtitle || null,
        image_url: imageUrl,
        cta_label: null,
        cta_url: data.cta_url || null,
        video_url: data.video_url || null,
        type: data.type,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        is_active: data.is_active,
        position: data.position,
        ...(editingId ? { id: editingId } : {}),
      } as Parameters<typeof saveDestaque>[0]);
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
        subtitle="Banners clicáveis exibidos na página da editora"
      />
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo destaque
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-5">
          <h2 className="font-semibold text-foreground">
            {editingId ? "Editar destaque" : "Novo destaque"}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
                <Label>Título interno *</Label>
                <Input {...register("title")} placeholder="Ex: Promoção de inverno" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Descrição interna <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <Input {...register("subtitle")} placeholder="Anotação para o admin" />
              </div>
            </div>

            {/* Imagem */}
            <div className="flex flex-col gap-1.5">
              <Label>Imagem do banner</Label>
              <ImageUploadWidget
                currentUrl={imageUrl}
                onUploaded={setImageUrl}
                onClear={() => setImageUrl(null)}
                uploading={uploading}
                setUploading={setUploading}
              />
            </div>

            {/* Vídeo YouTube */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4 text-red-500" />
                Vídeo do YouTube <span className="text-muted-foreground font-normal text-xs">(opcional — usado se não houver imagem)</span>
              </Label>
              <Input
                {...register("video_url")}
                placeholder="https://youtu.be/... ou https://www.youtube.com/watch?v=..."
              />
            </div>

            {/* Link de direcionamento */}
            <div className="flex flex-col gap-1.5">
              <Label>Link de direcionamento</Label>
              <Input {...register("cta_url")} placeholder="/editora/livros/slug ou https://..." />
              <p className="text-xs text-muted-foreground">
                Ao clicar na imagem/vídeo na área pública, o visitante será levado para esse endereço.
              </p>
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
              <Button type="submit" disabled={pending || uploading} className="gap-2">
                {(pending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
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
          {destaques.map((d) => {
            const dWithVideo = d as Destaque & { video_url?: string | null };
            return (
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
                  ) : dWithVideo.video_url ? (
                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                      <PlayCircle className="h-5 w-5 text-red-500" />
                    </div>
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
                  {d.cta_url && (
                    <p className="text-xs text-muted-foreground truncate">{d.cta_url}</p>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
