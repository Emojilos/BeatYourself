import type { ErrorEvent, EventHint } from "@sentry/core";

const REDACTED = "[redacted]";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Long base64/hex blob without whitespace (NextAuth JWTs, Strava access tokens, opaque secrets).
// Strava tokens are short hex (40 chars); NextAuth JWTs are 3 dot-joined base64url segments.
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const LONG_HEX_PATTERN = /\b[a-f0-9]{32,}\b/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-+/=]+/gi;

const SENSITIVE_KEY_PATTERN =
  /^(authorization|cookie|set-cookie|x-csrf-token|password|access[_-]?token|refresh[_-]?token|encryption[_-]?key|cron[_-]?secret|nextauth[_-]?secret|client[_-]?secret|api[_-]?key|session|jwt)$/i;

const NAME_KEY_PATTERN =
  /^(name|first[_-]?name|last[_-]?name|full[_-]?name|user[_-]?name|username|display[_-]?name)$/i;

const EMAIL_KEY_PATTERN = /^(email|e[_-]?mail|user[_-]?email|primary[_-]?email)$/i;

const MAX_DEPTH = 6;

export function scrubString(input: string): string {
  if (!input) return input;
  return input
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(LONG_HEX_PATTERN, REDACTED);
}

export function scrubValue(key: string, value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;

  if (
    SENSITIVE_KEY_PATTERN.test(key) ||
    EMAIL_KEY_PATTERN.test(key) ||
    NAME_KEY_PATTERN.test(key)
  ) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) => scrubValue(`${key}.${idx}`, item, depth + 1));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(k, v, depth + 1);
    }
    return out;
  }

  return value;
}

function scrubHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_KEY_PATTERN.test(name)) {
      out[name] = REDACTED;
    } else {
      out[name] = typeof value === "string" ? scrubString(value) : value;
    }
  }
  return out;
}

export function scrubEvent<E extends ErrorEvent | null | undefined>(event: E): E {
  if (!event) return event;

  if (event.user) {
    const { id, geo } = event.user;
    const next: typeof event.user = {};
    for (const [k, v] of Object.entries(event.user)) {
      if (k === "email" || k === "username" || k === "ip_address" || k === "geo") continue;
      next[k] = v;
    }
    if (id !== undefined) next.id = id;
    if (geo) next.geo = { country_code: geo.country_code };
    event.user = next;
  }

  if (event.request) {
    event.request = {
      ...event.request,
      headers: scrubHeaders(event.request.headers),
      cookies: event.request.cookies ? {} : event.request.cookies,
      data: scrubValue("data", event.request.data) as typeof event.request.data,
      query_string:
        typeof event.request.query_string === "string"
          ? scrubString(event.request.query_string)
          : event.request.query_string,
    };
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data
        ? (scrubValue("data", crumb.data) as Record<string, unknown>)
        : crumb.data,
    }));
  }

  if (event.extra) {
    event.extra = scrubValue("extra", event.extra) as typeof event.extra;
  }

  if (event.tags) {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(event.tags)) {
      if (
        SENSITIVE_KEY_PATTERN.test(k) ||
        EMAIL_KEY_PATTERN.test(k) ||
        NAME_KEY_PATTERN.test(k)
      ) {
        next[k] = REDACTED;
      } else if (typeof v === "string") {
        next[k] = scrubString(v);
      } else {
        next[k] = v;
      }
    }
    event.tags = next as typeof event.tags;
  }

  if (event.message) {
    event.message = scrubString(event.message);
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => ({
      ...ex,
      value: ex.value ? scrubString(ex.value) : ex.value,
    }));
  }

  return event;
}

export function makeBeforeSend(): (
  event: ErrorEvent,
  hint: EventHint,
) => ErrorEvent | null {
  return (event) => scrubEvent(event);
}
