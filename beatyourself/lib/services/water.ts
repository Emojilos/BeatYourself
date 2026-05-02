import "server-only";

import type { WaterLog } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/db/prisma";
import { DEFAULT_USER_TZ } from "@/lib/services/streaks";

const DEFAULT_WATER_GOAL_ML = 2000;

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

  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const earliestKey = shiftDayKey(todayKey, -(days - 1));
  const start = fromZonedTime(`${earliestKey}T00:00:00.000`, tz);
  const end = fromZonedTime(`${shiftDayKey(todayKey, 1)}T00:00:00.000`, tz);

  const logs = await prisma.waterLog.findMany({
    where: { userId, loggedAt: { gte: start, lt: end } },
    select: { amountMl: true, loggedAt: true },
  });

  const totals = new Map<string, number>();
  for (const log of logs) {
    const key = formatInTimeZone(log.loggedAt, tz, "yyyy-MM-dd");
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

function userTzDayBounds(now: Date, tz: string): { start: Date; end: Date } {
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const tomorrowKey = shiftDayKey(todayKey, 1);
  return {
    start: fromZonedTime(`${todayKey}T00:00:00.000`, tz),
    end: fromZonedTime(`${tomorrowKey}T00:00:00.000`, tz),
  };
}

function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}
