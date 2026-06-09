"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Megaphone, ToggleLeft, ToggleRight, ImagePlus, X as XIcon, Move, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveAnnouncement, deleteAnnouncement, toggleAnnouncement } from "./actions";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

const schema = z.object({
  title: z.string().min(3, "Título obrigatório"),
  body: z.string().min(5, "Mensagem obrigatória"),
  badge: z.string().optional(),
  image_url: z.string().optional(),
  cta_label: z.string().optional(),
  cta_url: z.string().optional(),
  type: z.enum(["promo", "info", "warning"]),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type UploadMode = "empty" | "adjusting" | "ready";

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clipRef      = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  const [mode,    setMode]    = useState<UploadMode>(value ? "ready" : "empty");
  const [rawSrc,  setRawSrc]  = useState(value || "");
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [offset,  setOffset]  = useState({ x: 0, y: 0 });

  // All mutable values read inside event listeners live in refs
  const scaleRef   = useRef(1);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const dragRef    = useRef({ active: false, cx: 0, cy: 0, ox: 0, oy: 0 });
  // Pinch tracking
  const pinchRef   = useRef<{ dist: number; scale: number; mx: number; my: number; ox: number; oy: number } | null>(null);

  // ── helpers ──────────────────────────────────────────────
  const applyTransform = useCallback((x: number, y: number, s: number) => {
    const img = imgRef.current;
    if (!img) return;
    scaleRef.current  = s;
    offsetRef.current = { x, y };
    setImgSize({ w: img.naturalWidth * s, h: img.naturalHeight * s });
    setOffset({ x, y });
  }, []);

  // Zoom centred on a point (cx, cy) relative to clip box
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const s  = scaleRef.current;
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const newScale = Math.max(0.05, s * factor);
    // Keep the image point under (cx, cy) fixed
    const imgX = (cx - ox) / s;
    const imgY = (cy - oy) / s;
    applyTransform(cx - imgX * newScale, cy - imgY * newScale, newScale);
  }, [applyTransform]);

  // ── File pick ─────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (rawSrc.startsWith("blob:")) URL.revokeObjectURL(rawSrc);
    setRawSrc(URL.createObjectURL(file));
    setMode("adjusting");
    e.target.value = "";
  }

  // ── Image loaded: fill + centre ───────────────────────────
  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img  = e.currentTarget;
    const clip = clipRef.current;
    if (!clip) return;
    const cW = clip.clientWidth;
    const cH = clip.clientHeight;
    const s  = Math.max(cW / img.naturalWidth, cH / img.naturalHeight);
    const ox = (cW - img.naturalWidth  * s) / 2;
    const oy = (cH - img.naturalHeight * s) / 2;
    applyTransform(ox, oy, s);
  }

  // ── Pointer drag (mouse / stylus) ─────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore if it looks like the start of a pinch (second pointer)
    if (e.isPrimary === false) return;
    dragRef.current = { active: true, cx: e.clientX, cy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d.active || e.isPrimary === false) return;
    applyTransform(
      d.ox + e.clientX - d.cx,
      d.oy + e.clientY - d.cy,
      scaleRef.current,
    );
  }
  function onPointerUp() { dragRef.current.active = false; }

  // ── Wheel zoom ────────────────────────────────────────────
  // Added imperatively so we can mark it non-passive
  useEffect(() => {
    const el = clipRef.current;
    if (!el || mode !== "adjusting") return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1 - e.deltaY * 0.001);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mode, zoomAt]);

  // ── Pinch zoom (touch) ────────────────────────────────────
  useEffect(() => {
    const el = clipRef.current;
    if (!el || mode !== "adjusting") return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      dragRef.current.active = false; // disable single-finger drag during pinch
      const t0 = e.touches[0], t1 = e.touches[1];
      const rect = el!.getBoundingClientRect();
      pinchRef.current = {
        dist:  Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        scale: scaleRef.current,
        mx: (t0.clientX + t1.clientX) / 2 - rect.left,
        my: (t0.clientY + t1.clientY) / 2 - rect.top,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      };
    }

    function onTouchMove(e: TouchEvent) {
      const p = pinchRef.current;
      if (!p || e.touches.length !== 2) return;
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const newScale = Math.max(0.05, p.scale * (newDist / p.dist));
      const imgX = (p.mx - p.ox) / p.scale;
      const imgY = (p.my - p.oy) / p.scale;
      applyTransform(p.mx - imgX * newScale, p.my - imgY * newScale, newScale);
    }

    function onTouchEnd() { pinchRef.current = null; }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [mode, applyTransform]);

  // ── Canvas crop → blob ────────────────────────────────────
  function confirmCrop() {
    const img  = imgRef.current;
    const clip = clipRef.current;
    if (!img || !clip) return;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width  = clip.clientWidth  * dpr;
    canvas.height = clip.clientHeight * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      offsetRef.current.x * dpr,
      offsetRef.current.y * dpr,
      img.naturalWidth  * scaleRef.current * dpr,
      img.naturalHeight * scaleRef.current * dpr,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (rawSrc.startsWith("blob:")) URL.revokeObjectURL(rawSrc);
      const cropped = URL.createObjectURL(blob);
      setRawSrc(cropped);
      onChange(cropped);
      setMode("ready");
    }, "image/jpeg", 0.92);
  }

  function cancelAdjust() {
    if (rawSrc.startsWith("blob:") && rawSrc !== value) URL.revokeObjectURL(rawSrc);
    setRawSrc(value || "");
    setMode(value ? "ready" : "empty");
  }

  function removeImage() {
    if (rawSrc.startsWith("blob:")) URL.revokeObjectURL(rawSrc);
    setRawSrc(""); onChange(""); setMode("empty");
  }

  // ── Adjust mode UI ────────────────────────────────────────
  if (mode === "adjusting") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Move className="h-3.5 w-3.5" />
          Arraste para mover · Scroll ou pinça para zoom
        </p>

        <div
          ref={clipRef}
          className="relative w-full aspect-[2/1] overflow-hidden rounded-xl bg-black select-none ring-2 ring-brand shadow-lg cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={rawSrc}
            alt=""
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width:  imgSize.w || "auto",
              height: imgSize.h || "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={confirmCrop} className="gap-1.5">
            <Check className="h-3.5 w-3.5" /> Confirmar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={cancelAdjust}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty / ready mode UI ─────────────────────────────────
  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full aspect-[2/1] rounded-xl border-2 overflow-hidden transition-all cursor-pointer
            ${value ? "border-transparent shadow-sm" : "border-dashed border-border hover:border-brand/50 hover:bg-brand/5"}`}
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImagePlus className="h-7 w-7" />
              <span className="text-xs text-center px-2 leading-tight">Clique para selecionar</span>
              <span className="text-[10px] text-center px-2 leading-tight opacity-70">800 × 400 px</span>
            </div>
          )}
          {value && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-medium bg-black/60 rounded-lg px-2 py-1">Trocar</span>
            </div>
          )}
        </button>

        {value ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setRawSrc(value); setMode("adjusting"); }}
              className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors"
            >
              <Move className="h-3.5 w-3.5" /> Reajustar
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={removeImage}
              className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <XIcon className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground leading-snug">
            Ideal: <strong className="font-medium">800 × 400 px</strong> · Proporção 2:1 (paisagem)
          </p>
        )}
      </div>
    </>
  );
}

function AnnouncementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Announcement;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: initial?.title ?? "",
        body: initial?.body ?? "",
        badge: initial?.badge ?? "",
        image_url: initial?.image_url ?? "",
        cta_label: initial?.cta_label ?? "",
        cta_url: initial?.cta_url ?? "",
        type: initial?.type ?? "promo",
        starts_at: initial?.starts_at ? initial.starts_at.slice(0, 16) : "",
        ends_at: initial?.ends_at ? initial.ends_at.slice(0, 16) : "",
        is_active: initial?.is_active ?? true,
      },
    });

  const typeVal = watch("type");
  const isActive = watch("is_active");

  async function onSubmit(data: FormData) {
    // Upload blob to Supabase only on save
    let imageUrl: string | null = data.image_url || null;
    if (imageUrl?.startsWith("blob:")) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const ext = blob.type.split("/").pop() ?? "jpg";
      const path = `announcements/${Date.now()}.${ext}`;
      const fd = new FormData();
      fd.append("file", new File([blob], `${path}`, { type: blob.type }));
      fd.append("bucket", "images");
      fd.append("path", path);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) { toast.error("Erro ao enviar imagem", { description: uploadJson.error }); return; }
      URL.revokeObjectURL(imageUrl);
      imageUrl = uploadJson.url;
    }

    const payload = {
      title: data.title,
      body: data.body,
      badge: data.badge || null,
      image_url: imageUrl,
      cta_label: data.cta_label || null,
      cta_url: data.cta_url || null,
      type: data.type,
      starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      is_active: data.is_active,
    };

    const { error } = await saveAnnouncement(payload, initial?.id);
    if (error) { toast.error("Erro ao salvar anúncio", { description: error }); return; }
    toast.success(initial ? "Anúncio atualizado!" : "Anúncio criado!");
    onSave();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5">
      <h2 className="font-semibold text-foreground">{initial ? "Editar anúncio" : "Novo anúncio"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" placeholder="Ex: Frete grátis este fim de semana!" {...register("title")} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="body">Mensagem</Label>
          <Textarea id="body" rows={3} placeholder="Detalhes do anúncio..." {...register("body")} />
          {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="badge">Badge <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="badge" placeholder="Ex: Só hoje!" {...register("badge")} />
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label>
            Imagem <span className="text-muted-foreground font-normal text-xs">(opcional — formato retrato recomendado)</span>
          </Label>
          <ImageUpload
            value={watch("image_url") ?? ""}
            onChange={(url) => setValue("image_url", url)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cta_label">Texto do botão <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="cta_label" placeholder="Ex: Ver ofertas" {...register("cta_label")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cta_url">Link do botão <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="cta_url" placeholder="/editora/ofertas" {...register("cta_url")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="starts_at">Início <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ends_at">Fim <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setValue("is_active", !isActive)}
            className="text-brand"
          >
            {isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
          </button>
          <span className="text-sm font-medium text-foreground">
            {isActive ? "Ativo (aparecerá para visitantes)" : "Inativo"}
          </span>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-brand hover:bg-brand-700 text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export default function AnunciosPage() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await deleteAnnouncement(id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Anúncio removido");
    setAnnouncements((p) => p.filter((a) => a.id !== id));
  }

  async function toggleActive(a: Announcement) {
    await toggleAnnouncement(a.id, !a.is_active);
    setAnnouncements((p) => p.map((x) => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Anúncios / Overlays"
        subtitle="Configure alertas e promoções exibidos na loja"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        {!showForm && !editing && (
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-700 text-white gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Novo anúncio
            </Button>
          </div>
        )}

        {showForm && (
          <AnnouncementForm onSave={() => { load(); setShowForm(false); }} onCancel={() => setShowForm(false)} />
        )}
        {editing && (
          <AnnouncementForm initial={editing} onSave={() => { load(); setEditing(null); }} onCancel={() => setEditing(null)} />
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 && !showForm ? (
          <div className="bg-white border border-border rounded-xl p-10 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Nenhum anúncio criado</p>
            <p className="text-sm text-muted-foreground">Crie um anúncio para exibir um overlay na loja.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-xs bg-brand text-white">Anúncio</Badge>
                    {a.is_active
                      ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Ativo</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                    }
                    {a.badge && <Badge variant="outline" className="text-xs">{a.badge}</Badge>}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                  {(a.starts_at || a.ends_at) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.starts_at ? `De ${new Date(a.starts_at).toLocaleString("pt-BR")}` : ""}
                      {a.ends_at ? ` até ${new Date(a.ends_at).toLocaleString("pt-BR")}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(a)} className="text-xs text-muted-foreground hover:text-foreground">
                    {a.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setShowForm(false); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:border-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
