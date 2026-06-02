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

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const items = ((order.order_items ?? []) as any[]).map((i: any) => ({
      title: i.title as string,
      quantity: i.quantity as number,
      totalPrice: i.total_price as number,
    }));

    await resend.emails.send({
      from: "Editora JOCUM <noreply@editorajocum.com.br>",
      to: order.customer_email,
      subject: `Pedido ${order.order_number} confirmado ✓`,
      html: buildOrderEmailHtml({
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
    });

    console.log(`[Email] Confirmação enviada para ${order.customer_email} — pedido ${order.order_number}`);
  } catch (err) {
    console.error("[Email] Erro ao enviar confirmação:", err);
  }
}
