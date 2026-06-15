import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { ShieldCheck, Award, GraduationCap, Calendar } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Verificação de certificado — ${code}`,
    description: "Verifique a autenticidade deste certificado emitido pela plataforma GrainUp EAD.",
  };
}

export default async function CertificateVerificationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = await createAdminClient();

  const { data: cert } = await db
    .from("ead_certificates")
    .select("id, certificate_code, issued_at, student_name, course_title, course_id")
    .eq("certificate_code", code.toUpperCase())
    .maybeSingle();

  if (!cert) notFound();

  // Busca o tenant do curso para exibir o nome da plataforma
  const { data: course } = await db
    .from("ead_courses")
    .select("tenant_id")
    .eq("id", cert.course_id)
    .maybeSingle();

  const tenantName = course?.tenant_id
    ? (await db.from("tenants").select("name").eq("id", course.tenant_id).maybeSingle()).data?.name
    : null;

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">

        {/* Verified badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="font-heading font-bold text-xl text-emerald-700">Certificado válido</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Este certificado é autêntico e foi emitido pela plataforma {tenantName ?? "GrainUp EAD"}.
          </p>
        </div>

        {/* Certificate card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-2 bg-emerald-500" />
          <div className="p-6 flex flex-col gap-5">

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {tenantName ?? "GrainUp EAD"}
                </p>
                <p className="font-heading font-bold">Certificado de Conclusão</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Aluno</p>
                  <p className="font-semibold text-sm">{cert.student_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Award className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Curso</p>
                  <p className="font-semibold text-sm">{cert.course_title}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Data de emissão</p>
                  <p className="font-semibold text-sm">{issuedDate}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Código de verificação:{" "}
                <span className="font-mono font-semibold text-foreground">{cert.certificate_code}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Verificado em {new Date().toLocaleDateString("pt-BR")} · GrainUp EAD
        </p>
      </div>
    </div>
  );
}
