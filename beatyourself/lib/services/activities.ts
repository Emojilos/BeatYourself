import "server-only";

import type { Activity, ActivitySource, ActivityType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { recalculateChallengeProgress } from "@/lib/services/challenge-progress-recalc";
import type { CreateActivityInput, UpdateActivityInput } from "@/lib/validation/activity";

export interface ListActivitiesFilter {
  from?: Date;
  to?: Date;
  source?: ActivitySource;
}

export interface CreateStravaActivityInput {
  externalId: string;
  activityType: ActivityType;
  distanceKm?: number | null;
  durationMin?: number | null;
  steps?: number | null;
  activityDate: Date;
  note?: string | null;
  stravaData?: Prisma.InputJsonValue;
}

export async function createActivity(
  userId: string,
  input: CreateActivityInput,
  source: ActivitySource = "manual",
): Promise<Activity> {
  const activity = await prisma.activity.create({
    data: {
      userId,
      source,
      activityType: input.activityType,
      distanceKm: input.distanceKm,
      durationMin: input.durationMin,
      steps: input.steps,
      activityDate: input.activityDate,
      note: input.note,
    },
  });
  await recalculateChallengeProgress(userId);
  return activity;
}

export async function createStravaActivity(
  userId: string,
  input: CreateStravaActivityInput,
): Promise<Activity> {
  const data = {
    activityType: input.activityType,
    distanceKm: input.distanceKm ?? null,
    durationMin: input.durationMin ?? null,
    steps: input.steps ?? null,
    activityDate: input.activityDate,
    note: input.note ?? null,
    stravaData: input.stravaData,
  };
  const activity = await prisma.activity.upsert({
    where: { externalId_source: { externalId: input.externalId, source: "strava" } },
    create: {
      userId,
      source: "strava",
      externalId: input.externalId,
      ...data,
    },
    update: data,
  });
  await recalculateChallengeProgress(userId);
  return activity;
}

export async function getActivity(userId: string, id: string): Promise<Activity | null> {
  return prisma.activity.findFirst({ where: { id, userId } });
}

export async function listActivities(
  userId: string,
  filter: ListActivitiesFilter = {},
): Promise<Activity[]> {
  const where: Prisma.ActivityWhereInput = { userId };

  if (filter.source) {
    where.source = filter.source;
  }

  if (filter.from || filter.to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filter.from) dateFilter.gte = filter.from;
    if (filter.to) dateFilter.lte = filter.to;
    where.activityDate = dateFilter;
  }

  return prisma.activity.findMany({
    where,
    orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function updateActivity(
  userId: string,
  id: string,
  input: UpdateActivityInput,
): Promise<Activity | null> {
  const existing = await prisma.activity.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Prisma.ActivityUpdateInput = {};
  if (input.activityType !== undefined) data.activityType = input.activityType;
  if (input.distanceKm !== undefined) data.distanceKm = input.distanceKm;
  if (input.durationMin !== undefined) data.durationMin = input.durationMin;
  if (input.steps !== undefined) data.steps = input.steps;
  if (input.activityDate !== undefined) data.activityDate = input.activityDate;
  if (input.note !== undefined) data.note = input.note;

  const activity = await prisma.activity.update({ where: { id }, data });
  await recalculateChallengeProgress(userId);
  return activity;
}

export async function deleteActivity(userId: string, id: string): Promise<Activity | null> {
  const existing = await prisma.activity.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const activity = await prisma.activity.delete({ where: { id } });
  await recalculateChallengeProgress(userId);
  return activity;
}
