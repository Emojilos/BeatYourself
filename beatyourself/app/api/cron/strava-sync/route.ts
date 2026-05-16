import { timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";
import {
  StravaNotConnectedError,
  StravaReconnectRequiredError,
} from "@/lib/strava/client";
import { syncUserActivities } from "@/lib/services/strava-sync";

interface UserSyncSummary {
  userId: string;
  ok: boolean;
  fetched?: number;
  upserted?: number;
  pages?: number;
  reason?: string;
}

export async function POST(request: Request): Promise<Response> {
  if (!env.CRON_SECRET) {
    return Response.json({ error: "Cron not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !isValidBearer(authHeader, env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.stravaIntegration.findMany({
    where: { needsReconnect: false },
    select: { userId: true },
  });

  const summaries: UserSyncSummary[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const { userId } of integrations) {
    try {
      const result = await syncUserActivities(userId);
      successCount += 1;
      summaries.push({
        userId,
        ok: true,
        fetched: result.fetched,
        upserted: result.upserted,
        pages: result.pages,
      });
      console.info(
        `[strava-sync] user=${userId} ok fetched=${result.fetched} upserted=${result.upserted} pages=${result.pages}`,
      );
    } catch (err) {
      failureCount += 1;
      const reason = classifyError(err);
      summaries.push({ userId, ok: false, reason });
      console.error(`[strava-sync] user=${userId} error reason=${reason}`, err);
    }
  }

  console.info(
    `[strava-sync] run complete users=${integrations.length} ok=${successCount} fail=${failureCount}`,
  );

  return Response.json({
    users: integrations.length,
    ok: successCount,
    fail: failureCount,
    results: summaries,
  });
}

function classifyError(err: unknown): string {
  if (err instanceof StravaReconnectRequiredError) return "reconnect_required";
  if (err instanceof StravaNotConnectedError) return "not_connected";
  if (err instanceof Error) return err.name || "error";
  return "unknown";
}

function isValidBearer(header: string, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  const actualBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
