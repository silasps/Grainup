const WEEKDAYS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

/**
 * Texto "Chegada prevista..." a partir de dias úteis de prazo. `from` é o dia de referência
 * pro cálculo (pedido feito nesse dia) — no checkout é "agora"; no pedido já salvo, deve ser
 * o `created_at` do pedido, pra mostrar a mesma previsão dada na hora da compra.
 */
export function formatDeliveryRange(minDays: number, maxDays: number, from: Date = new Date()): string {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const minDate = addBusinessDays(today, minDays);
  const maxDate = addBusinessDays(today, maxDays);

  const fmtDate = (d: Date): string => {
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    return diff <= 6
      ? WEEKDAYS_PT[d.getDay()]
      : `${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
  };

  const sameDay = minDate.toDateString() === maxDate.toDateString();

  if (sameDay) {
    const daysLabel = maxDays === 1 ? "1 dia útil" : `${maxDays} dias úteis`;
    return `Chegada prevista ${fmtDate(maxDate)} (${daysLabel})`;
  }

  const daysLabel = `${minDays}–${maxDays} dias úteis`;
  if (
    minDate.getMonth() === maxDate.getMonth() &&
    minDate.getFullYear() === maxDate.getFullYear() &&
    Math.round((minDate.getTime() - today.getTime()) / 86400000) > 6
  ) {
    return `Chegada entre ${minDate.getDate()} e ${maxDate.getDate()} de ${MONTHS_PT[minDate.getMonth()]} (${daysLabel})`;
  }

  return `Chegada entre ${fmtDate(minDate)} e ${fmtDate(maxDate)} (${daysLabel})`;
}
