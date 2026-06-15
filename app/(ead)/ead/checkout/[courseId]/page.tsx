import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { AdminHeader } from "@/components/admin/header";
import { EadCheckoutFlow } from "@/components/ead/student/ead-checkout-flow";
import { enrollFreeAction } from "@/lib/actions/ead/checkout-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = { title: "Finalizar matrícula" };
export const dynamic = "force-dynamic";

async function getPageData(courseId: string) {
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
    .select("id, slug, title, subtitle, thumbnail_url, instructor_name, price, price_promotional, is_free, access_days, is_active")
    .eq("id", courseId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!course || !course.is_active) return null;

  // Verifica se já está matriculado
  const { data: enrollment } = await db
    .from("ead_enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, cpf")
    .eq("id", user.id)
    .maybeSingle();

  return {
    tenant,
    settings,
    course,
    user,
    profile,
    alreadyEnrolled: enrollment?.status === "ativa",
  };
}

export default async function CheckoutPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const data = await getPageData(courseId);

  if (!data) redirect(`/auth/login?redirectTo=/ead/checkout/${courseId}`);

  const { tenant, settings, course, user, profile, alreadyEnrolled } = data;
  const primaryColor = settings?.primary_color ?? "#1B4332";

  // Já matriculado → redireciona direto
  if (alreadyEnrolled) redirect(`/ead/curso/${course.slug}`);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mini-header */}
      <div
        className="h-14 flex items-center px-4 border-b border-white/10"
        style={{ background: primaryColor }}
      >
        <Link href={`/ead/cursos/${course.slug}`} className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
          <GraduationCap className="h-5 w-5" />
          <span className="font-semibold">{tenant.name}</span>
        </Link>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-2xl md:text-3xl">
            {course.is_free ? "Confirmar matrícula gratuita" : "Finalizar matrícula"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {course.is_free
              ? "Clique abaixo para liberar o acesso imediatamente."
              : "Pagamento seguro e acesso imediato após confirmação."}
          </p>
        </div>

        {course.is_free ? (
          /* Curso gratuito — form de 1 clique */
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-border p-8 flex flex-col items-center gap-5 text-center">
              <GraduationCap className="h-12 w-12" style={{ color: primaryColor }} />
              <div>
                <h2 className="font-heading font-bold text-xl">{course.title}</h2>
                <p className="text-emerald-600 font-bold text-lg mt-1">Gratuito</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  const result = await enrollFreeAction(courseId);
                  if (!result.error && result.slug) redirect(`/ead/curso/${result.slug}`);
                }}
                className="w-full"
              >
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-bold text-white"
                  style={{ background: primaryColor }}
                >
                  Matricular gratuitamente
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* Checkout pago */
          <EadCheckoutFlow
            course={{
              id:               course.id,
              slug:             course.slug,
              title:            course.title,
              subtitle:         course.subtitle,
              thumbnail_url:    course.thumbnail_url,
              instructor_name:  course.instructor_name,
              price:            course.price,
              price_promotional: course.price_promotional,
              access_days:      course.access_days,
            }}
            primaryColor={primaryColor}
            mpPublicKey={settings?.mp_public_key ?? null}
            userEmail={user.email ?? ""}
            userName={profile?.full_name ?? user.email?.split("@")[0] ?? "Aluno"}
            userCpf={profile?.cpf ?? ""}
            tenantId={tenant.id}
          />
        )}
      </div>
    </div>
  );
}
