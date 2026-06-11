"use server";

import { createAdminClient } from "@/lib/supabase/server";

function formatCurrencyEmail(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
};

function buildOrderEmailHtml(data: {
  customerName: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  paymentMethod: string;
  items: Array<{ title: string; quantity: number; totalPrice: number }>;
  address: string;
}) {
  const rows = data.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">${i.title}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666;text-align:center;">${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;">${formatCurrencyEmail(i.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Editora JOCUM</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Pedido confirmado</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">

            <p style="margin:0 0 8px;font-size:15px;color:#333;">Olá, <strong>${data.customerName}</strong>!</p>
            <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
              Seu pedido foi confirmado e está sendo preparado. Você receberá atualizações por e-mail sobre o envio.
            </p>

            <!-- Order number badge -->
            <div style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Número do pedido</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1a1a2e;">${data.orderNumber}</p>
            </div>

            <!-- Items -->
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Itens do pedido</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <th style="font-size:12px;color:#999;text-align:left;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Produto</th>
                <th style="font-size:12px;color:#999;text-align:center;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qtd</th>
                <th style="font-size:12px;color:#999;text-align:right;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Valor</th>
              </tr>
              ${rows}
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${data.discount > 0 ? `
              <tr>
                <td style="font-size:13px;color:#666;padding:4px 0;">Desconto Pix</td>
                <td style="font-size:13px;color:#16a34a;text-align:right;padding:4px 0;">−${formatCurrencyEmail(data.discount)}</td>
              </tr>` : ""}
              <tr>
                <td style="font-size:13px;color:#666;padding:4px 0;">Frete</td>
                <td style="font-size:13px;color:#333;text-align:right;padding:4px 0;">${data.shippingCost === 0 ? "Grátis" : formatCurrencyEmail(data.shippingCost)}</td>
              </tr>
              <tr>
                <td style="font-size:15px;font-weight:700;color:#1a1a2e;padding-top:12px;border-top:2px solid #f0f0f0;">Total pago</td>
                <td style="font-size:15px;font-weight:700;color:#1a1a2e;text-align:right;padding-top:12px;border-top:2px solid #f0f0f0;">${formatCurrencyEmail(data.total)}</td>
              </tr>
            </table>

            <!-- Payment & Shipping -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:top;padding-right:12px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Pagamento</p>
                  <p style="margin:0;font-size:14px;color:#333;">${PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}</p>
                </td>
                <td width="50%" style="vertical-align:top;padding-left:12px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Endereço de entrega</p>
                  <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">${data.address}</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              Dúvidas? Entre em contato pelo e-mail <a href="mailto:contato@editorajocum.com.br" style="color:#1a1a2e;">contato@editorajocum.com.br</a><br>
              Editora JOCUM · Curitiba, PR
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(orderId: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY não configurado — pedido ${orderId} sem e-mail`);
    return;
  }

  try {
    const supabase = await createAdminClient();
    const { data: rawOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (!rawOrder) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = rawOrder as any;
    const address = order.shipping_address as Record<string, string>;
    const addressText = [
      `${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ""}`,
      `${address.neighborhood} · ${address.city}/${address.state}`,
      `CEP ${address.cep}`,
    ].join("<br>");

    const items = ((order.order_items ?? []) as any[]).map((i: any) => ({
      title: i.title as string,
      quantity: i.quantity as number,
      totalPrice: i.total_price as number,
    }));

    await sendEmail(
      order.customer_email,
      `Pedido ${order.order_number} confirmado ✓`,
      buildOrderEmailHtml({
        customerName: order.customer_name,
        orderNumber: order.order_number,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shipping_cost,
        paymentMethod: order.payment_method ?? "pix",
        items,
        address: addressText,
      }),
      "order_confirmation"
    );
  } catch (err) {
    console.error("[Email] Erro ao enviar confirmação:", err);
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function logEmail(type: string) {
  try {
    const supabase = await createAdminClient();
    await supabase.from("email_logs").insert({ email_type: type });
  } catch {
    // non-critical — never block email sending
  }
}

async function sendEmail(to: string, subject: string, html: string, type = "unknown") {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY não configurado — e-mail para ${to} ignorado`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `Editora JOCUM <${process.env.EMAIL_FROM ?? "noreply@editorajocum.com.br"}>`;
  try {
    await resend.emails.send({ from, to, subject, html });
    console.log(`[Email] "${subject}" → ${to}`);
    logEmail(type).catch(() => null);
  } catch (err) {
    console.error(`[Email] Erro ao enviar "${subject}":`, err);
  }
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://editorajocum.com.br";

function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:#1a1a2e;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Editora JOCUM</p>
</td></tr>
<tr><td style="padding:32px 40px;">
  <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e;">${title}</h2>
  ${body}
</td></tr>
<tr><td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#999;">Dúvidas? <a href="mailto:contato@editorajocum.com.br" style="color:#1a1a2e;">contato@editorajocum.com.br</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Boas-vindas (cadastro) ────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const html = baseHtml(
    `Bem-vindo, ${name.split(" ")[0]}!`,
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
      Sua conta na <strong>Editora JOCUM</strong> foi criada com sucesso.
      Explore nosso catálogo de livros e recursos para a sua jornada.
    </p>
    <a href="${SITE}/editora" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Acessar a loja →
    </a>`
  );
  await sendEmail(to, "Bem-vindo à Editora JOCUM!", html, "welcome");
}

// ─── Afiliado aprovado ─────────────────────────────────────────────────────────

export async function sendAffiliateApprovedEmail(to: string, name: string, affiliateLink: string) {
  const html = baseHtml(
    "Sua conta de afiliado foi aprovada! 🎉",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>! Você agora faz parte do programa de afiliados da Editora JOCUM.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
      Seu link exclusivo: <a href="${affiliateLink}" style="color:#1a1a2e;font-weight:600;">${affiliateLink}</a>
    </p>
    <a href="${SITE}/afiliados/painel" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Acessar painel de afiliado →
    </a>`
  );
  await sendEmail(to, "Você foi aprovado como afiliado da Editora JOCUM!", html, "affiliate_approved");
}

// ─── Saque processado / recusado ───────────────────────────────────────────────

export async function sendWithdrawalStatusEmail(
  to: string, name: string,
  status: "pago" | "recusado",
  amount: number, notes?: string
) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const isPaid = status === "pago";
  const html = baseHtml(
    isPaid ? `Saque de ${fmt(amount)} processado ✓` : `Saque recusado`,
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>.
      ${isPaid
        ? `Seu saque de <strong>${fmt(amount)}</strong> foi processado com sucesso.`
        : `Seu pedido de saque de <strong>${fmt(amount)}</strong> foi recusado.`}
    </p>
    ${notes ? `<p style="font-size:13px;color:#777;margin:0 0 20px;"><em>${notes}</em></p>` : ""}
    <a href="${SITE}/afiliados/painel" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Ver meu painel →
    </a>`
  );
  await sendEmail(to, isPaid ? `Saque de ${fmt(amount)} confirmado` : "Seu saque foi recusado", html, "withdrawal_status");
}

// ─── SAC — resposta do admin ───────────────────────────────────────────────────

export async function sendSacReplyEmail(to: string, customerName: string, ticketSubject: string, replyText: string) {
  const html = baseHtml(
    `Resposta ao seu chamado`,
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 8px;">
      Olá, <strong>${customerName.split(" ")[0]}</strong>. Temos uma atualização sobre seu chamado:
    </p>
    <p style="font-size:13px;color:#777;margin:0 0 16px;">Assunto: <em>${ticketSubject}</em></p>
    <div style="background:#f8f8f8;border-left:3px solid #1a1a2e;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;color:#333;line-height:1.7;margin-bottom:24px;">
      ${replyText.replace(/\n/g, "<br>")}
    </div>
    <a href="${SITE}/minha-conta" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Minha conta →
    </a>`
  );
  await sendEmail(to, `Re: ${ticketSubject}`, html, "sac_reply");
}

// ─── Solicitação de avaliação após entrega ────────────────────────────────────

export async function sendReviewRequestEmail(
  to: string,
  customerName: string,
  orderNumber: string,
  books: Array<{ title: string; slug: string; coverUrl: string | null }>,
) {
  const bookItems = books.map((b) => `
    <tr>
      <td style="padding:8px 0;vertical-align:middle;">
        ${b.coverUrl ? `<img src="${b.coverUrl}" width="40" height="56" style="border-radius:4px;object-fit:cover;display:block;" alt="${b.title}" />` : ""}
      </td>
      <td style="padding:8px 12px;vertical-align:middle;font-size:14px;color:#333;">${b.title}</td>
      <td style="padding:8px 0;vertical-align:middle;text-align:right;">
        <a href="${SITE}/editora/livros/${b.slug}?avaliar=1" style="background:#1a1a2e;color:#fff;text-decoration:none;padding:7px 16px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;">
          Avaliar →
        </a>
      </td>
    </tr>`).join("");

  const html = baseHtml(
    "Sua opinião importa! Avalie seu pedido",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
      Olá, <strong>${customerName.split(" ")[0]}</strong>! O pedido <strong>#${orderNumber}</strong> foi entregue. Que tal deixar sua avaliação? Isso ajuda outros leitores a conhecerem os livros.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${bookItems}
    </table>
    <p style="font-size:12px;color:#aaa;text-align:center;">Leva menos de 1 minuto ✨</p>`
  );
  await sendEmail(to, `Como foi o pedido #${orderNumber}? Deixe sua avaliação`, html, "review_request");
}

// ─── Formulário de contato — confirmação ao visitante ─────────────────────────

export async function sendContactConfirmationEmail(to: string, name: string, message: string) {
  const html = baseHtml(
    "Recebemos sua mensagem!",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>! Recebemos sua mensagem e entraremos em contato em breve.
    </p>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;font-size:13px;color:#666;line-height:1.6;margin-bottom:8px;">
      ${message.substring(0, 300).replace(/\n/g, "<br>")}${message.length > 300 ? "…" : ""}
    </div>`
  );
  await sendEmail(to, "Recebemos sua mensagem — Editora JOCUM", html, "contact_confirmation");
}

// ─── Cancelamentos ────────────────────────────────────────────────────────────

export async function sendCancellationRequestedEmail(to: string, name: string, orderNumber: string) {
  const html = baseHtml(
    "Solicitação de cancelamento recebida",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>! Recebemos sua solicitação de cancelamento do pedido <strong>#${orderNumber}</strong>.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
      Nossa equipe analisará o pedido e você receberá um retorno em até <strong>1 dia útil</strong>.
    </p>
    <a href="${SITE}/minha-conta/pedidos" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Acompanhar pedidos →
    </a>`
  );
  await sendEmail(to, `Cancelamento do pedido #${orderNumber} em análise`, html, "cancellation_requested");
}

export async function sendCancellationApprovedEmail(
  to: string, name: string, orderNumber: string, refundAmount: number,
) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const html = baseHtml(
    "Cancelamento aprovado",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>! O cancelamento do pedido <strong>#${orderNumber}</strong> foi aprovado.
    </p>
    ${refundAmount > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        Reembolso de <strong>${fmt(refundAmount)}</strong> iniciado. O valor será estornado na forma de pagamento original em até <strong>5 dias úteis</strong>.
      </p>
    </div>` : ""}
    <a href="${SITE}/minha-conta/pedidos" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Meus pedidos →
    </a>`
  );
  await sendEmail(to, `Pedido #${orderNumber} cancelado`, html, "cancellation_approved");
}

export async function sendCancellationDeniedEmail(
  to: string, name: string, orderNumber: string, adminNotes?: string,
) {
  const html = baseHtml(
    "Cancelamento não autorizado",
    `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Olá, <strong>${name.split(" ")[0]}</strong>. Infelizmente não foi possível cancelar o pedido <strong>#${orderNumber}</strong>.
    </p>
    ${adminNotes ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#991b1b;">${adminNotes}</p>
    </div>` : ""}
    <p style="font-size:14px;color:#555;margin:0 0 20px;">Precisa de ajuda? Entre em contato com nossa equipe.</p>
    <a href="${SITE}/editora/contato" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Falar com suporte →
    </a>`
  );
  await sendEmail(to, `Pedido #${orderNumber}: cancelamento não aprovado`, html, "cancellation_denied");
}

export async function sendCancellationAdminNotifyEmail(
  orderNumber: string, customerName: string, reason: string,
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "contato@editorajocum.com.br";
  const html = baseHtml(
    "Nova solicitação de cancelamento",
    `<p style="font-size:14px;color:#555;margin:0 0 16px;">
      <strong>Pedido:</strong> #${orderNumber}<br>
      <strong>Cliente:</strong> ${customerName}<br>
      <strong>Motivo:</strong> ${reason}
    </p>
    <a href="${SITE}/admin/editora/pedidos" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Ver no painel →
    </a>`
  );
  await sendEmail(adminEmail, `[Cancelamento] Pedido #${orderNumber} — ${customerName}`, html, "cancellation_admin_notify");
}

// ─── Formulário de contato — notificação ao admin ─────────────────────────────

export async function sendContactNotificationEmail(name: string, email: string, message: string, subject?: string) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "contato@editorajocum.com.br";
  const html = baseHtml(
    "Nova mensagem de contato",
    `<p style="font-size:14px;color:#555;margin:0 0 16px;">
      <strong>De:</strong> ${name} &lt;${email}&gt;<br>
      ${subject ? `<strong>Assunto:</strong> ${subject}<br>` : ""}
    </p>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;font-size:14px;color:#333;line-height:1.7;">
      ${message.replace(/\n/g, "<br>")}
    </div>`
  );
  await sendEmail(adminEmail, `[Contato] ${name}: ${subject ?? message.substring(0, 50)}`, html, "contact_admin_notification");
}
