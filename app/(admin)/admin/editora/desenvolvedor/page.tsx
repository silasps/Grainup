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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AdminHeader
        title="Desenvolvedor"
        subtitle={`${feedbacks.length} sugestões beta`}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <FeedbackTable feedbacks={feedbacks} />
      </main>
    </div>
  );
}
