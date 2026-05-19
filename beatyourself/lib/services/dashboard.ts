import "server-only";

import type { ActivitySource, ActivityType, Challenge } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { calculateStreak, DEFAULT_USER_TZ, type StreakResult } from "@/lib/services/streaks";
import { getTodayWater, type TodayWater } from "@/lib/services/water";
import { getLatestWeight, type LatestWeight } from "@/lib/services/weight";
import { formatUtcDayKey, shiftDayKey } from "@/lib/utils/date-tz";

export interface HeatmapActivity {
  id: string;
  activityType: ActivityType;
  distanceKm: number | null;
  durationMin: number | null;
  steps: number | null;
  source: ActivitySource;
  note: string | null;
}

export interface HeatmapCell {
  date: string;
  count: number;
  activities: HeatmapActivity[];
}

export interface DashboardWeightPoint {
  date: string;
  weightKg: number;
}

export interface DashboardData {
  streak: StreakResult;
  activeChallenges: Challenge[];
  heatmapData: HeatmapCell[];
  heatmapTodayKey: string;
  recentAchievements: Challenge[];
  waterToday: TodayWater;
  weightLatest: LatestWeight | null;
  weightRecent: DashboardWeightPoint[];
}

export interface GetDashboardOptions {
  userTz?: string;
  heatmapDays?: number;
  now?: Date;
}

export async function getDashboardData(
  userId: string,
  options: GetDashboardOptions = {},
): Promise<DashboardData> {
  const userTz = options.userTz ?? DEFAULT_USER_TZ;
  const heatmapDays = options.heatmapDays ?? 365;
  const now = options.now ?? new Date();
  const todayKey = formatUtcDayKey(now);
  const earliestKey = shiftDayKey(todayKey, -(heatmapDays - 1));
  const earliestDate = new Date(`${earliestKey}T00:00:00Z`);

  const [
    streakActivities,
    heatmapActivities,
    activeChallenges,
    recentAchievements,
    waterToday,
    weightLatest,
    weightRecentRows,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: { userId },
      select: { activityDate: true },
    }),
    prisma.activity.findMany({
      where: { userId, activityDate: { gte: earliestDate } },
      select: {
        id: true,
        activityDate: true,
        activityType: true,
        distanceKm: true,
        durationMin: true,
        steps: true,
        source: true,
        note: true,
      },
      orderBy: { activityDate: "asc" },
    }),
    prisma.challenge.findMany({
      where: { userId, status: "active" },
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.challenge.findMany({
      where: { userId, status: "completed" },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    getTodayWater(userId, userTz, now),
    getLatestWeight(userId),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { measuredAt: "desc" },
      take: 30,
      select: { measuredAt: true, weightKg: true },
    }),
  ]);

  const streak = calculateStreak(streakActivities, userTz, now);
  const heatmapData = buildHeatmap(heatmapActivities, todayKey, earliestKey, heatmapDays);
  const weightRecent: DashboardWeightPoint[] = [...weightRecentRows]
    .reverse()
    .map((row) => ({ date: formatUtcDayKey(row.measuredAt), weightKg: row.weightKg }));

  return {
    streak,
    activeChallenges,
    heatmapData,
    heatmapTodayKey: todayKey,
    recentAchievements,
    waterToday,
    weightLatest,
    weightRecent,
  };
}

type HeatmapActivityRow = {
  id: string;
  activityDate: Date;
  activityType: ActivityType;
  distanceKm: number | null;
  durationMin: number | null;
  steps: number | null;
  source: ActivitySource;
  note: string | null;
};

function buildHeatmap(
  activities: ReadonlyArray<HeatmapActivityRow>,
  todayKey: string,
  earliestKey: string,
  days: number,
): HeatmapCell[] {
  if (days <= 0) return [];

  // Activity.activityDate is @db.Date (UTC midnight) — bucket by UTC day key.
  // The window's "today" is also taken in UTC: an activity logged today (UTC) is
  // shown as today's cell regardless of the viewer's tz, matching the streak
  // service's UTC bucketing.
  const buckets = new Map<string, HeatmapActivity[]>();
  for (const a of activities) {
    const key = formatUtcDayKey(a.activityDate);
    if (key < earliestKey || key > todayKey) continue;
    const summary: HeatmapActivity = {
      id: a.id,
      activityType: a.activityType,
      distanceKm: a.distanceKm,
      durationMin: a.durationMin,
      steps: a.steps,
      source: a.source,
      note: a.note,
    };
    const list = buckets.get(key);
    if (list) list.push(summary);
    else buckets.set(key, [summary]);
  }

  return [...buckets.entries()]
    .map(([date, acts]) => ({
      date,
      count: acts.length,
      activities: acts,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
