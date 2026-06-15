import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getMyTenant } from "@/lib/actions/get-my-tenant";
import { GraduationCap, Users, CheckCircle2, TrendingUp, Award } from "lucide-react";

export const metadata: Metadata = { title: "Relatórios EAD" };
export const revalidate = 300;

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [role, tenant] = await Promise.all([
    getMyRole(user.id),
    getMyTenant(user.id),
  ]);

  const db = await createAdminClient();
  const isSuperAdmin = role === "super_admin";

  const coursesBaseQuery = db
    .from("ead_courses")
    .select("id, title, is_active, total_lessons", { count: "exact" });
  const coursesQuery = !isSuperAdmin && tenant
    ? coursesBaseQuery.eq("tenant_id", tenant.id)
    : coursesBaseQuery;

  const [coursesRes, enrollmentsRes, progressRes, certificatesRes, completedRes] = await Promise.all([
    coursesQuery,
    db.from("ead_enrollments").select("id, status, enrolled_at", { count: "exact" }),
    db.from("ead_lesson_progress").select("id", { count: "exact" }).eq("completed", true),
    db.from("ead_certificates").select("id", { count: "exact" }),
    db.from("ead_enrollments").select("id", { count: "exact" }).eq("status", "ativa"),
  ]);

  const courses = (coursesRes.data ?? []) as Array<{
    id: string;
    title: string;
    is_active: boolean;
    total_lessons: number;
  }>;

  const totalEnrollments = enrollmentsRes.count ?? 0;
  const activeEnrollments = completedRes.count ?? 0;
  const totalCompletions = progressRes.count ?? 0;
  const totalCertificates = certificatesRes.count ?? 0;

  // Completion rate estimate
  const completionRate =
    totalEnrollments > 0
      ? Math.round((totalCertificates / totalEnrollments) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Relatórios"
        subtitle={tenant?.name ?? "Visão geral da plataforma"}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Cursos publicados"
            value={courses.filter((c) => c.is_active).length}
            sub={`${coursesRes.count ?? 0} total`}
            icon={GraduationCap}
          />
          <StatCard
            label="Total de matrículas"
            value={totalEnrollments}
            sub="todas as situações"
            icon={Users}
          />
          <StatCard
            label="Matrículas ativas"
            value={activeEnrollments}
            sub="acessando agora"
            icon={TrendingUp}
          />
          <StatCard
            label="Aulas concluídas"
            value={totalCompletions}
            sub="total da plataforma"
            icon={CheckCircle2}
          />
          <StatCard
            label="Certificados emitidos"
            value={totalCertificates}
            sub={`${completionRate}% taxa de conclusão`}
            icon={Award}
          />
        </div>

        {/* Por curso */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Desempenho por curso</h2>
          </div>
          {courses.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum curso ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Curso</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aulas</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{course.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.total_lessons}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            course.is_active
                              ? "text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-medium"
                              : "text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium"
                          }
                        >
                          {course.is_active ? "Ativo" : "Rascunho"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pb-2">
          Relatórios avançados com gráficos de progresso e abandono serão adicionados em breve.
        </p>
      </main>
    </div>
  );
}
