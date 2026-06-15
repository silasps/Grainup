import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Lock, PlayCircle, ArrowRight, Award } from "lucide-react";
import type { EadModule, EadLesson } from "@/types/ead";

export const dynamic = "force-dynamic";

async function getPageData(slug: string) {
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
    .select("id, title, slug, description_short, is_active, certificate_enabled")
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .maybeSingle();

  if (!course || !course.is_active) return null;

  const { data: enrollment } = await db
    .from("ead_enrollments")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== "ativa") return "not_enrolled";

  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    db.from("ead_modules").select("*").eq("course_id", course.id).order("position"),
    db.from("ead_lessons").select("id, module_id, title, slug, content_type, duration_s, is_free_preview, publish_at, position").eq("course_id", course.id).order("position"),
    db.from("ead_lesson_progress").select("lesson_id, completed").eq("enrollment_id", enrollment.id).eq("completed", true),
  ]);

  const completedIds = new Set((progressRes.data ?? []).map((p) => p.lesson_id));
  const lessons = (lessonsRes.data ?? []) as EadLesson[];
  const modules = ((modulesRes.data ?? []) as EadModule[]).map((mod) => ({
    ...mod,
    lessons: lessons.filter((l) => l.module_id === mod.id).map((l) => ({
      ...l,
      completed: completedIds.has(l.id),
    })),
  }));

  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Find the first incomplete lesson to resume
  const firstIncomplete = lessons.find((l) => !completedIds.has(l.id)) ?? lessons[0];

  return { tenant, settings, course, modules, progressPercent, firstIncomplete, enrollment };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data || data === "not_enrolled") return {};
  return { title: `${data.course.title} — Conteúdo` };
}

export default async function CourseAreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) notFound();
  if (data === "not_enrolled") redirect(`/ead/cursos/${slug}`);

  const { tenant, settings, course, modules, progressPercent, firstIncomplete } = data;
  const primaryColor = settings?.primary_color ?? "#1B4332";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl">{course.title}</h1>
          {course.description_short && (
            <p className="text-muted-foreground text-sm mt-1">{course.description_short}</p>
          )}
        </div>
        {firstIncomplete && (
          <Button
            asChild
            className="flex-shrink-0 font-bold text-white shadow-md"
            style={{ background: primaryColor }}
          >
            <Link href={`/ead/curso/${slug}/${firstIncomplete.slug}`}>
              {progressPercent === 0 ? "Começar" : "Continuar"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso do curso</span>
          <span className="font-bold" style={{ color: primaryColor }}>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {progressPercent === 100 && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold mt-1">
            <Award className="h-4 w-4" />
            Parabéns! Curso concluído.
            {course.certificate_enabled && (
              <Link href="/ead/certificados" className="underline ml-1">Ver certificado</Link>
            )}
          </div>
        )}
      </div>

      {/* Module list */}
      <div className="flex flex-col gap-4">
        {modules.map((mod, mIdx) => {
          const completedInMod = mod.lessons.filter((l) => l.completed).length;
          return (
            <div key={mod.id} className="bg-white rounded-xl border border-border overflow-hidden">
              {/* Module header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: primaryColor }}
                  >
                    {mIdx + 1}
                  </span>
                  <span className="font-semibold text-sm">{mod.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedInMod}/{mod.lessons.length}
                </span>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-border">
                {mod.lessons.map((lesson) => {
                  const available =
                    lesson.is_free_preview ||
                    !lesson.publish_at ||
                    new Date(lesson.publish_at) <= new Date();

                  const content = (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      {lesson.completed ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      ) : available ? (
                        <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                      ) : (
                        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/30" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lesson.duration_s && lesson.duration_s > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Math.ceil(lesson.duration_s / 60)}min
                          </span>
                        )}
                        {available && !lesson.completed && (
                          <PlayCircle className="h-4 w-4" style={{ color: primaryColor }} />
                        )}
                      </div>
                    </div>
                  );

                  return available ? (
                    <Link
                      key={lesson.id}
                      href={`/ead/curso/${slug}/${lesson.slug}`}
                      className="block hover:bg-muted/20 transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={lesson.id} className="opacity-60 cursor-not-allowed">{content}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
