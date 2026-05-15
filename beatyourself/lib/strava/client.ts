import "server-only";

import { decrypt, encrypt } from "@/lib/crypto/cipher";
import { prisma } from "@/lib/db/prisma";

import { refreshAccessToken, StravaOAuthError } from "./oauth";

const REFRESH_LEEWAY_MS = 5 * 60 * 1000;

// Per-userId in-memory mutex. While a refresh is in flight, parallel callers
// for the same userId await the same Promise instead of issuing duplicate
// Strava /oauth/token requests (which would rotate the refresh_token twice
// and invalidate the older one). Single-process scope is sufficient: the app
// runs as one Render worker; if we ever scale horizontally, swap this for a
// Redis-based lock keyed on userId.
const refreshLocks = new Map<string, Promise<string>>();

export class StravaNotConnectedError extends Error {
  readonly userId: string;
  constructor(userId: string) {
    super(`Strava integration not found for user ${userId}`);
    this.name = "StravaNotConnectedError";
    this.userId = userId;
  }
}

export class StravaReconnectRequiredError extends Error {
  readonly userId: string;
  constructor(userId: string, options?: { cause?: unknown }) {
    super(`Strava integration for user ${userId} requires reconnect`);
    this.name = "StravaReconnectRequiredError";
    this.userId = userId;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const integration = await prisma.stravaIntegration.findUnique({
    where: { userId },
    select: {
      accessTokenEncrypted: true,
      expiresAt: true,
      needsReconnect: true,
    },
  });

  if (!integration) {
    throw new StravaNotConnectedError(userId);
  }
  if (integration.needsReconnect) {
    throw new StravaReconnectRequiredError(userId);
  }

  if (integration.expiresAt.getTime() - Date.now() > REFRESH_LEEWAY_MS) {
    return decrypt(integration.accessTokenEncrypted);
  }

  const inFlight = refreshLocks.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const promise = performRefresh(userId).finally(() => {
    refreshLocks.delete(userId);
  });
  refreshLocks.set(userId, promise);
  return promise;
}

async function performRefresh(userId: string): Promise<string> {
  // Re-read inside the lock — another caller may have already refreshed
  // between our outer expiry check and acquiring this slot, in which case
  // the stored access_token is now fresh and we can skip the network call.
  const current = await prisma.stravaIntegration.findUnique({
    where: { userId },
    select: {
      accessTokenEncrypted: true,
      refreshTokenEncrypted: true,
      expiresAt: true,
      needsReconnect: true,
    },
  });

  if (!current) {
    throw new StravaNotConnectedError(userId);
  }
  if (current.needsReconnect) {
    throw new StravaReconnectRequiredError(userId);
  }
  if (current.expiresAt.getTime() - Date.now() > REFRESH_LEEWAY_MS) {
    return decrypt(current.accessTokenEncrypted);
  }

  const refreshToken = decrypt(current.refreshTokenEncrypted);

  let response;
  try {
    response = await refreshAccessToken(refreshToken);
  } catch (err) {
    if (err instanceof StravaOAuthError && (err.status === 400 || err.status === 401)) {
      await prisma.stravaIntegration.update({
        where: { userId },
        data: { needsReconnect: true },
      });
      throw new StravaReconnectRequiredError(userId, { cause: err });
    }
    throw err;
  }

  await prisma.stravaIntegration.update({
    where: { userId },
    data: {
      accessTokenEncrypted: encrypt(response.access_token),
      refreshTokenEncrypted: encrypt(response.refresh_token),
      expiresAt: new Date(response.expires_at * 1000),
      needsReconnect: false,
    },
  });

  return response.access_token;
}
