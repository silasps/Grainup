import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getMyTenant } from "@/lib/actions/get-my-tenant";
import { formatDate } from "@/lib/utils/format";
import {
  GraduationCap,
  Users,
  TrendingUp,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard EAD" };
export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  ativa:     "bg-emerald-100 text-emerald-700",
  expirada:  "bg-gray-100 text-gray-500",
  suspensa:  "bg-yellow-100 text-yellow-700",
  cancelada: "bg-red-100 text-red-600",
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
}) {
  const card = (
    <div className="h-full bg-white rounded-xl border border-border p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
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
  return href ? <Link className="block h-full" href={href}>{card}</Link> : card;
}

export default async function EadDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [role, tenant] = await Promise.all([
    getMyRole(user.id),
    getMyTenant(user.id),
  ]);

  const db = await createAdminClient();
  const isSuperAdmin = role === "super_admin";

  // Super admin vê todos os tenants; admin_ead vê apenas o seu
  const coursesQuery = db.from("ead_courses").select("id, is_active", { count: "exact" });
  const enrollmentsQuery = db.from("ead_enrollments").select("id, status, enrolled_at, expires_at, user_id, course_id, ead_courses(title)", { count: "exact" });

  if (!isSuperAdmin && tenant) {
    coursesQuery.eq("tenant_id", tenant.id);
    enrollmentsQuery.eq("ead_courses.tenant_id", tenant.id);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [coursesRes, enrollmentsRes, newEnrollmentsRes, progressRes] = await Promise.all([
    coursesQuery,
    enrollmentsQuery.order("enrolled_at", { ascending: false }).limit(10),
    db.from("ead_enrollments")
      .select("id", { count: "exact" })
      .gte("enrolled_at", startOfMonth),
    db.from("ead_lesson_progress")
      .select("id", { count: "exact" })
      .eq("completed", true),
  ]);

  const totalCourses = coursesRes.count ?? 0;
  const activeCourses = (coursesRes.data ?? []).filter((c) => c.is_active).length;
  const totalEnrollments = enrollmentsRes.count ?? 0;
  const newThisMonth = newEnrollmentsRes.count ?? 0;
  const recentEnrollments = (enrollmentsRes.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    enrolled_at: string;
    expires_at: string;
    user_id: string;
    ead_courses: { title: string } | null;
  }>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Dashboard EAD" subtitle={tenant?.name ?? "Visão geral"} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Cursos ativos"
            value={activeCourses}
            sub={`${totalCourses} total`}
            icon={GraduationCap}
            href="/admin/ead/cursos"
          />
          <KpiCard
            label="Alunos matriculados"
            value={totalEnrollments}
            sub="matrículas ativas e inativas"
            icon={Users}
            href="/admin/ead/alunos"
          />
          <KpiCard
            label="Novas matrículas"
            value={newThisMonth}
            sub="neste mês"
            icon={TrendingUp}
          />
          <KpiCard
            label="Aulas concluídas"
            value={progressRes.count ?? 0}
            sub="total da plataforma"
            icon={CheckCircle2}
          />
        </div>

        {/* Matrículas recentes */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Matrículas recentes</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ead/alunos">
                Ver todos <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {recentEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma matrícula ainda.</p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/admin/ead/cursos/novo">
                  <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro curso
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentEnrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {e.ead_courses?.title ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expira {formatDate(e.expires_at)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(e.enrolled_at)}
                  </span>
                  <Badge
                    className={cn(
                      "text-xs font-medium border-0 capitalize",
                      STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-500"
                    )}
                  >
                    {e.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
