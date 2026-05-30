"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  cta_label: z.string().optional(),
  cta_url: z.string().optional(),
  type: z.enum(["promo", "info", "warning"]),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS = { promo: "Promoção", info: "Informativo", warning: "Alerta" };
const TYPE_COLORS = {
  promo: "bg-brand text-white",
  info: "bg-foreground text-white",
  warning: "bg-amber-500 text-white",
};

function AnnouncementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Announcement;
  onSave: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: initial?.title ?? "",
        body: initial?.body ?? "",
        badge: initial?.badge ?? "",
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
    const payload = {
      title: data.title,
      body: data.body,
      badge: data.badge || null,
      cta_label: data.cta_label || null,
      cta_url: data.cta_url || null,
      type: data.type,
      starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      is_active: data.is_active,
    };

    let error;
    if (initial) {
      ({ error } = await supabase.from("announcements").update(payload).eq("id", initial.id));
    } else {
      ({ error } = await supabase.from("announcements").insert(payload));
    }

    if (error) { toast.error("Erro ao salvar anúncio"); return; }
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

        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <div className="flex gap-2">
            {(["promo", "info", "warning"] as const).map((t) => (
              <label key={t} className={`flex-1 text-center py-2 px-3 rounded-lg text-sm cursor-pointer transition-all ${typeVal === t ? `${TYPE_COLORS[t]} font-semibold` : "border border-border text-muted-foreground hover:border-brand/40"}`}>
                <input type="radio" value={t} {...register("type")} onChange={() => setValue("type", t)} className="sr-only" />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
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
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Anúncio removido");
    setAnnouncements((p) => p.filter((a) => a.id !== id));
  }

  async function toggleActive(a: Announcement) {
    await supabase.from("announcements").update({ is_active: !a.is_active }).eq("id", a.id);
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
                    <Badge className={`text-xs ${TYPE_COLORS[a.type]}`}>{TYPE_LABELS[a.type]}</Badge>
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
