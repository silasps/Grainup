"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { createHash, randomInt } from "crypto";
import { CONTRATO_EDITORA_JOCUM } from "@/lib/contratos/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

function hashOtp(otp: string, token: string) {
  return createHash("sha256").update(otp + token).digest("hex");
}

function contractHash() {
  return createHash("sha256").update(JSON.stringify(CONTRATO_EDITORA_JOCUM)).digest("hex");
}

async function getValidContrato(token: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("contratos")
    .select("*")
    .eq("token", token)
    .single();
  if (!data) return null;
  if (data.status === "assinado") return data;
  if (new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function requestOtpAction(token: string, email: string): Promise<{ error?: string }> {
  const contrato = await getValidContrato(token);
  if (!contrato || contrato.status === "assinado") return { error: "Contrato inválido ou já assinado." };

  const otp = String(randomInt(100000, 999999));
  const hash = hashOtp(otp, token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const supabase = await createAdminClient();
  await supabase
    .from("contratos")
    .update({ otp_hash: hash, otp_expires_at: expiresAt })
    .eq("token", token);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Contrato OTP] token=${otp} para ${email} (sem Resend)`);
    return {};
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `GrainUp <${process.env.EMAIL_FROM ?? "noreply@editorajocum.com.br"}>`;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">GrainUp</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Assinatura Digital de Contrato</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
    Seu código de confirmação para assinar o contrato é:
  </p>
  <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
    <p style="margin:0;font-size:40px;font-weight:800;color:#0f172a;letter-spacing:8px;">${otp}</p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Válido por 15 minutos</p>
  </div>
  <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
    Se você não solicitou este código, ignore este e-mail.
  </p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">GrainUp · Plataforma de Soluções Digitais</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({ from, to: email, subject: `${otp} — Código para assinar o contrato GrainUp`, html });
  } catch (err) {
    console.error("[Contrato OTP] Erro ao enviar e-mail:", err);
    return { error: "Erro ao enviar o código. Tente novamente." };
  }
  return {};
}

export async function signContratoAction(
  token: string,
  otp: string,
  name: string,
  email: string,
  geo?: { lat: number; lng: number } | null,
): Promise<{ error?: string }> {
  const supabase = await createAdminClient();
  const { data: contrato } = await supabase
    .from("contratos")
    .select("*")
    .eq("token", token)
    .single();

  if (!contrato) return { error: "Contrato não encontrado." };
  if (contrato.status === "assinado") return { error: "Este contrato já foi assinado." };
  if (!contrato.otp_hash) return { error: "Solicite um código primeiro." };
  if (!contrato.otp_expires_at || new Date(contrato.otp_expires_at) < new Date())
    return { error: "Código expirado. Solicite um novo." };
  if (hashOtp(otp.trim(), token) !== contrato.otp_hash)
    return { error: "Código incorreto. Verifique e tente novamente." };

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "desconhecido";
  const userAgent = headersList.get("user-agent") ?? "desconhecido";
  const signedAt = new Date().toISOString();

  const evidence = {
    signed_at: signedAt,
    signer_name: name,
    signer_email: email,
    signer_ip: ip,
    signer_user_agent: userAgent,
    signer_location: geo ?? null,
    contract_slug: CONTRATO_EDITORA_JOCUM.slug,
    contract_sha256: contractHash(),
    otp_confirmed: true,
  };

  await supabase.from("contratos").update({
    status: "assinado",
    client_name: name,
    client_email: email,
    signed_at: signedAt,
    signer_ip: ip,
    signer_user_agent: userAgent,
    signer_latitude: geo?.lat ?? null,
    signer_longitude: geo?.lng ?? null,
    evidence_json: evidence,
    otp_hash: null,
    otp_expires_at: null,
  }).eq("token", token);

  // Envia confirmação para ambas as partes
  await sendSignedConfirmationEmails(name, email, signedAt, contrato.id);

  return {};
}

async function sendSignedConfirmationEmails(
  signerName: string,
  signerEmail: string,
  signedAt: string,
  contratoId: string,
) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `GrainUp <${process.env.EMAIL_FROM ?? "noreply@editorajocum.com.br"}>`;
  const adminEmail = process.env.ADMIN_EMAIL ?? "silaspereiras@gmail.com";

  const dateStr = new Date(signedAt).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const html = (recipientName: string) =>
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">GrainUp</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Contrato assinado com sucesso</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
    <p style="margin:0;font-size:24px;">✅</p>
    <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#166534;">Contrato assinado eletronicamente</p>
  </div>
  <p style="margin:0 0 8px;font-size:14px;color:#333;">Olá, <strong>${recipientName}</strong>!</p>
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
    O contrato de prestação de serviços <strong>GrainUp – Módulo Editora</strong> foi assinado eletronicamente.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <tr>
      <td style="font-size:12px;color:#64748b;padding:4px 0;">Signatário</td>
      <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right;padding:4px 0;">${signerName}</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#64748b;padding:4px 0;">E-mail</td>
      <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${signerEmail}</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#64748b;padding:4px 0;">Data e hora</td>
      <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${dateStr}</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#64748b;padding:4px 0;">ID do contrato</td>
      <td style="font-size:11px;color:#64748b;text-align:right;padding:4px 0;">${contratoId}</td>
    </tr>
  </table>
  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
    Esta assinatura eletrônica tem validade jurídica nos termos da Lei 14.063/2020 e do Código Civil Brasileiro, sendo reconhecida pela jurisprudência do STJ (REsp 2.159.442/2025).
  </p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">GrainUp · Plataforma de Soluções Digitais</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({
      from,
      to: signerEmail,
      subject: "Contrato GrainUp – Módulo Editora assinado com sucesso",
      html: html(signerName.split(" ")[0]),
    });
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `[Contrato assinado] ${signerName} · GrainUp – Módulo Editora`,
      html: html("Silas"),
    });
  } catch (err) {
    console.error("[Contrato] Erro ao enviar confirmação:", err);
  }
}

export async function sendContractByEmailAction(
  token: string,
  email: string,
): Promise<{ error?: string }> {
  const contrato = await getValidContrato(token);
  if (!contrato) return { error: "Link inválido ou expirado." };

  if (!process.env.RESEND_API_KEY) return { error: "Serviço de e-mail não configurado." };

  const supabase = await createAdminClient();
  const { data: signedUrlData, error: storageError } = await supabase.storage
    .from("contratos")
    .createSignedUrl(CONTRATO_EDITORA_JOCUM.pdfStoragePath.replace("contratos/", ""), 60 * 30);

  if (storageError || !signedUrlData?.signedUrl) {
    return { error: "PDF do contrato não disponível. Entre em contato com silaspereiras@gmail.com." };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `GrainUp <${process.env.EMAIL_FROM ?? "noreply@editorajocum.com.br"}>`;
  const signingUrl = `${SITE}/contrato/${token}`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">GrainUp</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Contrato de Prestação de Serviços</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.7;">
    Segue o contrato de prestação de serviços <strong>GrainUp – Módulo Editora</strong> para sua análise. O link abaixo é válido por 30 minutos.
  </p>
  <a href="${signedUrlData.signedUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
    📄 Baixar PDF do Contrato
  </a>
  <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.7;">
    Para assinar digitalmente, acesse o link abaixo:
  </p>
  <a href="${signingUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
    ✍️ Ler e Assinar Contrato
  </a>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">GrainUp · Plataforma de Soluções Digitais</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: "Contrato GrainUp – Módulo Editora (PDF + link para assinatura)",
      html,
    });
  } catch {
    return { error: "Erro ao enviar o e-mail. Tente novamente." };
  }
  return {};
}

export async function getPdfSignedUrlAction(token: string): Promise<{ url?: string; error?: string }> {
  const contrato = await getValidContrato(token);
  if (!contrato) return { error: "Link inválido ou expirado." };

  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage
    .from("contratos")
    .createSignedUrl(CONTRATO_EDITORA_JOCUM.pdfStoragePath.replace("contratos/", ""), 60 * 10);

  if (error || !data?.signedUrl) {
    return { error: "PDF não disponível. Entre em contato com silaspereiras@gmail.com." };
  }
  return { url: data.signedUrl };
}
