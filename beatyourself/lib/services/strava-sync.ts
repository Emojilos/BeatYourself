import "server-only";

import type { ActivityType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { createStravaActivity } from "@/lib/services/activities";
import {
  getValidAccessToken,
  StravaReconnectRequiredError,
} from "@/lib/strava/client";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const INITIAL_SYNC_DAYS = 30;
const DEFAULT_PER_PAGE = 100;
const MAX_PAGES = 50;

export interface SyncOptions {
  since?: Date;
  limit?: number;
}

export interface SyncResult {
  userId: string;
  fetched: number;
  upserted: number;
  pages: number;
  since: Date;
}

interface StravaSummaryActivity {
  id: number;
  name?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  start_date: string;
  start_date_local?: string;
  timezone?: string;
  average_speed?: number;
  max_speed?: number;
  external_id?: string | null;
}

export class StravaSyncError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "StravaSyncError";
    this.status = status;
    this.body = body;
  }
}

export async function syncUserActivities(
  userId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const startedAt = new Date();
  const since = options.since ?? (await resolveSince(userId));
  const limit = options.limit;
  const afterEpoch = Math.floor(since.getTime() / 1000);

  const accessToken = await getValidAccessToken(userId);

  let fetched = 0;
  let upserted = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    const remaining = limit !== undefined ? limit - fetched : DEFAULT_PER_PAGE;
    if (remaining <= 0) break;
    const perPage = Math.min(DEFAULT_PER_PAGE, remaining);

    const batch = await fetchActivitiesPage(accessToken, userId, {
      after: afterEpoch,
      page,
      perPage,
    });

    if (batch.length === 0) break;

    for (const summary of batch) {
      const externalId = String(summary.id);
      const activityType = mapSportType(summary.sport_type ?? summary.type);
      const startIso = summary.start_date_local ?? summary.start_date;
      const activityDate = toActivityDate(startIso);
      const distanceKm =
        typeof summary.distance === "number" ? summary.distance / 1000 : null;
      const durationMin =
        typeof summary.moving_time === "number" ? summary.moving_time / 60 : null;

      await createStravaActivity(userId, {
        externalId,
        activityType,
        distanceKm,
        durationMin,
        steps: null,
        activityDate,
        note: summary.name ?? null,
        stravaData: pickStravaData(summary),
      });

      upserted += 1;
    }

    fetched += batch.length;
    page += 1;

    if (batch.length < perPage) break;
  }

  await prisma.stravaIntegration.update({
    where: { userId },
    data: { lastSyncAt: startedAt },
  });

  return { userId, fetched, upserted, pages: page - 1, since };
}

async function resolveSince(userId: string): Promise<Date> {
  const integration = await prisma.stravaIntegration.findUnique({
    where: { userId },
    select: { lastSyncAt: true },
  });
  if (integration?.lastSyncAt) return integration.lastSyncAt;
  return new Date(Date.now() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000);
}

async function fetchActivitiesPage(
  accessToken: string,
  userId: string,
  params: { after: number; page: number; perPage: number },
): Promise<StravaSummaryActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("after", String(params.after));
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("per_page", String(params.perPage));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    const body = await safeText(res);
    await prisma.stravaIntegration
      .update({ where: { userId }, data: { needsReconnect: true } })
      .catch(() => undefined);
    throw new StravaReconnectRequiredError(userId, {
      cause: new StravaSyncError("Strava API returned 401", 401, body),
    });
  }

  if (!res.ok) {
    throw new StravaSyncError(
      `Strava activities request failed (${res.status})`,
      res.status,
      await safeText(res),
    );
  }

  const json = (await res.json()) as StravaSummaryActivity[];
  if (!Array.isArray(json)) {
    throw new StravaSyncError(
      "Strava activities response was not an array",
      res.status,
      JSON.stringify(json).slice(0, 500),
    );
  }
  return json;
}

function mapSportType(sportType: string | undefined): ActivityType {
  if (!sportType) return "other";
  const s = sportType.toLowerCase();
  if (s.includes("run")) return "run";
  if (s.includes("walk") || s.includes("hike")) return "walk";
  return "other";
}

function toActivityDate(iso: string): Date {
  // start_date_local is wall-clock in the activity's local TZ but is emitted
  // with a "Z" suffix; treat it as UTC and truncate to YYYY-MM-DD so Prisma's
  // @db.Date column stores the user-local activity day, not a UTC-shifted one.
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function pickStravaData(summary: StravaSummaryActivity): Prisma.InputJsonValue {
  return {
    id: summary.id,
    name: summary.name ?? null,
    sport_type: summary.sport_type ?? null,
    type: summary.type ?? null,
    distance: summary.distance ?? null,
    moving_time: summary.moving_time ?? null,
    elapsed_time: summary.elapsed_time ?? null,
    total_elevation_gain: summary.total_elevation_gain ?? null,
    start_date: summary.start_date,
    start_date_local: summary.start_date_local ?? null,
    timezone: summary.timezone ?? null,
    average_speed: summary.average_speed ?? null,
    max_speed: summary.max_speed ?? null,
    external_id: summary.external_id ?? null,
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
