import "server-only";

import type { WeightLog } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { LogWeightInput } from "@/lib/validation/weight";

export interface LatestWeight {
  value: number;
  delta: number | null;
  measuredAt: Date;
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

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
