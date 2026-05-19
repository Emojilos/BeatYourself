import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/config/env";
import { requireSession } from "@/lib/auth/session";
import { generateOAuthState, getAuthUrl } from "@/lib/strava/oauth";

const STATE_COOKIE = "strava_oauth_state";
const STATE_MAX_AGE_SECONDS = 60 * 10;

export async function GET(): Promise<Response> {
  await requireSession();

  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    redirect("/profile?strava=error&reason=not_configured");
  }

  const state = generateOAuthState();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(getAuthUrl(state));
}
