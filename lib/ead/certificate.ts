import { createAdminClient } from "@/lib/supabase/server";
import { sendEadCertificateEmail } from "@/lib/email/ead";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 16 }, (_, i) =>
    (i > 0 && i % 4 === 0 ? "-" : "") + chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// Emite o certificado para um aluno que concluiu 100% do curso.
// Idempotente: se já existe, retorna o existente.
export async function issueCertificate(enrollmentId: string): Promise<string | null> {
  const db = await createAdminClient();

  const { data: enrollment } = await db
    .from("ead_enrollments")
    .select("id, user_id, course_id, completed_at")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  // Idempotência
  const { data: existing } = await db
    .from("ead_certificates")
    .select("id, certificate_code")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (existing) return existing.certificate_code;

  // Busca dados necessários em paralelo
  const [courseRes, profileRes, userRes] = await Promise.all([
    db.from("ead_courses").select("id, title, tenant_id, slug").eq("id", enrollment.course_id).maybeSingle(),
    db.from("profiles").select("full_name").eq("id", enrollment.user_id).maybeSingle(),
    db.auth.admin.getUserById(enrollment.user_id),
  ]);

  const courseTitle = courseRes.data?.title ?? "Curso";
  const studentName = profileRes.data?.full_name ?? "Aluno";
  const studentEmail = userRes.data?.user?.email;
  const code = generateCode();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from("ead_certificates") as any).insert({
    enrollment_id:    enrollmentId,
    user_id:          enrollment.user_id,
    course_id:        enrollment.course_id,
    certificate_code: code,
    issued_at:        new Date().toISOString(),
    student_name:     studentName,
    course_title:     courseTitle,
  }) as { error: { message: string } | null };

  if (error) {
    console.error("[Certificate] issueCertificate:", error.message);
    return null;
  }

  // Marca enrollment como concluído
  await db
    .from("ead_enrollments")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  // Envia e-mail de certificado (fire-and-forget — não bloqueia o retorno)
  if (studentEmail && courseRes.data?.tenant_id) {
    const tenantRes = await db
      .from("tenants")
      .select("name")
      .eq("id", courseRes.data.tenant_id)
      .maybeSingle();

    const settingsRes = await db
      .from("tenant_settings")
      .select("primary_color, bunny_cdn_hostname")
      .eq("tenant_id", courseRes.data.tenant_id)
      .maybeSingle();

    const tenantName = tenantRes.data?.name ?? "GrainUp EAD";
    const primaryColor = settingsRes.data?.primary_color ?? "#1B4332";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    sendEadCertificateEmail({
      to:              studentEmail,
      studentName,
      tenantName,
      primaryColor,
      courseTitle,
      certificateCode: code,
      verifyUrl:       `${appUrl}/certificado/${code}`,
      certificatesUrl: `${appUrl}/ead/certificados`,
    }).catch((err) => console.error("[Certificate] sendEmail:", err));
  }

  return code;
}
