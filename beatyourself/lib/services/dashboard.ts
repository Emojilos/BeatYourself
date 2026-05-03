import "server-only";

import type { Challenge } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { calculateStreak, DEFAULT_USER_TZ, type StreakResult } from "@/lib/services/streaks";
import { getTodayWater, type TodayWater } from "@/lib/services/water";
import { getLatestWeight, type LatestWeight } from "@/lib/services/weight";
import { formatUtcDayKey, shiftDayKey } from "@/lib/utils/date-tz";

export interface HeatmapCell {
  date: string;
  count: number;
}

export interface DashboardData {
  streak: StreakResult;
  activeChallenges: Challenge[];
  heatmapData: HeatmapCell[];
  recentAchievements: Challenge[];
  waterToday: TodayWater;
  weightLatest: LatestWeight | null;
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

  const [activities, activeChallenges, recentAchievements, waterToday, weightLatest] =
    await Promise.all([
      prisma.activity.findMany({
        where: { userId },
        select: { activityDate: true },
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
    ]);

  const streak = calculateStreak(activities, userTz, now);
  const heatmapData = buildHeatmap(activities, now, heatmapDays);

  return {
    streak,
    activeChallenges,
    heatmapData,
    recentAchievements,
    waterToday,
    weightLatest,
  };
}

function buildHeatmap(
  activities: ReadonlyArray<{ activityDate: Date }>,
  now: Date,
  days: number,
): HeatmapCell[] {
  if (days <= 0) return [];

  // Activity.activityDate is @db.Date (UTC midnight) — bucket by UTC day key.
  // The window's "today" is also taken in UTC: an activity logged today (UTC) is
  // shown as today's cell regardless of the viewer's tz, matching the streak
  // service's UTC bucketing.
  const todayKey = formatUtcDayKey(now);
  const earliestKey = shiftDayKey(todayKey, -(days - 1));

  const counts = new Map<string, number>();
  for (const a of activities) {
    const key = formatUtcDayKey(a.activityDate);
    if (key < earliestKey || key > todayKey) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
