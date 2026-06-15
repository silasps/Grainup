import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";
import { CourseEditor } from "@/components/ead/course-editor";
import type { EadCourse, EadModule, EadLesson } from "@/types/ead";

export const metadata: Metadata = { title: "Editar curso — EAD" };

async function getCourse(id: string) {
  const db = await createAdminClient();

  const { data: course } = await db
    .from("ead_courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!course) return null;

  const { data: modules } = await db
    .from("ead_modules")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  const { data: lessons } = await db
    .from("ead_lessons")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  const modulesWithLessons = (modules ?? []).map((mod) => ({
    ...(mod as EadModule),
    lessons: (lessons ?? []).filter((l) => l.module_id === mod.id) as EadLesson[],
  }));

  return { course: course as EadCourse, modules: modulesWithLessons };
}

export default async function CursoEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCourse(id);
  if (!data) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title={data.course.title}
        subtitle={`${data.course.total_lessons} aulas · ${data.course.is_active ? "Ativo" : "Rascunho"}`}
      />
      <CourseEditor course={data.course} modules={data.modules} />
    </div>
  );
}
