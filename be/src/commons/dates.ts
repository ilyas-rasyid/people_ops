import { db } from "../database/client";

export function isoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function localParts(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export async function company() {
  return db.companySettings.findFirstOrThrow();
}

export async function scheduleFor(date: string) {
  return db.workSchedule.findFirst({
    where: {
      effectiveFrom: { lte: isoDate(date) },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: isoDate(date) } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function workdays(start: string, end: string): Promise<string[]> {
  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const days: string[] = [];
  for (
    let current = new Date(startDate);
    current <= endDate;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    if (days.length > 366) throw new Error("Date range exceeds the supported year.");
    const date = dateKey(current);
    const schedule = await scheduleFor(date);
    const weekday = current.getUTCDay() || 7;
    if (!schedule?.workingDays.split(",").map(Number).includes(weekday)) continue;
    if (await db.holiday.count({ where: { date: isoDate(date), status: "ACTIVE" } })) continue;
    days.push(date);
  }
  return days;
}
