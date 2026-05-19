import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto/cipher";
import { prisma } from "@/lib/db/prisma";
import { exchangeCodeForTokens, StravaOAuthError } from "@/lib/strava/oauth";

const STATE_COOKIE = "strava_oauth_state";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await requireSession();

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value ?? null;
  cookieStore.delete(STATE_COOKIE);

  if (oauthError) {
    redirect(`/profile?strava=error&reason=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !state || !savedState || state !== savedState) {
    redirect("/profile?strava=error&reason=invalid_state");
  }

  const tokens = await exchangeCodeForTokens(code).catch((err: unknown) => {
    const detail = err instanceof StravaOAuthError ? String(err.status) : "unknown";
    console.error("[strava/callback] token exchange failed:", err);
    return { __error: detail } as const;
  });

  if ("__error" in tokens) {
    redirect(`/profile?strava=error&reason=exchange_failed&detail=${tokens.__error}`);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error("[strava/callback] ENCRYPTION_KEY is not configured");
    redirect("/profile?strava=error&reason=not_configured");
  }

  const accessTokenEncrypted = encrypt(tokens.access_token);
  const refreshTokenEncrypted = encrypt(tokens.refresh_token);
  const expiresAt = new Date(tokens.expires_at * 1000);
  const athleteId = BigInt(tokens.athlete.id);

  await prisma.stravaIntegration.upsert({
    where: { userId: session.user.id },
    update: {
      stravaAthleteId: athleteId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiresAt,
      needsReconnect: false,
    },
    create: {
      userId: session.user.id,
      stravaAthleteId: athleteId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiresAt,
    },
  });

  redirect("/profile?strava=connected");
}
