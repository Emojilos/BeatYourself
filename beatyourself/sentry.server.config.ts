import * as Sentry from "@sentry/nextjs";

import { env } from "@/config/env";
import { makeBeforeSend } from "@/lib/sentry/scrub";

if (env.SENTRY_DSN && process.env.NODE_ENV !== "development") {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: true,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: makeBeforeSend(),
  });
}
