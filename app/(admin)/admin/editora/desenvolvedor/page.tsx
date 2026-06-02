import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/actions/get-my-role";
import { getBetaFeedbackList } from "@/lib/actions/beta-feedback";
import { AdminHeader } from "@/components/admin/header";
import { FeedbackTable } from "./feedback-table";

export const metadata: Metadata = { title: "Desenvolvedor — Admin Editora Jocum" };
export const dynamic = "force-dynamic";

export default async function DesenvolvedorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getMyRole(user.id);
  if (role !== "super_admin") redirect("/admin/editora");

  const feedbacks = await getBetaFeedbackList();

  const counts = {
    novo: feedbacks.filter((f) => f.status === "novo").length,
    em_analise: feedbacks.filter((f) => f.status === "em_analise").length,
    implementado: feedbacks.filter((f) => f.status === "implementado").length,
    descartado: feedbacks.filter((f) => f.status === "descartado").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Desenvolvedor"
        subtitle={`${feedbacks.length} sugestões beta`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Novas", value: counts.novo, color: "text-blue-600" },
            { label: "Em análise", value: counts.em_analise, color: "text-yellow-600" },
            { label: "Implementadas", value: counts.implementado, color: "text-emerald-600" },
            { label: "Descartadas", value: counts.descartado, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <FeedbackTable feedbacks={feedbacks} />
        </div>
      </main>
    </div>
  );
}
