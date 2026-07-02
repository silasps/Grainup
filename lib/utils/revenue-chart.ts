import {
  addBrasiliaCalendarMonths,
  getBrasiliaDateParts,
} from "@/lib/utils/brasilia-time";

export type ChartGranularity = "day" | "week" | "month" | "year";

export const GRANULARITY_LABEL: Record<ChartGranularity, string> = {
  day: "Dia", week: "Semana", month: "Mês", year: "Ano",
};
export const GRANULARITY_SUBTITLE: Record<ChartGranularity, string> = {
  day: "Últimos 30 dias", week: "Últimas 12 semanas", month: "Últimos 6 meses", year: "Últimos 5 anos",
};

const GRANULARITY_COUNT: Record<ChartGranularity, number> = { day: 30, week: 12, month: 6, year: 5 };
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const pad = (n: number) => String(n).padStart(2, "0");

// Todas as datas de receita são agrupadas no calendário de Brasília. Nunca
// comparar prefixo de string ISO (UTC) com um "dia local", ou produção,
// localhost, gráficos e tabelas passam a discordar sobre o mesmo pagamento.
function civilDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const d = civilDate(parts.year, parts.month, parts.day + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function startOfBrasiliaWeek(parts: { year: number; month: number; day: number }) {
  const dayOfWeek = civilDate(parts.year, parts.month, parts.day).getUTCDay();
  const offset = (dayOfWeek + 6) % 7; // 0 = segunda-feira
  return addDays(parts, -offset);
}

function keyForParts(parts: { year: number; month: number; day: number }, granularity: ChartGranularity) {
  if (granularity === "day") return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  if (granularity === "week") {
    const start = startOfBrasiliaWeek(parts);
    return `${start.year}-${pad(start.month)}-${pad(start.day)}`;
  }
  if (granularity === "month") return `${parts.year}-${pad(parts.month)}`;
  return String(parts.year);
}

function bucketKeyFor(date: Date, granularity: ChartGranularity): string {
  return keyForParts(getBrasiliaDateParts(date), granularity);
}

export interface MovementLike {
  status: string;
  paid_at: string | null;
  created_at: string;
  net_amount: number;
  gross_amount?: number;
}

export interface RevenueBucket {
  name: string;
  receita: number;
  bruto: number;
}

export function buildRevenueBuckets(
  movements: MovementLike[],
  granularity: ChartGranularity,
  now: Date,
): RevenueBucket[] {
  const paid = movements.filter((m) => m.status === "pago");
  const count = GRANULARITY_COUNT[granularity];
  const buckets: { name: string; matchKey: string }[] = [];
  const today = getBrasiliaDateParts(now);

  if (granularity === "day") {
    for (let i = count - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      buckets.push({ name: `${pad(d.day)}/${pad(d.month)}`, matchKey: keyForParts(d, granularity) });
    }
  } else if (granularity === "week") {
    const thisWeekStart = startOfBrasiliaWeek(today);
    for (let i = count - 1; i >= 0; i--) {
      const d = addDays(thisWeekStart, -i * 7);
      buckets.push({ name: `${pad(d.day)}/${pad(d.month)}`, matchKey: keyForParts(d, granularity) });
    }
  } else if (granularity === "month") {
    for (let i = count - 1; i >= 0; i--) {
      const d = addBrasiliaCalendarMonths({ year: today.year, month: today.month, day: 1 }, -i);
      buckets.push({ name: MONTH_NAMES[d.month - 1], matchKey: keyForParts(d, granularity) });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const y = today.year - i;
      buckets.push({ name: String(y), matchKey: String(y) });
    }
  }

  const sums = new Map<string, { receita: number; bruto: number }>();
  for (const m of paid) {
    const key = bucketKeyFor(new Date(m.paid_at ?? m.created_at), granularity);
    const entry = sums.get(key) ?? { receita: 0, bruto: 0 };
    entry.receita += m.net_amount;
    entry.bruto += m.gross_amount ?? 0;
    sums.set(key, entry);
  }

  return buckets.map((b) => {
    const s = sums.get(b.matchKey) ?? { receita: 0, bruto: 0 };
    return { name: b.name, receita: Math.round(s.receita), bruto: Math.round(s.bruto) };
  });
}
