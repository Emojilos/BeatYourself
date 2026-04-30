import "server-only";

import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { z } from "zod";

loadEnvConfig(path.resolve(process.cwd(), ".."));

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 chars"),
  NEXTAUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  ALLOWED_EMAIL: z.email().optional(),
  STRAVA_CLIENT_ID: z.string().min(1).optional(),
  STRAVA_CLIENT_SECRET: z.string().min(1).optional(),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be 32 bytes (64 hex or 44 base64 chars)")
    .optional(),
  CRON_SECRET: z.string().min(16).optional(),
  SENTRY_DSN: z.url().optional(),
});

const parsed = envSchema.safeParse(coerceEmptyToUndefined(process.env));

if (!parsed.success) {
  const tree = z.treeifyError(parsed.error);
  console.error("[config/env] Invalid environment variables:");
  console.error(JSON.stringify(tree, null, 2));
  throw new Error("Invalid environment variables — see above");
}

export const env: z.infer<typeof envSchema> = parsed.data;

function coerceEmptyToUndefined(input: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = value === "" ? undefined : value;
  }
  return out;
}
