/**
 * Constantes do delay de envio automático ao Bling — ver supabase/migrations/045_*.sql e
 * lib/orders/process-approved-payment.ts. Puro cálculo de data, sem I/O — importável tanto
 * em código de servidor (processApprovedPayment, cron) quanto em componentes client (UI).
 */

// Tempo de espera após o pagamento antes do cron poder disparar o Bling. Configurável via
// env pra permitir ajuste em produção sem novo deploy, com fallback pro valor pedido (30min).
export const BLING_AUTO_SEND_DELAY_MINUTES =
  Number(process.env.BLING_AUTO_SEND_DELAY_MINUTES) || 30;

// Janela de tolerância na UI depois de bling_send_after passar, antes de trocar o badge calmo
// "Aguardando envio automático" pelo alerta vermelho urgente. Cobre o intervalo entre ciclos
// do cron + tempo de processamento de um batch — não deve ser menor que isso.
export const BLING_AUTO_SEND_GRACE_MINUTES = 20;

export function computeBlingSendAfter(from: Date = new Date()): string {
  return new Date(from.getTime() + BLING_AUTO_SEND_DELAY_MINUTES * 60_000).toISOString();
}

/** true enquanto ainda estamos dentro do prazo esperado (agendado + margem de tolerância). */
export function isWithinBlingAutoSendWindow(sendAfter: string | null, now: Date = new Date()): boolean {
  if (!sendAfter) return false;
  const graceEndMs = new Date(sendAfter).getTime() + BLING_AUTO_SEND_GRACE_MINUTES * 60_000;
  return now.getTime() < graceEndMs;
}
