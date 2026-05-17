import * as Sentry from "@sentry/nextjs";

import { makeBeforeSend } from "@/lib/sentry/scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && process.env.NODE_ENV !== "development") {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    enabled: true,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: makeBeforeSend(),
  });
}
