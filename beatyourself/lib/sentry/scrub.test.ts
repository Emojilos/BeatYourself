import type { ErrorEvent } from "@sentry/core";
import { describe, expect, it } from "vitest";

import { scrubEvent, scrubString } from "./scrub";

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return { type: undefined, ...overrides };
}

describe("scrubString", () => {
  it("redacts email addresses in free text", () => {
    expect(scrubString("contact alice@example.com please")).toBe("contact [redacted] please");
  });

  it("redacts JWT-shaped tokens", () => {
    const jwt = "eyJhbGciOi.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT";
    expect(scrubString(`bearer ${jwt}`)).not.toContain(jwt);
  });

  it("redacts long hex strings (Strava access tokens, NEXTAUTH_SECRET)", () => {
    const hex = "a".repeat(64);
    expect(scrubString(`key=${hex}`)).not.toContain(hex);
  });

  it("redacts Bearer headers", () => {
    expect(scrubString("Authorization: Bearer abc123xyz")).toContain("Bearer [redacted]");
  });

  it("leaves non-sensitive strings untouched", () => {
    expect(scrubString("hello world")).toBe("hello world");
  });
});

describe("scrubEvent", () => {
  it("strips user email and username while keeping id", () => {
    const event = makeEvent({
      user: { id: "user-123", email: "alice@example.com", username: "alice" },
    });
    const out = scrubEvent(event);
    expect(out.user?.id).toBe("user-123");
    expect(out.user?.email).toBeUndefined();
    expect(out.user?.username).toBeUndefined();
  });

  it("strips ip_address from user", () => {
    const event = makeEvent({
      user: { id: "user-123", ip_address: "10.0.0.1" },
    });
    const out = scrubEvent(event);
    expect(out.user?.ip_address).toBeUndefined();
  });

  it("redacts Authorization and Cookie headers", () => {
    const event = makeEvent({
      request: {
        url: "/api/foo",
        headers: {
          authorization: "Bearer secrettoken",
          cookie: "next-auth.session-token=abc",
          "user-agent": "vitest",
        },
      },
    });
    const out = scrubEvent(event);
    expect(out.request?.headers?.authorization).toBe("[redacted]");
    expect(out.request?.headers?.cookie).toBe("[redacted]");
    expect(out.request?.headers?.["user-agent"]).toBe("vitest");
  });

  it("redacts emails and tokens nested in request.data", () => {
    const event = makeEvent({
      request: {
        url: "/api/foo",
        data: {
          email: "bob@example.com",
          accessToken: "should-be-removed",
          notes: "ping alice@example.com for review",
        },
      },
    });
    const out = scrubEvent(event);
    const data = out.request?.data as Record<string, unknown>;
    expect(data.email).toBe("[redacted]");
    expect(data.accessToken).toBe("[redacted]");
    expect(data.notes).toBe("ping [redacted] for review");
  });

  it("redacts breadcrumb message and data PII", () => {
    const event = makeEvent({
      breadcrumbs: [
        {
          category: "console",
          message: "logged in as alice@example.com",
          data: { username: "alice", endpoint: "/api/foo" },
        },
      ],
    });
    const out = scrubEvent(event);
    expect(out.breadcrumbs?.[0].message).toBe("logged in as [redacted]");
    const crumbData = out.breadcrumbs?.[0].data as Record<string, unknown>;
    expect(crumbData.username).toBe("[redacted]");
    expect(crumbData.endpoint).toBe("/api/foo");
  });

  it("clears request.cookies entirely", () => {
    const event = makeEvent({
      request: {
        url: "/api/foo",
        cookies: { "next-auth.session-token": "supersecret" },
      },
    });
    const out = scrubEvent(event);
    expect(out.request?.cookies).toEqual({});
  });

  it("redacts emails inside exception.values[].value", () => {
    const event = makeEvent({
      exception: {
        values: [{ type: "Error", value: "failed for user bob@example.com" }],
      },
    });
    const out = scrubEvent(event);
    expect(out.exception?.values?.[0].value).toBe("failed for user [redacted]");
  });

  it("returns null/undefined input unchanged", () => {
    expect(scrubEvent(null)).toBeNull();
    expect(scrubEvent(undefined)).toBeUndefined();
  });

  it("redacts sensitive tag values", () => {
    const event = makeEvent({
      tags: { route: "/api/foo", email: "alice@example.com" },
    });
    const out = scrubEvent(event);
    expect(out.tags?.route).toBe("/api/foo");
    expect(out.tags?.email).toBe("[redacted]");
  });
});
