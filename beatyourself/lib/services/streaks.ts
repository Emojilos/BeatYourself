import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_USER_TZ = "Europe/Moscow";

export type StreakActivity = { activityDate: Date };

export type StreakResult = { current: number; longest: number };

export function calculateStreak(
  activities: readonly StreakActivity[],
  userTz: string = DEFAULT_USER_TZ,
  now: Date = new Date(),
): StreakResult {
  if (activities.length === 0) {
    return { current: 0, longest: 0 };
  }

  const activeDays = new Set<string>();
  for (const a of activities) {
    activeDays.add(toUtcDayKey(a.activityDate));
  }

  const longest = computeLongestStreak(activeDays);
  const current = computeCurrentStreak(activeDays, userTz, now);

  return { current, longest };
}

function computeLongestStreak(activeDays: ReadonlySet<string>): number {
  const sorted = [...activeDays].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev !== null && shiftDayKey(prev, 1) === key) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }
  return longest;
}

function computeCurrentStreak(activeDays: ReadonlySet<string>, userTz: string, now: Date): number {
  const todayKey = formatInTimeZone(now, userTz, "yyyy-MM-dd");

  let cursor: string;
  if (activeDays.has(todayKey)) {
    cursor = todayKey;
  } else {
    const yesterdayKey = shiftDayKey(todayKey, -1);
    if (!activeDays.has(yesterdayKey)) return 0;
    cursor = yesterdayKey;
  }

  let count = 0;
  while (activeDays.has(cursor)) {
    count += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return count;
}

function toUtcDayKey(d: Date): string {
  return formatInTimeZone(d, "UTC", "yyyy-MM-dd");
}

function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return toUtcDayKey(date);
}
