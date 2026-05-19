import "server-only";

import { randomBytes } from "node:crypto";

import { env } from "@/config/env";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_SCOPE = "read,activity:read_all";

export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: { id: number };
}

export interface StravaRefreshResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export class StravaOAuthError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "StravaOAuthError";
    this.status = status;
    this.body = body;
  }
}

export function buildRedirectUri(): string {
  return `${env.NEXTAUTH_URL.replace(/\/+$/, "")}/api/strava/callback`;
}

function requireCredentials(): { clientId: string; clientSecret: string } {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    throw new Error("Strava client credentials are not configured");
  }
  return { clientId: env.STRAVA_CLIENT_ID, clientSecret: env.STRAVA_CLIENT_SECRET };
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function getAuthUrl(state: string): string {
  const { clientId } = requireCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildRedirectUri(),
    response_type: "code",
    scope: STRAVA_SCOPE,
    approval_prompt: "auto",
    state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new StravaOAuthError(`Strava token exchange failed (${res.status})`, res.status, text);
  }
  return (await res.json()) as StravaTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaRefreshResponse> {
  const { clientId, clientSecret } = requireCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new StravaOAuthError(`Strava token refresh failed (${res.status})`, res.status, text);
  }
  return (await res.json()) as StravaRefreshResponse;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
