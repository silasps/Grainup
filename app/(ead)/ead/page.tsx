import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { CourseCard } from "@/components/ead/course-card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, BookOpen, ArrowRight } from "lucide-react";
import type { CourseCardData } from "@/components/ead/course-card";

export const metadata: Metadata = { title: "Minha área de aprendizado" };
export const dynamic = "force-dynamic";

async function getStudentData() {
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

  const { data: enrollments } = await db
    .from("ead_enrollments")
    .select(`
      id,
      status,
      expires_at,
      course_id,
      ead_courses ( id, slug, title, subtitle, thumbnail_url, instructor_name, price, price_promotional, is_free, is_featured, total_lessons, total_duration_s, level )
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  // Fetch progress for each enrollment
  const progressMap: Record<string, number> = {};
  if (enrollments && enrollments.length > 0) {
    const enrollmentIds = enrollments.map((e) => e.id);
    const { data: progressRows } = await db
      .from("ead_lesson_progress")
      .select("enrollment_id, completed")
      .in("enrollment_id", enrollmentIds);

    const lessonCounts: Record<string, { total: number; done: number }> = {};
    for (const e of enrollments) {
      const course = (e.ead_courses as unknown as { total_lessons: number } | null);
      if (course) lessonCounts[e.id] = { total: course.total_lessons, done: 0 };
    }
    for (const p of progressRows ?? []) {
      if (p.completed && lessonCounts[p.enrollment_id]) {
        lessonCounts[p.enrollment_id].done++;
      }
    }
    for (const [enrollId, counts] of Object.entries(lessonCounts)) {
      progressMap[enrollId] =
        counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
    }
  }

  const certificates = await db
    .from("ead_certificates")
    .select("id, course_title, issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  return { user, tenant, settings, enrollments: enrollments ?? [], progressMap, certificates: certificates.data ?? [] };
}

export default async function StudentDashboardPage() {
  const data = await getStudentData();
  if (!data) redirect("/auth/login?redirectTo=/ead");

  const { tenant, settings, enrollments, progressMap, certificates } = data;
  const primaryColor = settings?.primary_color ?? "#1B4332";

  type EnrollmentRow = {
    id: string;
    status: string;
    expires_at: string;
    course_id: string;
    ead_courses: CourseCardData | null;
  };

  const rows = enrollments as unknown as EnrollmentRow[];
  const activeCourses = rows.filter((e) => e.status === "ativa");
  const completedCourses = rows.filter((e) => progressMap[e.id] === 100);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-10">

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl">Minha área</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenant.name} — seus cursos e certificados</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/ead/cursos">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Explorar mais cursos
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Cursos ativos", value: activeCourses.length, icon: GraduationCap },
          { label: "Concluídos", value: completedCourses.length, icon: Award },
          { label: "Certificados", value: certificates.length, icon: Award },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${primaryColor}18` }}
            >
              <s.icon className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active courses */}
      {activeCourses.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-lg mb-4">Continuar aprendendo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {activeCourses.map((e) =>
              e.ead_courses ? (
                <CourseCard
                  key={e.id}
                  course={{
                    ...e.ead_courses,
                    enrolled: true,
                    progress_percent: progressMap[e.id] ?? 0,
                  }}
                  primaryColor={primaryColor}
                />
              ) : null
            )}
          </div>
        </section>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" style={{ color: primaryColor }} />
            Meus certificados
          </h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-sm">{cert.course_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emitido em {new Date(cert.issued_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button size="sm" asChild variant="outline">
                  <Link href={`/ead/certificados`}>
                    Ver
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="font-heading font-bold text-xl mb-2">Ainda sem cursos</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Explore o catálogo e comece sua jornada de aprendizado.
          </p>
          <Button asChild style={{ background: primaryColor }} className="text-white font-semibold">
            <Link href="/ead/cursos">
              Explorar cursos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
