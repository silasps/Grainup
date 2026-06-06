"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight,
  ImageIcon, GripVertical, Upload, X as XIcon, PlayCircle, Move,
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
  title:    z.string().min(2, "Título obrigatório"),
  subtitle: z.string().optional(),
  cta_url:  z.string().optional(),
  video_url: z.string().optional(),
  type:     z.enum(["oferta", "novidade", "anuncio"]),
  starts_at: z.string().optional(),
  ends_at:   z.string().optional(),
  is_active: z.boolean(),
  position:  z.number().int().min(0),
});
type FormData = z.infer<typeof schema>;

const TYPE_LABELS = { oferta: "Oferta", novidade: "Novidade", anuncio: "Anúncio" };
const TYPE_COLORS = {
  oferta:   "bg-red-500 text-white",
  novidade: "bg-brand text-white",
  anuncio:  "bg-foreground text-white",
};

// ── compressão + upload ───────────────────────────────────────────────────────
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
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas não suportado")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => { if (!blob) { reject(new Error("Falha na compressão")); return; } resolve(blob); },
        "image/jpeg", 0.82,
      );
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = objUrl;
  });
}

async function uploadToSupabase(file: File, prefix: string): Promise<string> {
  const blob = await compressImage(file);
  const path = `destaques/${prefix}-${Date.now()}.jpg`;
  const fd = new FormData();
  fd.append("file", new File([blob], path, { type: "image/jpeg" }));
  fd.append("bucket", "images");
  fd.append("path", path);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha no upload");
  return json.url as string;
}

// ── SimpleUpload: só arquivo → URL ────────────────────────────────────────────
function SimpleUpload({
  url, uploading, setUploading, onUploaded, onClear, prefix,
}: {
  url: string | null; uploading: boolean; setUploading: (v: boolean) => void;
  onUploaded: (url: string) => void; onClear: () => void; prefix: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadToSupabase(file, prefix);
      onUploaded(uploaded);
    } catch (e) {
      toast.error("Erro ao enviar imagem", { description: (e as Error).message });
    } finally { setUploading(false); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFile(f);
  }

  if (url) {
    return (
      <div className="flex gap-2 items-center">
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
          <Image src={url} alt="" width={64} height={40} className="w-full h-full object-cover" unoptimized />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Trocar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-destructive gap-1.5">
          <XIcon className="h-3.5 w-3.5" /> Remover
        </Button>
        <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => ref.current?.click()}
      className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-5 cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-colors select-none">
      {uploading
        ? <Loader2 className="h-6 w-6 text-brand animate-spin" />
        : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
      <div className="text-sm">
        <p className="font-medium">{uploading ? "Enviando…" : "Clique ou arraste"}</p>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP, HEIC — comprimido automaticamente</p>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── FocalPointPicker ──────────────────────────────────────────────────────────
function FocalPointPicker({
  imageUrl, mobileSrc, focalX, focalY, onChange,
}: {
  imageUrl: string; mobileSrc: string | null;
  focalX: number; focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  function updateFromEvent(e: React.PointerEvent | PointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onChange(
      clamp((e.clientX - rect.left) / rect.width),
      clamp((e.clientY - rect.top)  / rect.height),
    );
  }

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    updateFromEvent(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromEvent(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUp = useCallback(() => { dragging.current = false; }, []);

  const pos = `${focalX * 100}% ${focalY * 100}%`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── mapa de focal point ── */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Move className="h-3.5 w-3.5" />
          Arraste o ponto para o conteúdo mais importante da imagem
        </p>
        <div
          ref={containerRef}
          className="relative w-full aspect-video rounded-xl overflow-hidden cursor-crosshair border border-border select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
          {/* grid guia */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)",
            backgroundSize: "33.33% 33.33%",
          }} />
          {/* dot */}
          <div
            className="absolute w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.5)] bg-brand/80 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
            style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
          />
        </div>
      </div>

      {/* ── previews lado a lado ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Desktop</p>
          <div className="aspect-[16/5] overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: pos }} draggable={false} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Mobile</p>
          <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mobileSrc ?? imageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: mobileSrc ? "center" : pos }} draggable={false} />
          </div>
        </div>
      </div>
      {mobileSrc && (
        <p className="text-xs text-muted-foreground">
          O preview mobile usa a imagem mobile específica — o focal point afeta apenas o desktop.
        </p>
      )}
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────
export default function DestaquesPage() {
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [pending,   startTransition] = useTransition();

  const [imageUrl,       setImageUrl]       = useState<string | null>(null);
  const [imageMobileUrl, setImageMobileUrl] = useState<string | null>(null);
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  const [uploading,    setUploading]    = useState(false);
  const [uploadingMob, setUploadingMob] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "anuncio", is_active: true, position: 0 },
  });

  async function fetchDestaques() {
    const supabase = createClient();
    const { data } = await supabase
      .from("destaques").select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setDestaques(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchDestaques(); }, []);

  function openNew() {
    reset({ type: "anuncio", is_active: true, position: destaques.length });
    setImageUrl(null); setImageMobileUrl(null);
    setFocalX(0.5); setFocalY(0.5);
    setEditingId(null); setShowForm(true);
  }

  function openEdit(d: Destaque) {
    const dExt = d as Destaque & { video_url?: string | null; image_mobile_url?: string | null; focal_x?: number; focal_y?: number };
    reset({
      title: d.title, subtitle: d.subtitle ?? "",
      cta_url: d.cta_url ?? "", video_url: dExt.video_url ?? "",
      type: d.type,
      starts_at: d.starts_at ? d.starts_at.slice(0, 16) : "",
      ends_at:   d.ends_at   ? d.ends_at.slice(0, 16)   : "",
      is_active: d.is_active, position: d.position,
    });
    setImageUrl(d.image_url);
    setImageMobileUrl(dExt.image_mobile_url ?? null);
    setFocalX(dExt.focal_x ?? 0.5);
    setFocalY(dExt.focal_y ?? 0.5);
    setEditingId(d.id); setShowForm(true);
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await saveDestaque({
        title:    data.title,
        subtitle: data.subtitle || null,
        image_url:        imageUrl,
        image_mobile_url: imageMobileUrl,
        focal_x: focalX,
        focal_y: focalY,
        cta_label: null,
        cta_url:  data.cta_url  || null,
        video_url: data.video_url || null,
        type:     data.type,
        starts_at: data.starts_at || null,
        ends_at:   data.ends_at   || null,
        is_active: data.is_active,
        position:  data.position,
        ...(editingId ? { id: editingId } : {}),
      } as Parameters<typeof saveDestaque>[0]);
      if (result.error) {
        toast.error("Erro ao salvar destaque", { description: result.error });
      } else {
        toast.success(editingId ? "Destaque atualizado" : "Destaque criado");
        setShowForm(false); fetchDestaques();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este destaque?")) return;
    startTransition(async () => {
      const r = await deleteDestaque(id);
      if (r.error) toast.error("Erro ao remover", { description: r.error });
      else { toast.success("Removido"); fetchDestaques(); }
    });
  }

  function handleToggle(d: Destaque) {
    startTransition(async () => { await toggleDestaque(d.id, !d.is_active); fetchDestaques(); });
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader title="Destaques" subtitle="Banners clicáveis exibidos na página da editora" />
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo destaque</Button>
      </div>

      {/* ── Formulário ── */}
      {showForm && (
        <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-5">
          <h2 className="font-semibold text-foreground">{editingId ? "Editar destaque" : "Novo destaque"}</h2>
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

            {/* Títulos */}
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

            {/* Uploads */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label>Imagem principal — Desktop</Label>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-foreground tracking-wide">
                    Tamanho: <span className="font-mono text-brand">1920 × 560 px</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Proporção 16:3,5 (banner panorâmico). Coloque texto e elementos importantes no <strong>centro</strong> da arte.</p>
                </div>
                <SimpleUpload
                  url={imageUrl} prefix="desktop"
                  uploading={uploading} setUploading={setUploading}
                  onUploaded={(url) => { setImageUrl(url); setFocalX(0.5); setFocalY(0.5); }}
                  onClear={() => setImageUrl(null)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label>Imagem mobile</Label>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">opcional</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-foreground tracking-wide">
                    Tamanho: <span className="font-mono text-brand">750 × 1000 px</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Proporção 3:4 (retrato). Se não enviar, a imagem principal é usada com o focal point para cortar no mobile.</p>
                </div>
                <SimpleUpload
                  url={imageMobileUrl} prefix="mobile"
                  uploading={uploadingMob} setUploading={setUploadingMob}
                  onUploaded={setImageMobileUrl}
                  onClear={() => setImageMobileUrl(null)}
                />
              </div>
            </div>

            {/* Focal point + previews */}
            {imageUrl && (
              <FocalPointPicker
                imageUrl={imageUrl}
                mobileSrc={imageMobileUrl}
                focalX={focalX} focalY={focalY}
                onChange={(x, y) => { setFocalX(x); setFocalY(y); }}
              />
            )}

            {/* YouTube */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4 text-red-500" />
                Vídeo YouTube <span className="text-muted-foreground font-normal text-xs">(usado se não houver imagem)</span>
              </Label>
              <Input {...register("video_url")} placeholder="https://youtu.be/..." />
            </div>

            {/* Link */}
            <div className="flex flex-col gap-1.5">
              <Label>Link de direcionamento</Label>
              <Input {...register("cta_url")} placeholder="/editora/livros/slug ou https://..." />
              <p className="text-xs text-muted-foreground">Ao clicar na imagem, o visitante é levado para este endereço.</p>
            </div>

            {/* Datas + posição */}
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
              <Button type="submit" disabled={pending || uploading || uploadingMob} className="gap-2">
                {(pending || uploading || uploadingMob) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Salvar alterações" : "Criar destaque"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista ── */}
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
            const dExt = d as Destaque & { image_mobile_url?: string | null; video_url?: string | null };
            return (
              <div key={d.id} className="flex items-center gap-4 border border-border rounded-xl p-4 bg-card">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {d.image_url ? (
                    <Image src={d.image_url} alt={d.title} width={80} height={56} className="w-full h-full object-cover" unoptimized />
                  ) : dExt.video_url ? (
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
                    {!d.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                    <span className="text-xs text-muted-foreground">#{d.position}</span>
                  </div>
                  <p className="font-medium truncate text-sm">{d.title}</p>
                  {d.cta_url && <p className="text-xs text-muted-foreground truncate">{d.cta_url}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(d)} disabled={pending} className="text-muted-foreground">
                    {d.is_active ? <ToggleRight className="h-5 w-5 text-brand" /> : <ToggleLeft className="h-5 w-5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(d.id)} disabled={pending}>
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
