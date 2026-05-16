import "server-only";

import type { Challenge, Difficulty } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { calculateStreak, DEFAULT_USER_TZ } from "@/lib/services/streaks";

export interface ProfileFilter {
  year?: number;
  difficulty?: Difficulty;
}

export interface ProfileUser {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface ProfileStats {
  totalActivities: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalSteps: number;
  currentStreak: number;
  longestStreak: number;
}

export interface StravaConnection {
  athleteId: string;
  lastSyncAt: Date | null;
  connectedAt: Date;
  needsReconnect: boolean;
}

export interface ProfileData {
  user: ProfileUser;
  stats: ProfileStats;
  completed: Challenge[];
  failed: Challenge[];
  availableYears: number[];
  stravaConnected: boolean;
  stravaConnection: StravaConnection | null;
}

export interface GetProfileOptions {
  userTz?: string;
  now?: Date;
}

export async function getProfileData(
  userId: string,
  filter: ProfileFilter = {},
  options: GetProfileOptions = {},
): Promise<ProfileData> {
  const userTz = options.userTz ?? DEFAULT_USER_TZ;
  const now = options.now ?? new Date();

  const [user, activityAgg, streakActivities, archiveChallenges, stravaIntegration] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, avatarUrl: true },
      }),
      prisma.activity.aggregate({
        where: { userId },
        _count: { _all: true },
        _sum: { distanceKm: true, durationMin: true, steps: true },
      }),
      prisma.activity.findMany({
        where: { userId },
        select: { activityDate: true },
      }),
      prisma.challenge.findMany({
        where: { userId, status: { in: ["completed", "failed"] } },
        orderBy: [{ completedAt: "desc" }, { endDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.stravaIntegration.findUnique({
        where: { userId },
        select: {
          stravaAthleteId: true,
          lastSyncAt: true,
          connectedAt: true,
          needsReconnect: true,
        },
      }),
    ]);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const streak = calculateStreak(streakActivities, userTz, now);

  const availableYears = computeAvailableYears(archiveChallenges);
  const filtered = applyArchiveFilter(archiveChallenges, filter);
  const completed = filtered.filter((c) => c.status === "completed");
  const failed = filtered.filter((c) => c.status === "failed");

  return {
    user,
    stats: {
      totalActivities: activityAgg._count._all,
      totalDistanceKm: activityAgg._sum.distanceKm ?? 0,
      totalDurationMin: activityAgg._sum.durationMin ?? 0,
      totalSteps: activityAgg._sum.steps ?? 0,
      currentStreak: streak.current,
      longestStreak: streak.longest,
    },
    completed,
    failed,
    availableYears,
    stravaConnected: stravaIntegration !== null,
    stravaConnection: stravaIntegration
      ? {
          athleteId: stravaIntegration.stravaAthleteId.toString(),
          lastSyncAt: stravaIntegration.lastSyncAt,
          connectedAt: stravaIntegration.connectedAt,
          needsReconnect: stravaIntegration.needsReconnect,
        }
      : null,
  };
}

export function challengeArchiveYear(c: Pick<Challenge, "completedAt" | "endDate">): number {
  if (c.completedAt) return c.completedAt.getUTCFullYear();
  return c.endDate.getUTCFullYear();
}

function computeAvailableYears(challenges: readonly Challenge[]): number[] {
  const years = new Set<number>();
  for (const c of challenges) {
    years.add(challengeArchiveYear(c));
  }
  return [...years].sort((a, b) => b - a);
}

function applyArchiveFilter(challenges: readonly Challenge[], filter: ProfileFilter): Challenge[] {
  return challenges.filter((c) => {
    if (filter.year !== undefined && challengeArchiveYear(c) !== filter.year) return false;
    if (filter.difficulty !== undefined && c.difficulty !== filter.difficulty) return false;
    return true;
  });
}
