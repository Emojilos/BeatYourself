import "server-only";

import type { UserSettings, WaterLog } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { DEFAULT_USER_TZ } from "@/lib/services/streaks";
import { formatUserTzDayKey, shiftDayKey, userTzDayBounds } from "@/lib/utils/date-tz";
import { fromZonedTime } from "date-fns-tz";

const DEFAULT_WATER_GOAL_ML = 2000;
export const MIN_WATER_GOAL_ML = 100;
export const MAX_WATER_GOAL_ML = 20000;

export interface TodayWater {
  consumed: number;
  goal: number;
}

export interface WaterByDay {
  date: string;
  total: number;
}

export async function addWater(userId: string, amountMl: number): Promise<WaterLog> {
  return prisma.waterLog.create({
    data: { userId, amountMl },
  });
}

export async function getTodayWater(
  userId: string,
  tz: string = DEFAULT_USER_TZ,
  now: Date = new Date(),
): Promise<TodayWater> {
  const { start, end } = userTzDayBounds(now, tz);

  const [aggregate, settings] = await Promise.all([
    prisma.waterLog.aggregate({
      where: { userId, loggedAt: { gte: start, lt: end } },
      _sum: { amountMl: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { waterDailyGoalMl: true },
    }),
  ]);

  return {
    consumed: aggregate._sum.amountMl ?? 0,
    goal: settings?.waterDailyGoalMl ?? DEFAULT_WATER_GOAL_ML,
  };
}

export async function listWaterByDay(
  userId: string,
  days: number,
  tz: string = DEFAULT_USER_TZ,
  now: Date = new Date(),
): Promise<WaterByDay[]> {
  if (days <= 0) return [];

  const todayKey = formatUserTzDayKey(now, tz);
  const earliestKey = shiftDayKey(todayKey, -(days - 1));
  const start = fromZonedTime(`${earliestKey}T00:00:00.000`, tz);
  const end = fromZonedTime(`${shiftDayKey(todayKey, 1)}T00:00:00.000`, tz);

  const logs = await prisma.waterLog.findMany({
    where: { userId, loggedAt: { gte: start, lt: end } },
    select: { amountMl: true, loggedAt: true },
  });

  const totals = new Map<string, number>();
  for (const log of logs) {
    const key = formatUserTzDayKey(log.loggedAt, tz);
    totals.set(key, (totals.get(key) ?? 0) + log.amountMl);
  }

  return [...totals.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function deleteWater(userId: string, id: string): Promise<WaterLog | null> {
  const existing = await prisma.waterLog.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.waterLog.delete({ where: { id } });
}

export async function listWaterToday(
  userId: string,
  tz: string = DEFAULT_USER_TZ,
  now: Date = new Date(),
): Promise<WaterLog[]> {
  const { start, end } = userTzDayBounds(now, tz);
  return prisma.waterLog.findMany({
    where: { userId, loggedAt: { gte: start, lt: end } },
    orderBy: { loggedAt: "desc" },
  });
}

export async function setWaterGoal(userId: string, goalMl: number): Promise<UserSettings> {
  if (!Number.isInteger(goalMl) || goalMl < MIN_WATER_GOAL_ML || goalMl > MAX_WATER_GOAL_ML) {
    throw new Error(
      `Daily water goal must be an integer between ${MIN_WATER_GOAL_ML} and ${MAX_WATER_GOAL_ML} ml`,
    );
  }
  return prisma.userSettings.upsert({
    where: { userId },
    update: { waterDailyGoalMl: goalMl },
    create: { userId, waterDailyGoalMl: goalMl },
  });
}
