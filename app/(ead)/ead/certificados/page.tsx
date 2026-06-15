import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantFromHostname, getTenantSettings } from "@/lib/tenant";
import { CertificateDownload } from "@/components/ead/student/certificate-download";
import { Award, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Meus certificados" };
export const dynamic = "force-dynamic";

export default async function CertificadosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/ead/certificados");

  const hdrs = await headers();
  const hostname = hdrs.get("x-tenant-hostname") ?? "";
  const [tenant, db] = await Promise.all([
    getTenantFromHostname(hostname),
    createAdminClient(),
  ]);

  if (!tenant) redirect("/ead");

  const [settings, certs] = await Promise.all([
    getTenantSettings(tenant.id),
    db
      .from("ead_certificates")
      .select("id, certificate_code, issued_at, student_name, course_title")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  const primaryColor = settings?.primary_color ?? "#1B4332";
  const certificates = certs.data ?? [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Award className="h-6 w-6" style={{ color: primaryColor }} />
        <h1 className="font-heading font-bold text-2xl">Meus certificados</h1>
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Award className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="font-heading font-bold text-xl mb-2">Nenhum certificado ainda</h2>
          <p className="text-muted-foreground text-sm">
            Conclua 100% de um curso para receber seu certificado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-xl border border-border p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${primaryColor}18` }}
                >
                  <Award className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{cert.course_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emitido em {new Date(cert.issued_at).toLocaleDateString("pt-BR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Código: {cert.certificate_code}
                  </div>
                </div>
              </div>
              <CertificateDownload
                certificateCode={cert.certificate_code}
                studentName={cert.student_name}
                courseTitle={cert.course_title}
                tenantName={tenant.name}
                issuedAt={cert.issued_at}
                primaryColor={primaryColor}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
