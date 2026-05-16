import type { ActivityType, ChallengeType, Metric } from "@prisma/client";

export type ProgressActivity = {
  activityDate: Date;
  activityType: ActivityType;
  steps: number | null;
  distanceKm: number | null;
  durationMin: number | null;
};

export type ProgressChallenge = {
  type: ChallengeType;
  metric: Metric;
  startDate: Date;
  endDate: Date;
};

export function calculateProgress(
  challenge: ProgressChallenge,
  activities: readonly ProgressActivity[],
): number {
  const inPeriod = activities.filter((a) =>
    isInPeriod(a.activityDate, challenge.startDate, challenge.endDate),
  );

  if (challenge.type === "cumulative") {
    return sumByMetric(inPeriod, challenge.metric);
  }

  // single_day: max(sum per calendar day in UTC).
  const byDay = new Map<string, ProgressActivity[]>();
  for (const a of inPeriod) {
    const key = utcDayKey(a.activityDate);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(a);
    else byDay.set(key, [a]);
  }

  let max = 0;
  for (const bucket of byDay.values()) {
    const v = sumByMetric(bucket, challenge.metric);
    if (v > max) max = v;
  }
  return max;
}

function sumByMetric(activities: readonly ProgressActivity[], metric: Metric): number {
  switch (metric) {
    case "steps":
      return activities.reduce((s, a) => s + (a.steps ?? 0), 0);
    case "distance_km":
      return activities.reduce((s, a) => s + (a.distanceKm ?? 0), 0);
    case "duration_min":
      return activities.reduce((s, a) => s + (a.durationMin ?? 0), 0);
    case "runs_count":
      return activities.reduce((s, a) => s + (a.activityType === "run" ? 1 : 0), 0);
    case "custom":
      return 0;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function isInPeriod(date: Date, start: Date, end: Date): boolean {
  // startDate/endDate are stored as @db.Date (UTC midnight). Activity.activityDate is the same.
  // Inclusive on both ends — calendar-day comparison.
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type DailyProgressPoint = {
  dayKey: string;
  daily: number;
  cumulative: number;
};

export function buildDailySeries(
  challenge: ProgressChallenge,
  activities: readonly ProgressActivity[],
): DailyProgressPoint[] {
  const inPeriod = activities.filter((a) =>
    isInPeriod(a.activityDate, challenge.startDate, challenge.endDate),
  );

  const byDay = new Map<string, ProgressActivity[]>();
  for (const a of inPeriod) {
    const key = utcDayKey(a.activityDate);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(a);
    else byDay.set(key, [a]);
  }

  const series: DailyProgressPoint[] = [];
  let cumulative = 0;
  const start = challenge.startDate.getTime();
  const end = challenge.endDate.getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  for (let t = start; t <= end; t += ONE_DAY) {
    const key = utcDayKey(new Date(t));
    const bucket = byDay.get(key);
    const daily = bucket ? sumByMetric(bucket, challenge.metric) : 0;
    cumulative += daily;
    series.push({ dayKey: key, daily, cumulative });
  }
  return series;
}
