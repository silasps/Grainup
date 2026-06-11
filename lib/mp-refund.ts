export async function issueMpRefund(
  gatewayTransactionId: string,
  amount?: number,
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { success: false, error: "MERCADOPAGO_ACCESS_TOKEN não configurado" };

  try {
    const body = amount ? JSON.stringify({ amount }) : "{}";
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${gatewayTransactionId}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      },
    );
    const json = await res.json() as { id?: number; status?: string; message?: string };
    if (!res.ok) {
      return { success: false, error: json.message ?? `HTTP ${res.status}` };
    }
    return { success: true, refundId: String(json.id) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
