import "server-only";

import type { Challenge, ChallengeStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { CreateChallengeInput, UpdateChallengeInput } from "@/lib/validation/challenge";

export interface ListChallengesFilter {
  status?: ChallengeStatus;
  year?: number;
}

export async function createChallenge(
  userId: string,
  input: CreateChallengeInput,
): Promise<Challenge> {
  return prisma.challenge.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      type: input.type,
      metric: input.metric,
      targetValue: input.targetValue,
      unit: input.unit,
      difficulty: input.difficulty,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
      icon: input.icon,
    },
  });
}

export async function getChallenge(userId: string, id: string): Promise<Challenge | null> {
  return prisma.challenge.findFirst({ where: { id, userId } });
}

export async function listChallenges(
  userId: string,
  filter: ListChallengesFilter = {},
): Promise<Challenge[]> {
  const where: Prisma.ChallengeWhereInput = { userId };

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.year !== undefined) {
    const yearStart = new Date(Date.UTC(filter.year, 0, 1));
    const yearEnd = new Date(Date.UTC(filter.year, 11, 31));
    where.startDate = { lte: yearEnd };
    where.endDate = { gte: yearStart };
  }

  return prisma.challenge.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateChallenge(
  userId: string,
  id: string,
  input: UpdateChallengeInput,
): Promise<Challenge | null> {
  const existing = await prisma.challenge.findFirst({ where: { id, userId } });
  if (!existing) return null;

  if (input.endDate && input.endDate.getTime() < existing.startDate.getTime()) {
    throw new Error("End date must be on or after the challenge start date");
  }

  const data: Prisma.ChallengeUpdateInput = {};
  if (input.description !== undefined) data.description = input.description;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.color !== undefined) data.color = input.color;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.status !== undefined) data.status = input.status;

  return prisma.challenge.update({ where: { id }, data });
}

export async function deleteChallenge(userId: string, id: string): Promise<Challenge | null> {
  const existing = await prisma.challenge.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.challenge.delete({ where: { id } });
}
