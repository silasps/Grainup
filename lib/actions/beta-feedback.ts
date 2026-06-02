"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function submitBetaFeedback(pageUrl: string, message: string) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  let userName: string | null = null;
  if (user) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? null;
  }

  const { error } = await adminClient.from("beta_feedback").insert({
    page_url: pageUrl,
    message: message.trim(),
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    user_name: userName,
    status: "novo",
  });

  if (error) {
    console.error("[beta-feedback] insert error:", error);
    throw new Error(error.message);
  }
}

export async function getBetaFeedbackList() {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("beta_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return [];
  return data ?? [];
}

export async function updateBetaFeedbackStatus(
  id: string,
  status: "novo" | "em_analise" | "implementado" | "descartado"
) {
  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("beta_feedback")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error("Erro ao atualizar status.");
}
