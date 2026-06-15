"use server";

// E-mails EAD — branded por tenant (nome do remetente = nome do tenant)
// Domínio do remetente é sempre grainup.com.br (verificado no Resend).
// O aluno vê: "Eifol Cursos <noreply@grainup.com.br>"

async function sendEadEmail(
  to: string,
  subject: string,
  html: string,
  senderName: string,
) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EAD Email] RESEND_API_KEY não configurado — ignorado: ${subject}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `${senderName} <${process.env.EMAIL_FROM_EAD ?? "noreply@grainup.com.br"}>`;
  try {
    await resend.emails.send({ from, to, subject, html });
    console.log(`[EAD Email] "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[EAD Email] Erro ao enviar "${subject}":`, err);
  }
}

function eadBaseHtml(primaryColor: string, tenantName: string, title: string, body: string) {
  const r = parseInt(primaryColor.slice(1, 3), 16) || 27;
  const g = parseInt(primaryColor.slice(3, 5), 16) || 67;
  const b = parseInt(primaryColor.slice(5, 7), 16) || 50;
  const rgb = `${r},${g},${b}`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:rgb(${rgb});padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">${tenantName}</p>
</td></tr>
<tr><td style="padding:32px 40px;">
  <h2 style="margin:0 0 16px;font-size:18px;color:#111;font-weight:700;">${title}</h2>
  ${body}
</td></tr>
<tr><td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
    Você está recebendo este e-mail porque se matriculou em um curso na plataforma ${tenantName}.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ─── Confirmação de matrícula ──────────────────────────────────────────────────

export async function sendEadEnrollmentEmail(params: {
  to:           string;
  studentName:  string;
  tenantName:   string;
  primaryColor: string;
  courseTitle:  string;
  courseUrl:    string;
  expiresAt:    string | null;
}) {
  const { to, studentName, tenantName, primaryColor, courseTitle, courseUrl, expiresAt } = params;

  const expiry = expiresAt
    ? `<p style="font-size:13px;color:#777;margin:0 0 24px;">
        Seu acesso é válido até <strong>${new Date(expiresAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</strong>.
       </p>`
    : "";

  const r = parseInt(primaryColor.slice(1, 3), 16) || 27;
  const g = parseInt(primaryColor.slice(3, 5), 16) || 67;
  const b = parseInt(primaryColor.slice(5, 7), 16) || 50;

  const html = eadBaseHtml(
    primaryColor,
    tenantName,
    `Matrícula confirmada! 🎉`,
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 8px;">
      Olá, <strong>${studentName.split(" ")[0]}</strong>! Sua matrícula no curso foi confirmada com sucesso.
    </p>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Curso</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111;">${courseTitle}</p>
    </div>
    ${expiry}
    <a href="${courseUrl}"
       style="display:inline-block;background:rgb(${r},${g},${b});color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Começar o curso →
    </a>`,
  );

  await sendEadEmail(to, `Matrícula em "${courseTitle}" confirmada!`, html, tenantName);
}

// ─── Certificado emitido ───────────────────────────────────────────────────────

export async function sendEadCertificateEmail(params: {
  to:              string;
  studentName:     string;
  tenantName:      string;
  primaryColor:    string;
  courseTitle:     string;
  certificateCode: string;
  verifyUrl:       string;
  certificatesUrl: string;
}) {
  const {
    to, studentName, tenantName, primaryColor,
    courseTitle, certificateCode, verifyUrl, certificatesUrl,
  } = params;

  const r = parseInt(primaryColor.slice(1, 3), 16) || 27;
  const g = parseInt(primaryColor.slice(3, 5), 16) || 67;
  const b = parseInt(primaryColor.slice(5, 7), 16) || 50;

  const html = eadBaseHtml(
    primaryColor,
    tenantName,
    `Parabéns, ${studentName.split(" ")[0]}! Você concluiu o curso! 🏆`,
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
      Você completou 100% do curso <strong>${courseTitle}</strong> e seu certificado foi emitido.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Código de verificação</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#166534;letter-spacing:2px;font-family:monospace;">${certificateCode}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#166534;">
        Verificar autenticidade: <a href="${verifyUrl}" style="color:#166534;font-weight:600;">${verifyUrl}</a>
      </p>
    </div>

    <a href="${certificatesUrl}"
       style="display:inline-block;background:rgb(${r},${g},${b});color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:12px;">
      Baixar meu certificado PDF →
    </a>
    <p style="font-size:12px;color:#aaa;margin:12px 0 0;">
      Acesse "Meus certificados" na plataforma para fazer o download do PDF a qualquer momento.
    </p>`,
  );

  await sendEadEmail(to, `Seu certificado de "${courseTitle}" está pronto!`, html, tenantName);
}
