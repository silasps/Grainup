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

// Todas as datas são tratadas no fuso horário local do navegador — o mesmo
// que Intl.DateTimeFormat("pt-BR") usa para exibir datas nas tabelas. Nunca
// comparar prefixo de string ISO (que é UTC) com um "dia local", ou o
// gráfico e a tabela abaixo dele mostram dias diferentes pro mesmo pagamento.
function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfLocalWeek(d: Date) {
  const s = startOfLocalDay(d);
  const offset = (s.getDay() + 6) % 7; // 0 = segunda-feira
  s.setDate(s.getDate() - offset);
  return s;
}

function bucketKeyFor(date: Date, granularity: ChartGranularity): number {
  if (granularity === "day") return startOfLocalDay(date).getTime();
  if (granularity === "week") return startOfLocalWeek(date).getTime();
  if (granularity === "month") return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  return new Date(date.getFullYear(), 0, 1).getTime();
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
  const buckets: { name: string; matchKey: number }[] = [];

  if (granularity === "day") {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ name: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, matchKey: d.getTime() });
    }
  } else if (granularity === "week") {
    const thisWeekStart = startOfLocalWeek(now);
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - i * 7);
      buckets.push({ name: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, matchKey: d.getTime() });
    }
  } else if (granularity === "month") {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ name: MONTH_NAMES[d.getMonth()], matchKey: d.getTime() });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const y = now.getFullYear() - i;
      buckets.push({ name: String(y), matchKey: new Date(y, 0, 1).getTime() });
    }
  }

  const sums = new Map<number, { receita: number; bruto: number }>();
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
