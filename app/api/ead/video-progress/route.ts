import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { issueCertificate } from "@/lib/ead/certificate";

// POST { lessonId, positionS, watchTimeS, completed? }
// Chamado via navigator.sendBeacon a cada 30s para salvar posição do vídeo.
// Também chamado quando o aluno atinge 85% do vídeo para marcar como concluída.
export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let lessonId: string;
  let positionS: number;
  let watchTimeS: number;
  let completed: boolean;

  try {
    ({ lessonId, positionS = 0, watchTimeS = 0, completed = false } = await req.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId obrigatório" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Busca a matrícula ativa para este aluno neste curso
  const { data: lesson } = await supabase
    .from("ead_lessons")
    .select("course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  const { data: enrollment } = await supabase
    .from("ead_enrollments")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .eq("course_id", lesson.course_id)
    .maybeSingle();

  if (
    !enrollment ||
    enrollment.status !== "ativa" ||
    new Date(enrollment.expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "Matrícula inativa" }, { status: 403 });
  }

  // Upsert do progresso
  const { error } = await supabase
    .from("ead_lesson_progress")
    .upsert(
      {
        enrollment_id:   enrollment.id,
        lesson_id:       lessonId,
        user_id:         user.id,
        last_position_s: positionS,
        watch_time_s:    watchTimeS,
        completed:       completed,
        completed_at:    completed ? new Date().toISOString() : null,
      },
      { onConflict: "enrollment_id,lesson_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Erro ao salvar progresso" }, { status: 500 });
  }

  // Se concluída, verifica se o curso todo foi completado para emitir certificado
  if (completed) {
    const { data: progressData } = await supabase.rpc("ead_course_progress", {
      p_enrollment_id: enrollment.id,
    });

    if (progressData === 100) {
      await issueCertificate(enrollment.id);
      return NextResponse.json({ saved: true, courseCompleted: true });
    }
  }

  return NextResponse.json({ saved: true, courseCompleted: false });
}
