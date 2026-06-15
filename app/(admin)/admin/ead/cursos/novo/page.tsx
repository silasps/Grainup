import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/header";
import { CourseEditor } from "@/components/ead/course-editor";

export const metadata: Metadata = { title: "Novo curso — EAD" };

export default function NovoCursoPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader title="Novo curso" subtitle="Preencha as informações e salve para adicionar módulos" />
      <CourseEditor modules={[]} />
    </div>
  );
}
