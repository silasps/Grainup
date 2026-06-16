"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

async function sendContractLinkEmail(clientName: string, clientEmail: string, token: string) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const signingUrl = `${SITE}/contrato/${token}`;
  const firstName = clientName.split(" ")[0];

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">GrainUp</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Contrato de Prestação de Serviços</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 16px;font-size:15px;color:#333;">Olá, <strong>${firstName}</strong>!</p>
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
    Segue o link para leitura e assinatura digital do contrato de prestação de serviços <strong>GrainUp – Módulo Editora</strong>. O processo é rápido e 100% online.
  </p>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="${signingUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:-0.3px;">
      ✍️ Ler e assinar contrato
    </a>
  </div>
  <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;font-size:12px;color:#64748b;line-height:1.6;">
    Ou copie e cole este link no navegador:<br>
    <span style="color:#0f172a;word-break:break-all;">${signingUrl}</span>
  </div>
  <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
    Este link é válido por 30 dias e é exclusivo para você. Não compartilhe com terceiros.
  </p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">GrainUp · Plataforma de Soluções Digitais · <a href="mailto:silaspereiras@gmail.com" style="color:#0f172a;">silaspereiras@gmail.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({
      from: `GrainUp <${process.env.EMAIL_FROM ?? "noreply@editorajocum.com.br"}>`,
      to: clientEmail,
      subject: `${firstName}, seu contrato GrainUp está pronto para assinar`,
      html,
    });
  } catch (err) {
    console.error("[Contrato] Erro ao enviar link por e-mail:", err);
  }
}

export interface ContratoRow {
  id: string;
  token: string;
  client_name: string;
  client_email: string;
  contract_slug: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  expires_at: string;
  evidence_json: Record<string, unknown> | null;
  signer_ip: string | null;
  signer_latitude: number | null;
  signer_longitude: number | null;
}

export async function getContratosAction(): Promise<ContratoRow[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("contratos")
    .select("id, token, client_name, client_email, contract_slug, status, signed_at, created_at, expires_at, evidence_json, signer_ip, signer_latitude, signer_longitude")
    .order("created_at", { ascending: false });
  return (data ?? []) as ContratoRow[];
}

export async function deleteContratoAction(id: string): Promise<{ error?: string }> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id)
    .neq("status", "assinado"); // nunca deleta contratos assinados
  if (error) return { error: error.message };
  revalidatePath("/admin/editora/contratos");
  return {};
}

export async function createContratoAction(
  clientName: string,
  clientEmail: string,
): Promise<{ token?: string; error?: string }> {
  if (!clientName.trim() || !clientEmail.trim()) return { error: "Nome e e-mail são obrigatórios." };

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("contratos")
    .insert({ client_name: clientName.trim(), client_email: clientEmail.trim() })
    .select("token")
    .single();

  if (error || !data) return { error: error?.message ?? "Erro ao criar contrato." };
  revalidatePath("/admin/editora/contratos");
  // Fire-and-forget: envia o link por e-mail ao cliente
  sendContractLinkEmail(clientName.trim(), clientEmail.trim(), data.token).catch(console.error);
  return { token: data.token };
}
