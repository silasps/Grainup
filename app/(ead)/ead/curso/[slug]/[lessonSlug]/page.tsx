import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { VideoPlayer } from "@/components/ead/student/video-player";
import { LessonSidebar } from "@/components/ead/student/lesson-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Link2, BookOpen } from "lucide-react";
import type { EadModuleWithLessons, EadLessonWithProgress } from "@/types/ead";
import { ExpiryBanner } from "@/components/ead/student/expiry-banner";

export const dynamic = "force-dynamic";

async function getPageData(courseSlug: string, lessonSlug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);
  if (!tenant) return null;

  const [settings, db] = await Promise.all([
    getTenantSettings(tenant.id),
    createAdminClient(),
  ]);

  const { data: course } = await db
    .from("ead_courses")
    .select("id, title, slug, is_active")
    .eq("tenant_id", tenant.id)
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course || !course.is_active) return null;

  const { data: enrollment } = await db
    .from("ead_enrollments")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== "ativa") return "not_enrolled";

  // Fetch all modules + lessons + progress in parallel
  const [modulesRes, lessonsRes, progressRes, attachmentsRes] = await Promise.all([
    db.from("ead_modules").select("*").eq("course_id", course.id).order("position"),
    db.from("ead_lessons").select("*").eq("course_id", course.id).order("position"),
    db.from("ead_lesson_progress").select("*").eq("enrollment_id", enrollment.id),
    db.from("ead_lesson_attachments").select("*").eq("lesson_id",
      (await db.from("ead_lessons").select("id").eq("slug", lessonSlug).eq("course_id", course.id).maybeSingle()).data?.id ?? ""
    ).order("position"),
  ]);

  const lessons = (lessonsRes.data ?? []);
  const progressRows = (progressRes.data ?? []);
  const progressByLesson: Record<string, { completed: boolean; last_position_s: number }> = {};
  for (const row of progressRows) {
    progressByLesson[row.lesson_id] = {
      completed: row.completed,
      last_position_s: row.last_position_s,
    };
  }

  const modules = (modulesRes.data ?? []).filter(Boolean).map((mod) => ({
    ...mod,
    lessons: lessons
      .filter((l) => l.module_id === mod.id)
      .map((l) => ({
        ...l,
        completed: progressByLesson[l.id]?.completed ?? false,
        last_position_s: progressByLesson[l.id]?.last_position_s ?? 0,
      })),
  })) as unknown as EadModuleWithLessons[];

  const activeLesson = lessons.find((l) => l.slug === lessonSlug);
  if (!activeLesson) return null;

  const allLessons = lessons;
  const currentIdx = allLessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const completedCount = lessons.filter((l) => progressByLesson[l.id]?.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Resolve user profile for watermark
  const { data: profile } = await db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const watermarkText = `${profile?.full_name ?? "Aluno"} • ${user.email}`;
  const initialPosition = progressByLesson[activeLesson.id]?.last_position_s ?? 0;

  return {
    tenant,
    settings,
    course,
    modules,
    activeLesson: activeLesson as EadLessonWithProgress,
    enrollment,
    prevLesson,
    nextLesson,
    progressPercent,
    watermarkText,
    initialPosition,
    attachments: attachmentsRes.data ?? [],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonSlug: string }> }): Promise<Metadata> {
  const { lessonSlug } = await params;
  return { title: `Aula — ${lessonSlug.replace(/-/g, " ")}` };
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  const data = await getPageData(slug, lessonSlug);

  if (!data) notFound();
  if (data === "not_enrolled") redirect(`/ead/cursos/${slug}`);

  const {
    tenant, settings, course, modules, activeLesson,
    enrollment, prevLesson, nextLesson, progressPercent, watermarkText,
    initialPosition, attachments,
  } = data;

  const primaryColor = settings?.primary_color ?? "#1B4332";

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto">

        {/* Expiry banner */}
        <ExpiryBanner
          expiresAt={enrollment.expires_at}
          courseTitle={course.title}
          renewHref={`/ead/checkout/${course.id}`}
          primaryColor={primaryColor}
        />

        {/* Breadcrumb */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 text-xs text-muted-foreground bg-white">
          <Link href="/ead" className="hover:text-foreground transition-colors">{tenant.name}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/ead/curso/${slug}`} className="hover:text-foreground transition-colors">{course.title}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{activeLesson.title}</span>
        </div>

        <div className="flex-1 p-4 md:p-6 flex flex-col gap-6">

          {/* Video player */}
          {activeLesson.content_type === "video" && activeLesson.bunny_video_id && (
            <VideoPlayer
              lessonId={activeLesson.id}
              watermarkText={watermarkText}
              initialPositionS={initialPosition}
            />
          )}

          {/* Text content */}
          {activeLesson.content_type === "texto" && activeLesson.content_body && (
            <div className="bg-white rounded-xl border border-border p-6">
              <BookOpen className="h-8 w-8 mb-4" style={{ color: primaryColor }} />
              <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {activeLesson.content_body}
              </div>
            </div>
          )}

          {/* External link */}
          {activeLesson.content_type === "link_externo" && activeLesson.external_url && (
            <div className="bg-white rounded-xl border border-border p-6 flex flex-col items-center gap-4 text-center">
              <Link2 className="h-10 w-10" style={{ color: primaryColor }} />
              <p className="text-sm text-muted-foreground">Este conteúdo está hospedado externamente.</p>
              <Button asChild style={{ background: primaryColor }} className="text-white font-semibold">
                <a href={activeLesson.external_url} target="_blank" rel="noopener noreferrer">
                  Acessar conteúdo
                </a>
              </Button>
            </div>
          )}

          {/* PDF */}
          {activeLesson.content_type === "pdf" && activeLesson.pdf_url && (
            <div className="bg-white rounded-xl border border-border p-6 flex flex-col items-center gap-4 text-center">
              <FileText className="h-10 w-10" style={{ color: primaryColor }} />
              <p className="text-sm text-muted-foreground">Material em PDF disponível para download.</p>
              <Button asChild style={{ background: primaryColor }} className="text-white font-semibold">
                <a href={activeLesson.pdf_url} target="_blank" rel="noopener noreferrer" download>
                  Baixar PDF
                </a>
              </Button>
            </div>
          )}

          {/* Lesson info */}
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading font-bold text-xl">{activeLesson.title}</h1>
            {activeLesson.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{activeLesson.description}</p>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm mb-3">Recursos desta aula</h3>
              <div className="flex flex-col gap-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:underline group"
                    style={{ color: primaryColor }}
                  >
                    {att.type === "file" ? (
                      <FileText className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Link2 className="h-4 w-4 flex-shrink-0" />
                    )}
                    {att.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pt-2 pb-6">
            {prevLesson ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/ead/curso/${slug}/${prevLesson.slug}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Link>
              </Button>
            ) : <div />}

            {nextLesson ? (
              <Button
                asChild
                size="sm"
                className="text-white font-semibold"
                style={{ background: primaryColor }}
              >
                <Link href={`/ead/curso/${slug}/${nextLesson.slug}`}>
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-sm px-3 py-1.5">
                Curso concluído!
              </Badge>
            )}
          </div>
        </div>
      </main>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col flex-shrink-0">
        <LessonSidebar
          courseSlug={slug}
          modules={modules}
          activeLessonId={activeLesson.id}
          primaryColor={primaryColor}
          progressPercent={progressPercent}
        />
      </div>
    </div>
  );
}
