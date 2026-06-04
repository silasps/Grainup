"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCampaignAction(data: {
  title: string;
  subject: string;
  body: string;
  segment: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").insert({
    title: data.title,
    subject: data.subject,
    body: data.body,
    segment: data.segment,
    status: "draft",
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/leads");
  return { error: null };
}

export async function sendCampaignAction(campaignId: string) {
  const supabase = await createClient();
  const admin = await createAdminClient();

  // Busca campanha
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campErr || !campaign) return { error: "Campanha não encontrada." };
  if (campaign.status === "sent") return { error: "Campanha já foi enviada." };

  // Marca como enviando
  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  // Busca leads do segmento
  let query = admin.from("leads").select("id, name, email, marketing_consent, origin");
  if (campaign.segment === "with_consent") {
    query = query.eq("marketing_consent", true) as typeof query;
  } else if (campaign.segment.startsWith("origin:")) {
    const origin = campaign.segment.replace("origin:", "");
    query = query.eq("origin", origin) as typeof query;
  }
  const { data: leads } = await query;
  const recipients = leads ?? [];

  if (recipients.length === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "failed" })
      .eq("id", campaignId);
    return { error: "Nenhum lead encontrado para este segmento." };
  }

  // Verifica se Resend está configurado
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !fromEmail) {
    // Modo simulação: só atualiza o banco
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_count: recipients.length,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    revalidatePath("/admin/editora/leads");
    return {
      error: null,
      sent: recipients.length,
      simulated: true,
    };
  }

  // Envio real via Resend
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const chunks = [];
    for (let i = 0; i < recipients.length; i += 50) {
      chunks.push(recipients.slice(i, i + 50));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map((lead) =>
          resend.emails.send({
            from: fromEmail,
            to: lead.email,
            subject: campaign.subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <p>Olá, ${lead.name}!</p>
              ${campaign.body.split("\n").map((p: string) => `<p>${p}</p>`).join("")}
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
              <p style="font-size:12px;color:#888">
                Você está recebendo este e-mail porque se inscreveu na Editora Jocum.<br/>
                <a href="mailto:${fromEmail}?subject=Descadastrar&body=Por favor me remova da lista">Descadastrar</a>
              </p>
            </div>`,
          })
        )
      );
      totalSent += chunk.length;
    }

    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_count: totalSent,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    revalidatePath("/admin/editora/leads");
    return { error: null, sent: totalSent, simulated: false };
  } catch (err) {
    await supabase
      .from("campaigns")
      .update({ status: "failed" })
      .eq("id", campaignId);
    return { error: String(err) };
  }
}

export async function deleteCampaignAction(campaignId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/leads");
  return { error: null };
}

export async function importLeadsAction(rows: {
  name: string;
  email: string;
  phone: string | null;
  origin: string;
  marketing_consent: boolean;
}[]) {
  if (rows.length === 0) return { error: null, imported: 0, skipped: 0 };

  const supabase = await createClient();

  const emails = rows.map((r) => r.email);
  const { data: existing } = await supabase
    .from("leads")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing ?? []).map((e) => (e.email as string).toLowerCase()));

  const toInsert = rows
    .filter((r) => !existingEmails.has(r.email.toLowerCase()))
    .map((r) => ({ ...r, book_id: null }));

  if (toInsert.length === 0) {
    return { error: null, imported: 0, skipped: rows.length };
  }

  const { error } = await supabase.from("leads").insert(toInsert);
  if (error) return { error: error.message };

  revalidatePath("/admin/editora/leads");
  return { error: null, imported: toInsert.length, skipped: rows.length - toInsert.length };
}
