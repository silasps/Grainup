"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function submitLeaderConfirmationAction(
  token: string,
  confirmation: "confirmed" | "denied",
  notes: string,
) {
  const supabase = await createAdminClient();

  const { data: affiliate, error } = await supabase
    .from("affiliates")
    .select("id, name, email, leader_name, leader_confirmed_at")
    .eq("leader_token", token)
    .single();

  if (error || !affiliate) throw new Error("Link inválido ou expirado.");
  if (affiliate.leader_confirmed_at) throw new Error("Este link já foi utilizado.");

  await supabase
    .from("affiliates")
    .update({
      leader_confirmation: confirmation,
      leader_confirmation_notes: notes || null,
      leader_confirmed_at: new Date().toISOString(),
    })
    .eq("leader_token", token);

  // Notifica o admin
  const adminEmail = process.env.ADMIN_EMAIL ?? "contato@editorajocum.com.br";
  const label = confirmation === "confirmed" ? "CONFIRMADO" : "NEGADO";
  const color = confirmation === "confirmed" ? "#16a34a" : "#dc2626";
  await sendEmail(
    adminEmail,
    `[Afiliados] Líder ${label} vínculo de ${affiliate.name}`,
    `<p>O líder <strong>${affiliate.leader_name ?? "—"}</strong> respondeu ao formulário de confirmação de vínculo JOCUM.</p>
     <p><strong>Candidato:</strong> ${affiliate.name} (${affiliate.email})</p>
     <p><strong>Resposta:</strong> <span style="color:${color};font-weight:700;">${label}</span></p>
     ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ""}
     <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br"}/admin/editora/afiliados">Ver no painel →</a></p>`,
    "affiliate_leader_confirmed",
  );

  return { affiliateName: affiliate.name };
}
