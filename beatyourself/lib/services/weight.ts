import "server-only";

import type { UserSettings, WeightLog } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { LogWeightInput, SetWeightTargetInput } from "@/lib/validation/weight";

export interface LatestWeight {
  value: number;
  delta: number | null;
  measuredAt: Date;
}

export interface WeightTarget {
  weightKg: number;
  targetDate: Date | null;
}

export async function logWeight(userId: string, input: LogWeightInput): Promise<WeightLog> {
  const measuredAt = toUtcMidnight(input.measuredAt);
  const note = input.note ?? null;

  return prisma.weightLog.upsert({
    where: { userId_measuredAt: { userId, measuredAt } },
    update: { weightKg: input.weightKg, note },
    create: { userId, weightKg: input.weightKg, measuredAt, note },
  });
}

export async function getLatestWeight(userId: string): Promise<LatestWeight | null> {
  const recent = await prisma.weightLog.findMany({
    where: { userId },
    orderBy: { measuredAt: "desc" },
    take: 2,
    select: { weightKg: true, measuredAt: true },
  });

  if (recent.length === 0) return null;

  const [latest, previous] = recent;

  return {
    value: latest.weightKg,
    delta: previous ? latest.weightKg - previous.weightKg : null,
    measuredAt: latest.measuredAt,
  };
}

export async function listWeights(
  userId: string,
  days: number,
  now: Date = new Date(),
): Promise<WeightLog[]> {
  if (days <= 0) return [];

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1),
  );

  return prisma.weightLog.findMany({
    where: { userId, measuredAt: { gte: start } },
    orderBy: { measuredAt: "desc" },
  });
}

export async function deleteWeight(userId: string, id: string): Promise<WeightLog | null> {
  const existing = await prisma.weightLog.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.weightLog.delete({ where: { id } });
}

export async function getWeightTarget(userId: string): Promise<WeightTarget | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { weightTargetKg: true, weightTargetDate: true },
  });
  if (!settings?.weightTargetKg) return null;
  return {
    weightKg: settings.weightTargetKg,
    targetDate: settings.weightTargetDate ?? null,
  };
}

export async function setWeightTarget(
  userId: string,
  input: SetWeightTargetInput,
): Promise<UserSettings> {
  const targetDate = input.targetDate ? toUtcMidnight(input.targetDate) : null;
  return prisma.userSettings.upsert({
    where: { userId },
    update: { weightTargetKg: input.weightKg, weightTargetDate: targetDate },
    create: { userId, weightTargetKg: input.weightKg, weightTargetDate: targetDate },
  });
}

export async function clearWeightTarget(userId: string): Promise<UserSettings | null> {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (!existing) return null;
  return prisma.userSettings.update({
    where: { userId },
    data: { weightTargetKg: null, weightTargetDate: null },
  });
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
