import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getMyTenant } from "@/lib/actions/get-my-tenant";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Search } from "lucide-react";
import { EnrollStudentDialog } from "@/components/ead/admin/enroll-student-dialog";

export const metadata: Metadata = { title: "Alunos — EAD" };
export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  ativa:     "bg-emerald-100 text-emerald-700",
  expirada:  "bg-gray-100 text-gray-500",
  suspensa:  "bg-yellow-100 text-yellow-700",
  cancelada: "bg-red-100 text-red-600",
};

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; curso?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [role, tenant] = await Promise.all([
    getMyRole(user.id),
    getMyTenant(user.id),
  ]);

  const db = await createAdminClient();
  const isSuperAdmin = role === "super_admin";

  // Fetch courses for the filter dropdown
  const coursesQuery = db
    .from("ead_courses")
    .select("id, title")
    .order("title", { ascending: true });
  if (!isSuperAdmin && tenant) coursesQuery.eq("tenant_id", tenant.id);
  const { data: courses } = await coursesQuery;

  // Build enrollments query
  const query = db
    .from("ead_enrollments")
    .select(`
      id,
      status,
      enrolled_at,
      expires_at,
      user_id,
      course_id,
      ead_courses ( id, title, tenant_id )
    `)
    .order("enrolled_at", { ascending: false })
    .limit(100);

  if (!isSuperAdmin && tenant) {
    // Note: cross-table filter — Supabase resolves via FK relation
    query.eq("ead_courses.tenant_id" as "course_id", tenant.id as unknown as string);
  }
  if (params.curso) query.eq("course_id", params.curso);
  if (params.status) query.eq("status", params.status as "ativa" | "expirada" | "suspensa" | "cancelada");

  const { data: enrollments } = await query;

  type Row = {
    id: string;
    status: string;
    enrolled_at: string;
    expires_at: string;
    user_id: string;
    course_id: string;
    ead_courses: { id: string; title: string; tenant_id: string } | null;
  };

  const rows = (enrollments ?? []) as unknown as Row[];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Alunos" subtitle={tenant?.name ?? "Todas as matrículas"} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <form className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Buscar..."
                className="pl-8 pr-3 h-9 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring w-48"
              />
            </form>

            <form>
              <select
                name="curso"
                defaultValue={params.curso ?? ""}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("curso", e.target.value);
                  window.location.href = url.toString();
                }}
                className="h-9 rounded-md border border-input bg-background text-sm px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos os cursos</option>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </form>

            <div className="flex gap-1">
              {(["", "ativa", "expirada", "suspensa", "cancelada"] as const).map((s) => {
                const active = (params.status ?? "") === s;
                const label = s === "" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1);
                const href = s
                  ? `/admin/ead/alunos?status=${s}${params.curso ? `&curso=${params.curso}` : ""}`
                  : `/admin/ead/alunos${params.curso ? `?curso=${params.curso}` : ""}`;
                return (
                  <Link
                    key={s}
                    href={href}
                    className={cn(
                      "h-9 px-3 text-sm rounded-md border transition-colors",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <EnrollStudentDialog courses={courses ?? []} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aluno (ID)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Curso</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Matriculado em</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Expira em</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                        {row.user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                        {row.ead_courses?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {formatDate(row.enrolled_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {row.expires_at ? formatDate(row.expires_at) : "Vitalício"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            "text-xs font-medium border-0 capitalize",
                            STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-500"
                          )}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <EnrollmentActions enrollmentId={row.id} currentStatus={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EnrollmentActions({
  enrollmentId,
  currentStatus,
}: {
  enrollmentId: string;
  currentStatus: string;
}) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/admin/ead/alunos/${enrollmentId}`}>Ver</Link>
    </Button>
  );
}
