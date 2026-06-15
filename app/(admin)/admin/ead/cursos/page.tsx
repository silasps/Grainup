import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getMyTenant } from "@/lib/actions/get-my-tenant";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, BookOpen, Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Cursos — Admin EAD" };
export const revalidate = 30;

export default async function CursosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [role, tenant] = await Promise.all([
    getMyRole(user.id),
    getMyTenant(user.id),
  ]);

  const db = await createAdminClient();
  const query = db
    .from("ead_courses")
    .select("id, title, slug, thumbnail_url, price, price_promotional, is_active, is_free, total_lessons, total_duration_s, level, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (role !== "super_admin" && tenant) {
    query.eq("tenant_id", tenant.id);
  }

  const { data: courses } = await query;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Cursos" subtitle="Gerencie o catálogo de cursos" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              {courses?.length ?? 0} curso{courses?.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" asChild>
              <Link href="/admin/ead/cursos/novo">
                <Plus className="h-4 w-4 mr-1.5" /> Novo curso
              </Link>
            </Button>
          </div>

          {!courses?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground mb-1">Nenhum curso ainda</p>
              <p className="text-sm text-muted-foreground mb-5">
                Crie o primeiro curso da plataforma.
              </p>
              <Button asChild>
                <Link href="/admin/ead/cursos/novo">
                  <Plus className="h-4 w-4 mr-1.5" /> Criar curso
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {course.total_lessons} aula{course.total_lessons !== 1 ? "s" : ""}
                      {course.level && ` · ${course.level}`}
                    </p>
                  </div>

                  {/* Preço */}
                  <div className="hidden sm:block text-right flex-shrink-0">
                    {course.is_free ? (
                      <span className="text-sm font-medium text-emerald-600">Gratuito</span>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(course.price_promotional ?? course.price)}
                        </p>
                        {course.price_promotional && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(course.price)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <Badge
                    className={cn(
                      "text-xs border-0 flex-shrink-0",
                      course.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {course.is_active ? "Ativo" : "Rascunho"}
                  </Badge>

                  {/* Editar */}
                  <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                    <Link href={`/admin/ead/cursos/${course.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
