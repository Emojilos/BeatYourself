import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function formatUserTzDayKey(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export function formatUtcDayKey(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

export function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatUtcDayKey(date);
}

export function userTzDayBounds(now: Date, tz: string): { start: Date; end: Date } {
  const todayKey = formatUserTzDayKey(now, tz);
  const tomorrowKey = shiftDayKey(todayKey, 1);
  return {
    start: fromZonedTime(`${todayKey}T00:00:00.000`, tz),
    end: fromZonedTime(`${tomorrowKey}T00:00:00.000`, tz),
  };
}
