import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { CourseCard } from "@/components/ead/course-card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, PlayCircle, Award, Clock, Laptop,
  Star, ArrowRight, Users, CheckCircle2, Sparkles,
  BookOpen, ChevronRight,
} from "lucide-react";
import type { CourseCardData } from "@/components/ead/course-card";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);
  return {
    title: `Cursos — ${tenant?.name ?? "EAD"}`,
    description: `Conheça os cursos online de ${tenant?.name ?? "nossa plataforma"} e transforme seu aprendizado.`,
  };
}

async function getPageData() {
  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const tenant = await getTenantFromHostname(hostname);

  if (!tenant) return { tenant: null, settings: null, courses: [], stats: null };

  const [settings, db] = await Promise.all([
    getTenantSettings(tenant.id),
    createAdminClient(),
  ]);

  const [coursesRes, statsRes] = await Promise.all([
    db
      .from("ead_courses")
      .select("id, slug, title, subtitle, thumbnail_url, instructor_name, price, price_promotional, is_free, is_featured, total_lessons, total_duration_s, level")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true }),
    db
      .from("ead_enrollments")
      .select("id", { count: "exact" })
      .eq("status", "ativa"),
  ]);

  const courses = (coursesRes.data ?? []) as CourseCardData[];
  const totalEnrolled = statsRes.count ?? 0;
  const totalHours = Math.round(
    courses.reduce((acc, c) => acc + (c.total_duration_s ?? 0), 0) / 3600
  );

  return {
    tenant,
    settings,
    courses,
    stats: {
      courses:  courses.length,
      enrolled: totalEnrolled,
      hours:    totalHours,
    },
  };
}

/* ─── Testimonials (hardcoded as placeholder until ead_reviews has data) ─── */
const TESTIMONIALS = [
  {
    id: 1,
    name: "Maria Fernanda",
    role: "Aluna desde 2024",
    body: "A qualidade dos vídeos e a didática do instrutor são excepcionais. Aprendi em semanas o que levaria meses em outros cursos.",
    rating: 5,
    avatar: null,
  },
  {
    id: 2,
    name: "Carlos Eduardo",
    role: "Profissional em transição",
    body: "Plataforma fluída, certificado reconhecido e suporte ágil. Recomendo sem hesitar para quem quer crescer de verdade.",
    rating: 5,
    avatar: null,
  },
  {
    id: 3,
    name: "Patrícia Sousa",
    role: "Empreendedora",
    body: "O acesso às aulas a qualquer hora foi fundamental para conciliar com minha rotina. Conteúdo rico e prático.",
    rating: 5,
    avatar: null,
  },
];

/* ─── Component helpers ─────────────────────────────────────────────────── */

function StatBadge({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-white/80 flex-shrink-0" />
      <div>
        <p className="text-white font-bold text-base leading-none">{value}</p>
        <p className="text-white/70 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DifferentiatorCard({ icon: Icon, title, description, color }: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-border hover:shadow-md transition-shadow gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-7 w-7" style={{ color }} />
      </div>
      <div>
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? "fill-amber-400 text-amber-400" : "text-muted"}`}
        />
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function CatalogPage() {
  const { tenant, settings, courses, stats } = await getPageData();
  const primaryColor = settings?.primary_color ?? "#1B4332";
  const featuredCourses = courses.filter((c) => c.is_featured).slice(0, 4);
  const allCourses = courses;

  if (!tenant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-heading font-bold mb-2">Plataforma não encontrada</h1>
        <p className="text-muted-foreground">Este domínio não está associado a nenhuma plataforma EAD.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 60%, ${primaryColor}99 100%)` }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-white/90" />
              <span className="text-white/90 text-xs font-semibold uppercase tracking-widest">
                {tenant.name}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading font-extrabold text-white text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-4">
              Aprenda.<br />
              <span className="text-white/80">Cresça.</span>
              {" "}Transforme.
            </h1>

            <p className="text-white/80 text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
              Cursos online com qualidade premium, acesso flexível e certificado incluso.
              Sua evolução começa aqui.
            </p>

            {/* Stats row */}
            {stats && (
              <div className="flex flex-wrap gap-3 mb-10">
                {stats.enrolled > 0 && (
                  <StatBadge icon={Users} value={`${stats.enrolled.toLocaleString("pt-BR")}+`} label="alunos" />
                )}
                {stats.hours > 0 && (
                  <StatBadge icon={Clock} value={`${stats.hours}h`} label="de conteúdo" />
                )}
                <StatBadge icon={Award} value="Certificado" label="incluso" />
                <StatBadge icon={Laptop} value="100%" label="online" />
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white font-bold text-sm px-6 hover:bg-white/90 shadow-lg"
                style={{ color: primaryColor }}
              >
                <a href="#cursos">
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Explorar cursos
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 bg-transparent font-semibold text-sm px-6"
              >
                <Link href="/auth/cadastro">
                  Criar conta grátis
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0 h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48L60 42C120 36 240 24 360 18C480 12 600 12 720 18C840 24 960 36 1080 39C1200 42 1320 36 1380 33L1440 30V48H0Z" fill="white" className="dark:fill-background" />
          </svg>
        </div>
      </section>

      {/* ── FEATURED COURSES ────────────────────────────────────────────── */}
      {featuredCourses.length > 0 && (
        <section id="cursos" className="container mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
                Em destaque
              </p>
              <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground">
                Cursos mais procurados
              </h2>
            </div>
            {allCourses.length > 4 && (
              <Button variant="outline" size="sm" asChild>
                <a href="#todos">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredCourses.map((course) => (
              <CourseCard key={course.id} course={course} primaryColor={primaryColor} />
            ))}
          </div>
        </section>
      )}

      {/* ── DIFFERENTIATORS ─────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
              Por que estudar aqui
            </p>
            <h2 className="font-heading font-bold text-2xl md:text-3xl">
              Tudo que você precisa para aprender
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <DifferentiatorCard
              icon={PlayCircle}
              title="Aulas em vídeo HD"
              description="Conteúdo gravado em alta qualidade, assista no celular, tablet ou computador."
              color={primaryColor}
            />
            <DifferentiatorCard
              icon={Award}
              title="Certificado incluso"
              description="Certificado digital emitido automaticamente ao concluir 100% do curso."
              color={primaryColor}
            />
            <DifferentiatorCard
              icon={Clock}
              title="Acesso flexível"
              description="Assista quando e onde quiser, sem horário fixo, no seu próprio ritmo."
              color={primaryColor}
            />
            <DifferentiatorCard
              icon={CheckCircle2}
              title="Suporte dedicado"
              description="Tire dúvidas diretamente com o instrutor e com a comunidade de alunos."
              color={primaryColor}
            />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
            Depoimentos
          </p>
          <h2 className="font-heading font-bold text-2xl md:text-3xl">
            O que nossos alunos dizem
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <StarRating count={t.rating} />
              <p className="text-sm text-foreground/80 leading-relaxed flex-1">
                &ldquo;{t.body}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: primaryColor }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ALL COURSES ─────────────────────────────────────────────────── */}
      {allCourses.length > 0 && (
        <section id="todos" className="bg-muted/20 py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
                  Catálogo completo
                </p>
                <h2 className="font-heading font-bold text-2xl md:text-3xl">
                  Todos os cursos
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    ({allCourses.length})
                  </span>
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allCourses.map((course) => (
                <CourseCard key={course.id} course={course} primaryColor={primaryColor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto max-w-3xl px-4 text-center relative">
          <BookOpen className="h-12 w-12 text-white/60 mx-auto mb-5" />
          <h2 className="font-heading font-extrabold text-white text-3xl md:text-4xl mb-4">
            Sua transformação começa hoje.
          </h2>
          <p className="text-white/75 text-lg mb-8 leading-relaxed">
            Junte-se a centenas de alunos que já estão aprendendo e conquistando novos horizontes.
            Crie sua conta gratuitamente e comece agora.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white font-bold text-sm px-8 py-3 shadow-lg hover:bg-white/90"
              style={{ color: primaryColor }}
            >
              <Link href="/auth/cadastro">
                Criar conta grátis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent font-semibold text-sm px-8"
            >
              <a href="#cursos">Ver cursos</a>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
