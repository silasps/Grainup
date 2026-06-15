import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Clock, Users, Award, BookOpen, ChevronDown,
  Star, PlayCircle, Lock, User2, ArrowRight,
} from "lucide-react";
import type { EadCourse, EadModule, EadLesson } from "@/types/ead";

export const revalidate = 120;

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function formatPrice(p: number): string {
  return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function getPageData(slug: string) {
  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);
  if (!tenant) return null;

  const [settings, db, supabase] = await Promise.all([
    getTenantSettings(tenant.id),
    createAdminClient(),
    createClient(),
  ]);

  const { data: course } = await db
    .from("ead_courses")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!course) return null;

  const [modulesRes, { data: { user } }, enrollmentRes] = await Promise.all([
    db
      .from("ead_modules")
      .select("id, title, is_free_preview, position")
      .eq("course_id", course.id)
      .order("position"),
    supabase.auth.getUser(),
    db
      .from("ead_enrollments")
      .select("id, status")
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  const moduleIds = (modulesRes.data ?? []).map((m) => m.id);
  const lessonsRes = moduleIds.length > 0
    ? await db.from("ead_lessons").select("id, module_id, title, content_type, duration_s, is_free_preview, position").in("module_id", moduleIds).order("position")
    : { data: [] };

  const modules = (modulesRes.data ?? []).map((mod) => ({
    ...mod,
    lessons: ((lessonsRes.data ?? []) as EadLesson[]).filter((l) => l.module_id === mod.id),
  }));

  const isEnrolled = user
    ? (enrollmentRes.data?.status === "ativa")
    : false;

  return { tenant, settings, course: course as EadCourse, modules, isEnrolled, isLoggedIn: !!user };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return {};
  return {
    title: `${data.course.title} — ${data.tenant.name}`,
    description: data.course.description_short ?? data.course.subtitle ?? undefined,
  };
}

/* ─── Module accordion (server component) ─── */
function ModuleRow({ mod, index, primaryColor }: {
  mod: EadModule & { lessons: Pick<EadLesson, "id" | "title" | "content_type" | "duration_s" | "is_free_preview">[] };
  index: number;
  primaryColor: string;
}) {
  const totalDuration = mod.lessons.reduce((acc, l) => acc + (l.duration_s ?? 0), 0);
  return (
    <details className="group border border-border rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer bg-white hover:bg-muted/30 transition-colors select-none">
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: primaryColor }}
          >
            {index + 1}
          </span>
          <span className="font-semibold text-sm">{mod.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{mod.lessons.length} aulas</span>
          {totalDuration > 0 && <span>{formatDuration(totalDuration)}</span>}
          <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
        </div>
      </summary>
      <div className="divide-y divide-border bg-muted/20">
        {mod.lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            {lesson.is_free_preview ? (
              <PlayCircle className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
            ) : (
              <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
            )}
            <span className="flex-1 text-foreground/80">{lesson.title}</span>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              {lesson.is_free_preview && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ color: primaryColor, background: `${primaryColor}18` }}>
                  Grátis
                </span>
              )}
              {lesson.duration_s && lesson.duration_s > 0 && (
                <span>{formatDuration(lesson.duration_s)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ─── Page ─── */
export default async function CourseLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) notFound();

  const { tenant, settings, course, modules, isEnrolled, isLoggedIn } = data;
  const primaryColor = settings?.primary_color ?? "#1B4332";
  const displayPrice = course.price_promotional ?? course.price;
  const hasDiscount = course.price_promotional !== null && course.price_promotional < course.price;
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = course.total_duration_s ?? 0;

  return (
    <div className="flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Left: info */}
          <div className="lg:col-span-2 text-white">
            <div className="flex flex-wrap gap-2 mb-4">
              {course.level && (
                <Badge className="bg-white/20 text-white border-0 text-xs font-medium capitalize">
                  {course.level === "iniciante" ? "Iniciante" : course.level === "intermediario" ? "Intermediário" : "Avançado"}
                </Badge>
              )}
              {course.is_free && (
                <Badge className="bg-emerald-400/90 text-white border-0 text-xs font-bold uppercase">
                  Gratuito
                </Badge>
              )}
            </div>

            <h1 className="font-heading font-extrabold text-2xl md:text-4xl leading-tight mb-3">
              {course.title}
            </h1>

            {course.subtitle && (
              <p className="text-white/80 text-lg mb-5 leading-relaxed">{course.subtitle}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-5 text-sm text-white/75">
              {totalDuration > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(totalDuration)} de conteúdo
                </span>
              )}
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {totalLessons} aulas
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Certificado incluso
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Acesso por {course.access_days > 0 ? `${course.access_days} dias` : "tempo ilimitado"}
              </span>
            </div>

            {course.instructor_name && (
              <div className="flex items-center gap-2 mt-5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 text-sm font-bold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  {course.instructor_name.charAt(0)}
                </div>
                <span className="text-white/80 text-sm">
                  Instrutor: <span className="text-white font-medium">{course.instructor_name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Right: price card (desktop) */}
          <div className="hidden lg:block">
            <PriceCard
              course={course}
              displayPrice={displayPrice}
              hasDiscount={hasDiscount}
              isEnrolled={isEnrolled}
              isLoggedIn={isLoggedIn}
              primaryColor={primaryColor}
              slug={slug}
            />
          </div>
        </div>
      </section>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Main column */}
        <div className="lg:col-span-2 flex flex-col gap-10">

          {/* What you'll learn */}
          {course.description_short && (
            <section>
              <h2 className="font-heading font-bold text-xl mb-5">O que você vai aprender</h2>
              <div className="bg-white rounded-2xl border border-border p-6">
                <p className="text-foreground/80 leading-relaxed">{course.description_short}</p>
              </div>
            </section>
          )}

          {/* Curriculum */}
          {modules.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-5">
                <h2 className="font-heading font-bold text-xl">Conteúdo do curso</h2>
                <span className="text-sm text-muted-foreground">
                  {modules.length} módulos · {totalLessons} aulas
                  {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {modules.map((mod, i) => (
                  <ModuleRow
                    key={mod.id}
                    mod={mod as EadModule & { lessons: EadLesson[] }}
                    index={i}
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Instructor */}
          {course.instructor_name && (
            <section>
              <h2 className="font-heading font-bold text-xl mb-5">Sobre o instrutor</h2>
              <div className="bg-white rounded-2xl border border-border p-6 flex gap-5">
                {course.instructor_photo_url ? (
                  <Image
                    src={course.instructor_photo_url}
                    alt={course.instructor_name}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                    style={{ background: primaryColor }}
                  >
                    {course.instructor_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-heading font-bold text-lg">{course.instructor_name}</h3>
                  {course.instructor_bio && (
                    <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{course.instructor_bio}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Full description */}
          {course.description_full && (
            <section>
              <h2 className="font-heading font-bold text-xl mb-5">Descrição completa</h2>
              <div className="prose prose-sm max-w-none text-foreground/80">
                <p className="leading-relaxed whitespace-pre-wrap">{course.description_full}</p>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: price card (mobile shows here, desktop is in hero) */}
        <div className="lg:col-span-1">
          <div className="lg:hidden mb-8">
            <PriceCard
              course={course}
              displayPrice={displayPrice}
              hasDiscount={hasDiscount}
              isEnrolled={isEnrolled}
              isLoggedIn={isLoggedIn}
              primaryColor={primaryColor}
              slug={slug}
            />
          </div>

          {/* Includes list */}
          <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3 sticky top-20">
            <h3 className="font-semibold text-sm">Este curso inclui:</h3>
            <ul className="space-y-2.5 text-sm text-foreground/80">
              {totalLessons > 0 && (
                <li className="flex items-center gap-2.5">
                  <PlayCircle className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  {totalLessons} aulas em vídeo
                </li>
              )}
              {totalDuration > 0 && (
                <li className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  {formatDuration(totalDuration)} de conteúdo
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <Award className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                Certificado de conclusão
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                Acesso por {course.access_days > 0 ? `${course.access_days} dias` : "tempo ilimitado"}
              </li>
              <li className="flex items-center gap-2.5">
                <User2 className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                Suporte do instrutor
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA (mobile sticky alternative) ─────────────────────── */}
      {!isEnrolled && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 border-t border-border bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            {course.is_free ? (
              <span className="font-bold text-emerald-600">Gratuito</span>
            ) : (
              <div>
                <span className="font-bold text-lg" style={{ color: primaryColor }}>
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="ml-2 text-xs text-muted-foreground line-through">{formatPrice(course.price)}</span>
                )}
              </div>
            )}
          </div>
          <Button
            asChild
            className="flex-shrink-0 font-bold"
            style={{ background: primaryColor, color: "white" }}
          >
            <Link href={isLoggedIn ? `/ead/checkout/${course.id}` : `/auth/cadastro?redirectTo=/ead/cursos/${slug}`}>
              {course.is_free ? "Matricular grátis" : "Matricular agora"}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Price card sub-component ─── */
function PriceCard({
  course, displayPrice, hasDiscount, isEnrolled, isLoggedIn, primaryColor, slug,
}: {
  course: EadCourse;
  displayPrice: number;
  hasDiscount: boolean;
  isEnrolled: boolean;
  isLoggedIn: boolean;
  primaryColor: string;
  slug: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
      {course.thumbnail_url && (
        <div className="aspect-video relative">
          <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
              <PlayCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col gap-4">
        {isEnrolled ? (
          <>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              Você já está matriculado!
            </div>
            <Button
              asChild
              size="lg"
              className="w-full font-bold text-white"
              style={{ background: primaryColor }}
            >
              <Link href={`/ead/curso/${slug}`}>
                Continuar aprendendo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            {course.is_free ? (
              <div className="text-center">
                <p className="text-3xl font-extrabold text-emerald-600">Gratuito</p>
              </div>
            ) : (
              <div className="text-center">
                {hasDiscount && (
                  <p className="text-sm text-muted-foreground line-through">
                    de {formatPrice(course.price)}
                  </p>
                )}
                <p className="text-3xl font-extrabold" style={{ color: primaryColor }}>
                  {formatPrice(displayPrice)}
                </p>
                {hasDiscount && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Economize {formatPrice(course.price - displayPrice)}
                  </p>
                )}
              </div>
            )}

            <Button
              asChild
              size="lg"
              className="w-full font-bold text-white text-base py-6"
              style={{ background: primaryColor }}
            >
              <Link
                href={
                  isLoggedIn
                    ? course.is_free
                      ? `/ead/checkout/${course.id}`
                      : `/ead/checkout/${course.id}`
                    : `/auth/cadastro?redirectTo=/ead/cursos/${slug}`
                }
              >
                {course.is_free ? "Matricular grátis" : "Matricular agora"}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Garantia de 7 dias ou seu dinheiro de volta
            </p>

            <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Acesso imediato após a matrícula</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Certificado ao concluir</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Suporte do instrutor</li>
              <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-amber-400" /> Qualidade garantida</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
