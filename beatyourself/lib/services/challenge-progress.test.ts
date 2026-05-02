import { describe, expect, it } from "vitest";

import {
  calculateProgress,
  type ProgressActivity,
  type ProgressChallenge,
} from "./challenge-progress";

// Helpers — match Prisma's @db.Date deserialization (UTC midnight).
function date(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function activity(
  yyyyMmDd: string,
  fields: Partial<Omit<ProgressActivity, "activityDate">> = {},
): ProgressActivity {
  return {
    activityDate: date(yyyyMmDd),
    activityType: "run",
    steps: null,
    distanceKm: null,
    durationMin: null,
    ...fields,
  };
}

const APRIL: ProgressChallenge = {
  type: "cumulative",
  metric: "distance_km",
  startDate: date("2026-04-01"),
  endDate: date("2026-04-30"),
};

describe("calculateProgress — cumulative type", () => {
  it("matches PRD example: distance_km target 100, activities 30+40+35 -> 105", () => {
    const result = calculateProgress(APRIL, [
      activity("2026-04-05", { distanceKm: 30 }),
      activity("2026-04-10", { distanceKm: 40 }),
      activity("2026-04-20", { distanceKm: 35 }),
    ]);
    expect(result).toBe(105);
  });

  it("sums steps across the period", () => {
    const challenge: ProgressChallenge = { ...APRIL, metric: "steps" };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { steps: 8000 }),
      activity("2026-04-06", { steps: 12000 }),
      activity("2026-04-07", { steps: 5000 }),
    ]);
    expect(result).toBe(25000);
  });

  it("sums duration_min across the period", () => {
    const challenge: ProgressChallenge = { ...APRIL, metric: "duration_min" };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { durationMin: 30 }),
      activity("2026-04-06", { durationMin: 45.5 }),
    ]);
    expect(result).toBe(75.5);
  });

  it("counts only activityType=run for runs_count metric", () => {
    const challenge: ProgressChallenge = { ...APRIL, metric: "runs_count" };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { activityType: "run" }),
      activity("2026-04-06", { activityType: "walk" }),
      activity("2026-04-07", { activityType: "run" }),
      activity("2026-04-08", { activityType: "other" }),
      activity("2026-04-09", { activityType: "run" }),
    ]);
    expect(result).toBe(3);
  });

  it("returns 0 for the custom metric (caller provides their own logic)", () => {
    const challenge: ProgressChallenge = { ...APRIL, metric: "custom" };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { distanceKm: 10, steps: 20000 }),
    ]);
    expect(result).toBe(0);
  });

  it("returns 0 for empty activities", () => {
    expect(calculateProgress(APRIL, [])).toBe(0);
  });

  it("treats null metric fields as 0 (e.g. a walk with only steps contributes 0 to distance)", () => {
    const result = calculateProgress(APRIL, [
      activity("2026-04-05", { steps: 5000 }), // distanceKm: null
      activity("2026-04-06", { distanceKm: 7 }),
    ]);
    expect(result).toBe(7);
  });
});

describe("calculateProgress — single_day type", () => {
  const challengeStepsSingleDay: ProgressChallenge = {
    type: "single_day",
    metric: "steps",
    startDate: date("2026-04-01"),
    endDate: date("2026-04-30"),
  };

  it("matches PRD example: 50000 steps single_day, 30k+25k same day + 10k another -> 55000", () => {
    const result = calculateProgress(challengeStepsSingleDay, [
      activity("2026-04-10", { steps: 30000 }),
      activity("2026-04-10", { steps: 25000 }),
      activity("2026-04-11", { steps: 10000 }),
    ]);
    expect(result).toBe(55000);
  });

  it("picks the maximum day even when it isn't the last", () => {
    const result = calculateProgress(challengeStepsSingleDay, [
      activity("2026-04-05", { steps: 40000 }), // peak
      activity("2026-04-10", { steps: 12000 }),
      activity("2026-04-15", { steps: 8000 }),
    ]);
    expect(result).toBe(40000);
  });

  it("returns 0 when no activities are in the period", () => {
    const result = calculateProgress(challengeStepsSingleDay, []);
    expect(result).toBe(0);
  });

  it("aggregates per day for distance_km too", () => {
    const challenge: ProgressChallenge = {
      type: "single_day",
      metric: "distance_km",
      startDate: date("2026-04-01"),
      endDate: date("2026-04-30"),
    };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { distanceKm: 12 }),
      activity("2026-04-05", { distanceKm: 8 }), // 20 on the 5th
      activity("2026-04-06", { distanceKm: 15 }),
    ]);
    expect(result).toBe(20);
  });

  it("counts max runs in a single day for runs_count single_day", () => {
    const challenge: ProgressChallenge = {
      type: "single_day",
      metric: "runs_count",
      startDate: date("2026-04-01"),
      endDate: date("2026-04-30"),
    };
    const result = calculateProgress(challenge, [
      activity("2026-04-05", { activityType: "run" }),
      activity("2026-04-05", { activityType: "run" }),
      activity("2026-04-05", { activityType: "walk" }), // ignored
      activity("2026-04-06", { activityType: "run" }),
    ]);
    expect(result).toBe(2);
  });
});

describe("calculateProgress — period boundaries", () => {
  const challenge: ProgressChallenge = {
    type: "cumulative",
    metric: "distance_km",
    startDate: date("2026-04-10"),
    endDate: date("2026-04-20"),
  };

  it("includes activity exactly on startDate", () => {
    const result = calculateProgress(challenge, [activity("2026-04-10", { distanceKm: 5 })]);
    expect(result).toBe(5);
  });

  it("includes activity exactly on endDate", () => {
    const result = calculateProgress(challenge, [activity("2026-04-20", { distanceKm: 7 })]);
    expect(result).toBe(7);
  });

  it("excludes activity one day before startDate", () => {
    const result = calculateProgress(challenge, [activity("2026-04-09", { distanceKm: 100 })]);
    expect(result).toBe(0);
  });

  it("excludes activity one day after endDate", () => {
    const result = calculateProgress(challenge, [activity("2026-04-21", { distanceKm: 100 })]);
    expect(result).toBe(0);
  });

  it("filters mixed in/out of period activities correctly", () => {
    const result = calculateProgress(challenge, [
      activity("2026-04-09", { distanceKm: 1000 }), // before
      activity("2026-04-10", { distanceKm: 5 }), // boundary in
      activity("2026-04-15", { distanceKm: 3 }), // mid
      activity("2026-04-20", { distanceKm: 2 }), // boundary in
      activity("2026-04-21", { distanceKm: 1000 }), // after
    ]);
    expect(result).toBe(10);
  });

  it("does not mutate the input array", () => {
    const acts = [
      activity("2026-04-15", { distanceKm: 5 }),
      activity("2026-04-09", { distanceKm: 100 }),
    ];
    const snapshot = acts.map((a) => ({ ...a }));
    calculateProgress(challenge, acts);
    expect(acts.map((a) => ({ ...a }))).toEqual(snapshot);
  });
});
