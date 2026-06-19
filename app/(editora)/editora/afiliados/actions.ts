"use server";

import { createClient } from "@/lib/supabase/server";
import { sendAffiliateLeaderNotificationEmail } from "@/lib/email";

interface PublicAffiliateInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  type: "geral" | "jocum" | "diretor";
  serving_location?: string;
  leader_name?: string;
  leader_email?: string;
  leader_phone?: string;
}

export async function submitAffiliateApplicationAction(input: PublicAffiliateInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: affiliate, error } = await supabase
    .from("affiliates")
    .insert({
      user_id: user.id,
      type: input.type,
      name: input.name,
      email: input.email,
      cpf: input.cpf.replace(/\D/g, ""),
      phone: input.phone.replace(/\D/g, ""),
      status: "pendente",
      commission_rate: input.type === "geral" ? 30 : 50,
      serving_location: input.serving_location || null,
      leader_name: input.leader_name || null,
      leader_email: input.leader_email || null,
      leader_phone: input.leader_phone || null,
      last_confirmed_at: null,
    })
    .select("leader_token")
    .single();

  if (error) throw error;

  if (input.type === "jocum" && input.leader_email && affiliate?.leader_token) {
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";
    sendAffiliateLeaderNotificationEmail({
      leaderEmail: input.leader_email,
      leaderName: input.leader_name || "Líder",
      affiliateName: input.name,
      affiliateEmail: input.email,
      servingLocation: input.serving_location || "não informado",
      confirmationUrl: `${SITE}/confirmar-afiliado/${affiliate.leader_token}`,
    }).catch(console.error);
  }
}
