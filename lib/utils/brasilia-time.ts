export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BRASILIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface BrasiliaDateParts {
  year: number;
  month: number;
  day: number;
}

export function getBrasiliaDateParts(date: Date): BrasiliaDateParts {
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function getBrasiliaOffsetMinutes(date: Date) {
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return (asUtc - date.getTime()) / 60_000;
}

export function brasiliaDateToUtcDate(year: number, month: number, day: number) {
  const guess = new Date(Date.UTC(year, month - 1, day, 3));
  const offsetMinutes = getBrasiliaOffsetMinutes(guess);

  return new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60_000);
}

export function brasiliaDateToUtcIso(year: number, month: number, day: number) {
  return brasiliaDateToUtcDate(year, month, day).toISOString();
}

export function addBrasiliaCalendarMonths(parts: BrasiliaDateParts, months: number): BrasiliaDateParts {
  const d = new Date(Date.UTC(parts.year, parts.month - 1 + months, parts.day));

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function addBrasiliaCalendarDays(parts: BrasiliaDateParts, days: number): BrasiliaDateParts {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function getBrasiliaDateKey(date: Date | string) {
  const parts = getBrasiliaDateParts(typeof date === "string" ? new Date(date) : date);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatBrasiliaDayMonth(parts: BrasiliaDateParts) {
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

export function getBrasiliaMonthRange(now: Date, monthOffset = 0) {
  const current = getBrasiliaDateParts(now);
  const start = addBrasiliaCalendarMonths({ year: current.year, month: current.month, day: 1 }, monthOffset);
  const end = addBrasiliaCalendarMonths(start, 1);

  return {
    startIso: brasiliaDateToUtcIso(start.year, start.month, start.day),
    endIso: brasiliaDateToUtcIso(end.year, end.month, end.day),
  };
}
