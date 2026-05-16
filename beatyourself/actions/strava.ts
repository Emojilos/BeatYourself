"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { syncUserActivities } from "@/lib/services/strava-sync";
import { StravaNotConnectedError, StravaReconnectRequiredError } from "@/lib/strava/client";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface SyncStravaResult {
  upserted: number;
  fetched: number;
  lastSyncAt: Date | null;
}

export async function disconnectStravaAction(): Promise<void> {
  const session = await requireSession();

  await prisma.stravaIntegration.deleteMany({
    where: { userId: session.user.id },
  });

  revalidatePath("/profile");
}

export async function syncStravaAction(): Promise<ActionResult<SyncStravaResult>> {
  const session = await requireSession();

  try {
    const result = await syncUserActivities(session.user.id);
    const integration = await prisma.stravaIntegration.findUnique({
      where: { userId: session.user.id },
      select: { lastSyncAt: true },
    });
    revalidatePath("/profile");
    return {
      success: true,
      data: {
        upserted: result.upserted,
        fetched: result.fetched,
        lastSyncAt: integration?.lastSyncAt ?? null,
      },
    };
  } catch (error) {
    if (error instanceof StravaReconnectRequiredError) {
      revalidatePath("/profile");
      return { success: false, error: "Требуется переподключение Strava" };
    }
    if (error instanceof StravaNotConnectedError) {
      return { success: false, error: "Strava не подключён" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось синхронизировать Strava",
    };
  }
}
