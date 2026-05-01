import { describe, expect, it } from "vitest";

import { calculateStreak, type StreakActivity } from "./streaks";

// Activities arrive from Prisma with `activityDate` as a `@db.Date`, which
// the client deserializes to a UTC-midnight `Date`. We construct test
// fixtures the same way to mirror production.
function day(yyyyMmDd: string): StreakActivity {
  return { activityDate: new Date(`${yyyyMmDd}T00:00:00.000Z`) };
}

// Reference "now" used across tests: 2026-04-29 12:00 UTC, which is
// 15:00 Europe/Moscow on the same calendar day. Picking a midday moment
// avoids accidental tz-rollover ambiguity in tests that don't deliberately
// probe rollovers.
const NOON_2026_04_29_UTC = new Date("2026-04-29T12:00:00.000Z");
const MSK = "Europe/Moscow";

describe("calculateStreak", () => {
  it("returns 0/0 for empty input", () => {
    expect(calculateStreak([], MSK, NOON_2026_04_29_UTC)).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("returns 1/1 for a single activity today", () => {
    const result = calculateStreak([day("2026-04-29")], MSK, NOON_2026_04_29_UTC);
    expect(result).toEqual({ current: 1, longest: 1 });
  });

  it("returns 3/3 for three consecutive days ending today", () => {
    const result = calculateStreak(
      [day("2026-04-27"), day("2026-04-28"), day("2026-04-29")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 3, longest: 3 });
  });

  it("matches PRD example: 26/27/28/29.04 with today=29.04 MSK -> current=4", () => {
    const result = calculateStreak(
      [day("2026-04-26"), day("2026-04-27"), day("2026-04-28"), day("2026-04-29")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 4, longest: 4 });
  });

  it("matches PRD example: 26/27/29.04 (gap on 28.04) -> current=1, longest=2", () => {
    const result = calculateStreak(
      [day("2026-04-26"), day("2026-04-27"), day("2026-04-29")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 1, longest: 2 });
  });

  it("applies the grace period: today empty but yesterday active -> current counts up to yesterday", () => {
    const result = calculateStreak(
      [day("2026-04-26"), day("2026-04-27"), day("2026-04-28")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 3, longest: 3 });
  });

  it("returns current=0 when neither today nor yesterday has activity, but longest reflects history", () => {
    const result = calculateStreak(
      [day("2026-04-20"), day("2026-04-21"), day("2026-04-22")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 0, longest: 3 });
  });

  it("ignores duplicate same-day activities for streak counting", () => {
    const result = calculateStreak(
      [day("2026-04-29"), day("2026-04-29"), day("2026-04-29"), day("2026-04-28")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 2, longest: 2 });
  });

  it("handles month transitions in a streak", () => {
    // Today = 2026-02-02, streak runs 01-31 -> 02-01 -> 02-02.
    const today = new Date("2026-02-02T12:00:00.000Z");
    const result = calculateStreak(
      [day("2026-01-31"), day("2026-02-01"), day("2026-02-02")],
      MSK,
      today,
    );
    expect(result).toEqual({ current: 3, longest: 3 });
  });

  it("handles year transitions in a streak", () => {
    // Today = 2026-01-02, streak crosses the year boundary.
    const today = new Date("2026-01-02T12:00:00.000Z");
    const result = calculateStreak(
      [day("2025-12-31"), day("2026-01-01"), day("2026-01-02")],
      MSK,
      today,
    );
    expect(result).toEqual({ current: 3, longest: 3 });
  });

  it("respects the user's timezone when picking 'today': late-evening UTC that is already next-day in MSK", () => {
    // 2026-04-29 22:30 UTC == 2026-04-30 01:30 MSK. So in MSK, "today" is 2026-04-30,
    // not 2026-04-29. The earlier UTC date should NOT count as today.
    const lateNightUtc = new Date("2026-04-29T22:30:00.000Z");
    const result = calculateStreak([day("2026-04-30"), day("2026-04-29")], MSK, lateNightUtc);
    expect(result).toEqual({ current: 2, longest: 2 });
  });

  it("respects the user's timezone when picking 'today': early UTC that is still previous-day in LA", () => {
    // 2026-04-30 06:00 UTC == 2026-04-29 23:00 America/Los_Angeles.
    // In LA, "today" is 2026-04-29.
    const earlyMorningUtc = new Date("2026-04-30T06:00:00.000Z");
    const result = calculateStreak(
      [day("2026-04-28"), day("2026-04-29")],
      "America/Los_Angeles",
      earlyMorningUtc,
    );
    expect(result).toEqual({ current: 2, longest: 2 });
  });

  it("computes longest correctly when there are multiple separate runs", () => {
    // Run A: 04-10..04-12 (3). Run B: 04-15..04-19 (5). Run C: 04-29 (1, active today).
    const result = calculateStreak(
      [
        day("2026-04-10"),
        day("2026-04-11"),
        day("2026-04-12"),
        day("2026-04-15"),
        day("2026-04-16"),
        day("2026-04-17"),
        day("2026-04-18"),
        day("2026-04-19"),
        day("2026-04-29"),
      ],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(result).toEqual({ current: 1, longest: 5 });
  });

  it("works regardless of input ordering", () => {
    const ordered = calculateStreak(
      [day("2026-04-27"), day("2026-04-28"), day("2026-04-29")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    const shuffled = calculateStreak(
      [day("2026-04-29"), day("2026-04-27"), day("2026-04-28")],
      MSK,
      NOON_2026_04_29_UTC,
    );
    expect(shuffled).toEqual(ordered);
  });

  it("uses Europe/Moscow as the default timezone when none is provided", () => {
    // 2026-04-29 22:30 UTC == 2026-04-30 01:30 MSK. Default tz should treat 04-30 as today.
    const lateNightUtc = new Date("2026-04-29T22:30:00.000Z");
    const result = calculateStreak([day("2026-04-30")], undefined, lateNightUtc);
    expect(result).toEqual({ current: 1, longest: 1 });
  });

  it("does not alter input arrays (purity)", () => {
    const activities = [day("2026-04-27"), day("2026-04-29"), day("2026-04-28")];
    const snapshot = activities.map((a) => a.activityDate.toISOString());
    calculateStreak(activities, MSK, NOON_2026_04_29_UTC);
    expect(activities.map((a) => a.activityDate.toISOString())).toEqual(snapshot);
  });
});
