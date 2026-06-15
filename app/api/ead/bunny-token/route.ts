import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { signBunnyEmbedUrl } from "@/lib/bunny";

// POST { lessonId } → { signedUrl }
// Verifica matrícula ativa antes de emitir o token — este é o portão de acesso ao vídeo.
export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let lessonId: string;
  try {
    ({ lessonId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId obrigatório" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Busca a aula com os dados do curso e tenant
  const { data: lesson } = await supabase
    .from("ead_lessons")
    .select(`
      id,
      bunny_video_id,
      course_id,
      is_free_preview,
      publish_at,
      ead_courses!inner ( tenant_id )
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson?.bunny_video_id) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  // Drip content: aula ainda não publicada
  if (lesson.publish_at && new Date(lesson.publish_at) > new Date()) {
    return NextResponse.json({ error: "Aula ainda não disponível" }, { status: 403 });
  }

  // Aulas de preview não exigem matrícula
  if (!lesson.is_free_preview) {
    const { data: enrollment } = await supabase
      .from("ead_enrollments")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .eq("course_id", lesson.course_id)
      .maybeSingle();

    const isActive =
      enrollment?.status === "ativa" &&
      new Date(enrollment.expires_at) > new Date();

    if (!isActive) {
      return NextResponse.json({ error: "Matrícula necessária" }, { status: 403 });
    }
  }

  // Busca credenciais Bunny do tenant
  const tenantId = (lesson.ead_courses as unknown as { tenant_id: string }).tenant_id;
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("bunny_library_id, bunny_token_key")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!settings?.bunny_library_id || !settings?.bunny_token_key) {
    return NextResponse.json(
      { error: "Configuração de vídeo do tenant incompleta" },
      { status: 500 }
    );
  }

  const signedUrl = signBunnyEmbedUrl({
    videoId: lesson.bunny_video_id,
    libraryId: settings.bunny_library_id,
    tokenKey: settings.bunny_token_key,
    expirySeconds: 7200, // 2 horas
  });

  return NextResponse.json({ signedUrl });
}
