import "server-only";

import { prisma } from "@/lib/db/prisma";

import { calculateProgress } from "./challenge-progress";

export async function recalculateChallengeProgress(
  userId: string,
  options: { challengeId?: string } = {},
): Promise<void> {
  const challenges = await prisma.challenge.findMany({
    where: {
      userId,
      status: "active",
      ...(options.challengeId ? { id: options.challengeId } : {}),
    },
  });
  if (challenges.length === 0) return;

  let earliestStart = challenges[0].startDate;
  let latestEnd = challenges[0].endDate;
  for (const c of challenges) {
    if (c.startDate.getTime() < earliestStart.getTime()) earliestStart = c.startDate;
    if (c.endDate.getTime() > latestEnd.getTime()) latestEnd = c.endDate;
  }

  const activities = await prisma.activity.findMany({
    where: {
      userId,
      activityDate: { gte: earliestStart, lte: latestEnd },
    },
    select: {
      activityDate: true,
      activityType: true,
      steps: true,
      distanceKm: true,
      durationMin: true,
    },
  });

  const now = new Date();
  const updates = challenges.map((c) => {
    const value = calculateProgress(c, activities);
    const completed = value >= c.targetValue;
    return prisma.challenge.update({
      where: { id: c.id },
      data: completed
        ? { currentValue: value, status: "completed", completedAt: now }
        : { currentValue: value },
    });
  });
  await prisma.$transaction(updates);
}
