"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  upsertCourseAction,
  upsertModuleAction,
  upsertLessonAction,
  deleteModuleAction,
  deleteLessonAction,
  createBunnyVideoStubAction,
} from "@/lib/actions/ead/course-actions";
import type { EadCourse, EadModule, EadLesson } from "@/types/ead";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  Link2,
  Save,
  Loader2,
  Upload,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ModuleWithLessons = EadModule & { lessons: EadLesson[] };

interface CourseEditorProps {
  course?: EadCourse;
  modules: ModuleWithLessons[];
}

const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  video:         Video,
  texto:         FileText,
  pdf:           FileText,
  link_externo:  Link2,
};

function formatDuration(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Lesson Row ─────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  courseId,
  onDelete,
}: {
  lesson: EadLesson;
  courseId: string;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [isPreview, setIsPreview] = useState(lesson.is_free_preview);
  const [publishAt, setPublishAt] = useState(
    lesson.publish_at ? lesson.publish_at.slice(0, 16) : ""
  );
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [videoId, setVideoId] = useState(lesson.bunny_video_id ?? "");

  const Icon = CONTENT_TYPE_ICONS[lesson.content_type] ?? FileText;

  async function handleSave() {
    startTransition(async () => {
      const res = await upsertLessonAction({
        id:              lesson.id,
        module_id:       lesson.module_id,
        course_id:       courseId,
        title,
        content_type:    lesson.content_type,
        bunny_video_id:  videoId || null,
        is_free_preview: isPreview,
        publish_at:      publishAt || null,
        position:        lesson.position,
      });
      if (res.error) toast.error(res.error);
      else toast.success("Aula salva");
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    toast.info("Iniciando upload...");

    try {
      const stub = await createBunnyVideoStubAction(title, courseId);
      if ("error" in stub && stub.error) {
        toast.error(stub.error);
        return;
      }

      const { guid, tusEndpoint, libraryId } = stub as {
        guid: string; tusEndpoint: string; libraryId: string;
      };

      const { Upload } = await import("tus-js-client");
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 5000],
          headers: {
            AuthorizationSignature: "",
            AuthorizationExpire:    "0",
            VideoId:                guid,
            LibraryId:              libraryId,
          },
          metadata: { filename: file.name, filetype: file.type },
          onError:    reject,
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setVideoId(guid);
      toast.success("Upload concluído!");
    } catch (err) {
      toast.error("Erro no upload do vídeo.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header da aula */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-white cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">{lesson.title}</span>
        {lesson.duration_s && (
          <span className="text-xs text-muted-foreground">
            {formatDuration(lesson.duration_s)}
          </span>
        )}
        {isPreview && (
          <Badge className="text-xs bg-blue-100 text-blue-700 border-0">Preview</Badge>
        )}
        {lesson.publish_at && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(lesson.id); }}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* Detalhes da aula */}
      {open && (
        <div className="p-4 bg-muted/20 border-t border-border flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da aula"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disponível a partir de (drip)</Label>
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para disponibilizar imediatamente</p>
            </div>
          </div>

          {/* Upload de vídeo */}
          {lesson.content_type === "video" && (
            <div className="space-y-2">
              <Label className="text-xs">Vídeo (Bunny.net)</Label>
              {videoId ? (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Vídeo carregado</span>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {videoId}
                  </code>
                </div>
              ) : null}
              <label className={cn(
                "flex items-center gap-2 cursor-pointer w-fit px-3 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-brand hover:text-brand transition-colors",
                uploading && "opacity-50 cursor-not-allowed"
              )}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Enviando..." : videoId ? "Substituir vídeo" : "Fazer upload do vídeo"}
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleUpload}
                />
              </label>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsPreview((p) => !p)}
              className={cn(
                "flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors",
                isPreview
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "border-border text-muted-foreground hover:border-brand hover:text-brand"
              )}
            >
              {isPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {isPreview ? "Preview público" : "Somente matriculados"}
            </button>

            <Button size="sm" onClick={handleSave} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module Card ────────────────────────────────────────────────────────────

function ModuleCard({
  mod,
  courseId,
  onDelete,
}: {
  mod: ModuleWithLessons;
  courseId: string;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState(mod.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [lessons, setLessons] = useState<EadLesson[]>(mod.lessons);
  const [pending, startTransition] = useTransition();
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<string>("video");

  function handleDeleteLesson(lessonId: string) {
    if (!confirm("Remover esta aula?")) return;
    startTransition(async () => {
      const res = await deleteLessonAction(lessonId, courseId);
      if (res.error) toast.error(res.error);
      else setLessons((l) => l.filter((x) => x.id !== lessonId));
    });
  }

  function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    startTransition(async () => {
      const res = await upsertLessonAction({
        module_id:       mod.id,
        course_id:       courseId,
        title:           newLessonTitle.trim(),
        content_type:    newLessonType,
        is_free_preview: false,
        position:        lessons.length,
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Aula criada");
      setNewLessonTitle("");
      setAddingLesson(false);
      // Força re-render com a nova aula (slug gerado no server)
      window.location.reload();
    });
  }

  function handleSaveTitle() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertModuleAction({ id: mod.id, course_id: courseId, title, position: mod.position, is_free_preview: mod.is_free_preview });
      setEditingTitle(false);
    });
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header do módulo */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
        <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        ) : (
          <span
            className="text-sm font-semibold flex-1 cursor-pointer hover:text-brand transition-colors"
            onClick={() => setEditingTitle(true)}
          >
            {mod.title}
          </span>
        )}

        <Badge className="text-xs bg-muted text-muted-foreground border border-border">
          {lessons.length} aula{lessons.length !== 1 ? "s" : ""}
        </Badge>
        <button
          onClick={() => onDelete(mod.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Aulas */}
      {open && (
        <div className="p-4 flex flex-col gap-2">
          {lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              onDelete={handleDeleteLesson}
            />
          ))}

          {/* Adicionar aula */}
          {addingLesson ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Nome da aula"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAddLesson(); if (e.key === "Escape") setAddingLesson(false); }}
              />
              <Select value={newLessonType} onValueChange={(v) => setNewLessonType(v ?? "video")}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="link_externo">Link</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddLesson} disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingLesson(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors mt-1 px-1"
            >
              <Plus className="h-4 w-4" /> Adicionar aula
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Editor ────────────────────────────────────────────────────────────

export function CourseEditor({ course, modules: initialModules }: CourseEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modules, setModules] = useState<ModuleWithLessons[]>(initialModules);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  // Form state
  const [title, setTitle] = useState(course?.title ?? "");
  const [subtitle, setSubtitle] = useState(course?.subtitle ?? "");
  const [descShort, setDescShort] = useState(course?.description_short ?? "");
  const [descFull, setDescFull] = useState(course?.description_full ?? "");
  const [price, setPrice] = useState(String(course?.price ?? "0"));
  const [pricePromo, setPricePromo] = useState(String(course?.price_promotional ?? ""));
  const [accessDays, setAccessDays] = useState(String(course?.access_days ?? "180"));
  const [isActive, setIsActive] = useState(course?.is_active ?? false);
  const [isFree, setIsFree] = useState(course?.is_free ?? false);
  const [isFeatured, setIsFeatured] = useState(course?.is_featured ?? false);
  const [level, setLevel] = useState(course?.level ?? "");
  const [instructorName, setInstructorName] = useState(course?.instructor_name ?? "");
  const [instructorBio, setInstructorBio] = useState(course?.instructor_bio ?? "");
  const [certEnabled, setCertEnabled] = useState(course?.certificate_enabled ?? true);

  function handleSaveCourse() {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }

    startTransition(async () => {
      const res = await upsertCourseAction({
        id:                  course?.id,
        title:               title.trim(),
        subtitle:            subtitle || undefined,
        description_short:   descShort || undefined,
        description_full:    descFull || undefined,
        price:               parseFloat(price) || 0,
        price_promotional:   pricePromo ? parseFloat(pricePromo) : null,
        access_days:         parseInt(accessDays) || 180,
        is_active:           isActive,
        is_free:             isFree,
        is_featured:         isFeatured,
        level:               level || null,
        instructor_name:     instructorName || undefined,
        instructor_bio:      instructorBio || undefined,
        certificate_enabled: certEnabled,
      });

      if (res.error) { toast.error(res.error); return; }
      toast.success("Curso salvo!");
      if (!course?.id && res.id) {
        router.replace(`/admin/ead/cursos/${res.id}`);
      }
    });
  }

  function handleDeleteModule(moduleId: string) {
    if (!confirm("Remover este módulo e todas as aulas?")) return;
    startTransition(async () => {
      const res = await deleteModuleAction(moduleId, course?.id ?? "");
      if (res.error) toast.error(res.error);
      else setModules((m) => m.filter((x) => x.id !== moduleId));
    });
  }

  function handleAddModule() {
    if (!newModuleTitle.trim() || !course?.id) return;
    startTransition(async () => {
      const res = await upsertModuleAction({
        course_id:       course.id,
        title:           newModuleTitle.trim(),
        position:        modules.length,
        is_free_preview: false,
      });
      if (res.error) { toast.error(res.error); return; }
      setModules((m) => [...m, { id: res.id!, course_id: course.id, title: newModuleTitle.trim(), description: null, position: m.length, is_free_preview: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lessons: [] }]);
      setNewModuleTitle("");
      setAddingModule(false);
    });
  }

  return (
    <Tabs defaultValue="info" className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>
        <Button size="sm" onClick={handleSaveCourse} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          Salvar curso
        </Button>
      </div>

      {/* Tab: Informações */}
      <TabsContent value="info" className="flex-1 overflow-y-auto p-5 mt-0">
        <div className="max-w-2xl flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Curso de Teologia Bíblica" />
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Uma frase que resume o curso" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição curta</Label>
            <Textarea value={descShort} onChange={(e) => setDescShort(e.target.value)} placeholder="Exibida no card e no catálogo" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição completa</Label>
            <Textarea value={descFull} onChange={(e) => setDescFull(e.target.value)} placeholder="Detalhes do curso (suporta markdown)" rows={6} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do instrutor</Label>
              <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={level} onValueChange={(v) => setLevel(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio do instrutor</Label>
            <Textarea value={instructorBio} onChange={(e) => setInstructorBio(e.target.value)} rows={2} />
          </div>
        </div>
      </TabsContent>

      {/* Tab: Conteúdo */}
      <TabsContent value="conteudo" className="flex-1 overflow-y-auto p-5 mt-0">
        {!course?.id ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p className="text-sm">Salve o curso primeiro para adicionar módulos e aulas.</p>
          </div>
        ) : (
          <div className="max-w-3xl flex flex-col gap-4">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                courseId={course.id}
                onDelete={handleDeleteModule}
              />
            ))}

            {addingModule ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Nome do módulo"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddModule(); if (e.key === "Escape") setAddingModule(false); }}
                />
                <Button onClick={handleAddModule} disabled={pending} size="sm">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingModule(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setAddingModule(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar módulo
              </Button>
            )}
          </div>
        )}
      </TabsContent>

      {/* Tab: Configurações */}
      <TabsContent value="config" className="flex-1 overflow-y-auto p-5 mt-0">
        <div className="max-w-2xl flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} disabled={isFree} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço promocional (R$)</Label>
              <Input type="number" min={0} step={0.01} value={pricePromo} onChange={(e) => setPricePromo(e.target.value)} disabled={isFree} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dias de acesso</Label>
            <Input
              type="number"
              min={0}
              value={accessDays}
              onChange={(e) => setAccessDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">0 = acesso vitalício</p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { label: "Curso ativo (visível no catálogo)", value: isActive, setter: setIsActive },
              { label: "Destaque na página inicial", value: isFeatured, setter: setIsFeatured },
              { label: "Curso gratuito", value: isFree, setter: setIsFree },
              { label: "Emitir certificado ao concluir", value: certEnabled, setter: setCertEnabled },
            ].map(({ label, value, setter }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <div
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative flex-shrink-0",
                    value ? "bg-brand" : "bg-muted"
                  )}
                  onClick={() => setter(!value)}
                >
                  <div className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                    value && "translate-x-5"
                  )} />
                </div>
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
