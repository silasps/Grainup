"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getMyTenant } from "@/lib/actions/get-my-tenant";
import { slugify } from "@/lib/utils/format";

// ─── COURSE ────────────────────────────────────────────────────────────────

export async function upsertCourseAction(formData: {
  id?: string;
  title: string;
  subtitle?: string;
  description_short?: string;
  description_full?: string;
  price: number;
  price_promotional?: number | null;
  access_days: number;
  is_active: boolean;
  is_free: boolean;
  is_featured: boolean;
  level?: string | null;
  instructor_name?: string;
  instructor_bio?: string;
  certificate_enabled: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const [role, tenant] = await Promise.all([
    getMyRole(user.id),
    getMyTenant(user.id),
  ]);

  if (!tenant && role !== "super_admin") return { error: "Tenant não encontrado" };

  const db = await createAdminClient();
  const slug = slugify(formData.title);

  if (formData.id) {
    // Update
    const { error } = await db
      .from("ead_courses")
      .update({
        title:               formData.title,
        subtitle:            formData.subtitle ?? null,
        description_short:   formData.description_short ?? null,
        description_full:    formData.description_full ?? null,
        price:               formData.price,
        price_promotional:   formData.price_promotional ?? null,
        access_days:         formData.access_days,
        is_active:           formData.is_active,
        is_free:             formData.is_free,
        is_featured:         formData.is_featured,
        level:               (formData.level as "iniciante" | "intermediario" | "avancado") ?? null,
        instructor_name:     formData.instructor_name ?? null,
        instructor_bio:      formData.instructor_bio ?? null,
        certificate_enabled: formData.certificate_enabled,
      })
      .eq("id", formData.id);

    if (error) return { error: error.message };
    revalidatePath("/admin/ead/cursos");
    return { success: true, id: formData.id };
  }

  // Insert
  const { data, error } = await db
    .from("ead_courses")
    .insert({
      tenant_id:              tenant!.id,
      title:                  formData.title,
      slug,
      subtitle:               formData.subtitle ?? null,
      description_short:      formData.description_short ?? null,
      description_full:       formData.description_full ?? null,
      thumbnail_url:          null,
      cover_url:              null,
      trailer_video_id:       null,
      instructor_photo_url:   null,
      price:                  formData.price,
      price_promotional:      formData.price_promotional ?? null,
      access_days:            formData.access_days,
      is_active:              formData.is_active,
      is_free:                formData.is_free,
      is_featured:            formData.is_featured,
      level:                  (formData.level as "iniciante" | "intermediario" | "avancado") ?? null,
      language:               "pt-BR",
      total_lessons:          0,
      total_duration_s:       0,
      sort_order:             0,
      instructor_name:        formData.instructor_name ?? null,
      instructor_bio:         formData.instructor_bio ?? null,
      certificate_enabled:    formData.certificate_enabled,
      created_by:             user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/ead/cursos");
  return { success: true, id: data.id };
}

export async function deleteCourseAction(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const db = await createAdminClient();
  const { error } = await db.from("ead_courses").delete().eq("id", courseId);
  if (error) return { error: error.message };

  revalidatePath("/admin/ead/cursos");
  return { success: true };
}

// ─── MODULE ────────────────────────────────────────────────────────────────

export async function upsertModuleAction(data: {
  id?: string;
  course_id: string;
  title: string;
  description?: string;
  position: number;
  is_free_preview: boolean;
}) {
  const db = await createAdminClient();

  if (data.id) {
    const { error } = await db
      .from("ead_modules")
      .update({ title: data.title, description: data.description ?? null, is_free_preview: data.is_free_preview })
      .eq("id", data.id);
    if (error) return { error: error.message };
    revalidatePath(`/admin/ead/cursos/${data.course_id}`);
    return { success: true, id: data.id };
  }

  const { data: mod, error } = await db
    .from("ead_modules")
    .insert({
      course_id:       data.course_id,
      title:           data.title,
      description:     data.description ?? null,
      position:        data.position,
      is_free_preview: data.is_free_preview,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/admin/ead/cursos/${data.course_id}`);
  return { success: true, id: mod.id };
}

export async function deleteModuleAction(moduleId: string, courseId: string) {
  const db = await createAdminClient();
  const { error } = await db.from("ead_modules").delete().eq("id", moduleId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/ead/cursos/${courseId}`);
  return { success: true };
}

export async function reorderModulesAction(items: Array<{ id: string; position: number }>) {
  const db = await createAdminClient();
  await Promise.all(
    items.map(({ id, position }) =>
      db.from("ead_modules").update({ position }).eq("id", id)
    )
  );
  return { success: true };
}

// ─── LESSON ────────────────────────────────────────────────────────────────

export async function upsertLessonAction(data: {
  id?: string;
  module_id: string;
  course_id: string;
  title: string;
  content_type: string;
  bunny_video_id?: string | null;
  duration_s?: number | null;
  content_body?: string | null;
  external_url?: string | null;
  description?: string | null;
  is_free_preview: boolean;
  publish_at?: string | null;
  position: number;
}) {
  const db = await createAdminClient();
  const slug = slugify(data.title);

  if (data.id) {
    const { error } = await db
      .from("ead_lessons")
      .update({
        title:           data.title,
        content_type:    data.content_type as "video" | "texto" | "pdf" | "quiz" | "link_externo",
        bunny_video_id:  data.bunny_video_id ?? null,
        duration_s:      data.duration_s ?? null,
        content_body:    data.content_body ?? null,
        external_url:    data.external_url ?? null,
        description:     data.description ?? null,
        is_free_preview: data.is_free_preview,
        publish_at:      data.publish_at ?? null,
      })
      .eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await db
      .from("ead_lessons")
      .insert({
        module_id:       data.module_id,
        course_id:       data.course_id,
        title:           data.title,
        slug,
        content_type:    data.content_type as "video" | "texto" | "pdf" | "quiz" | "link_externo",
        bunny_video_id:  data.bunny_video_id ?? null,
        duration_s:      data.duration_s ?? null,
        content_body:    data.content_body ?? null,
        pdf_url:         null,
        subtitle_url:    null,
        external_url:    data.external_url ?? null,
        description:     data.description ?? null,
        is_free_preview: data.is_free_preview,
        publish_at:      data.publish_at ?? null,
        position:        data.position,
      });
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/ead/cursos/${data.course_id}`);
  return { success: true };
}

export async function deleteLessonAction(lessonId: string, courseId: string) {
  const db = await createAdminClient();
  const { error } = await db.from("ead_lessons").delete().eq("id", lessonId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/ead/cursos/${courseId}`);
  return { success: true };
}

export async function reorderLessonsAction(items: Array<{ id: string; position: number }>) {
  const db = await createAdminClient();
  await Promise.all(
    items.map(({ id, position }) =>
      db.from("ead_lessons").update({ position }).eq("id", id)
    )
  );
  return { success: true };
}

// ─── BUNNY VIDEO STUB ──────────────────────────────────────────────────────
// Cria o stub no Bunny e retorna o guid + TUS endpoint para o browser fazer o upload direto.

export async function createBunnyVideoStubAction(lessonTitle: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const tenant = await getMyTenant(user.id);
  if (!tenant) return { error: "Tenant não encontrado" };

  const db = await createAdminClient();
  const { data: settings } = await db
    .from("tenant_settings")
    .select("bunny_library_id, bunny_token_key")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!settings?.bunny_library_id) {
    return { error: "Bunny não configurado. Acesse Configurações > EAD." };
  }

  const { createBunnyVideo } = await import("@/lib/bunny");
  const guid = await createBunnyVideo({
    title:     lessonTitle,
    libraryId: settings.bunny_library_id,
    apiKey:    process.env.BUNNY_API_KEY!,
  });

  return {
    guid,
    tusEndpoint: `https://video.bunnycdn.com/tusupload`,
    libraryId:   settings.bunny_library_id,
  };
}
