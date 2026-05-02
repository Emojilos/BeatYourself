import { z } from "zod";

import { ActivityType } from "@prisma/client";

const distanceKmField = z
  .number({ error: "Distance must be a number" })
  .nonnegative("Distance cannot be negative")
  .optional();

const durationMinField = z
  .number({ error: "Duration must be a number" })
  .nonnegative("Duration cannot be negative")
  .optional();

const stepsField = z
  .number({ error: "Steps must be a number" })
  .int("Steps must be an integer")
  .nonnegative("Steps cannot be negative")
  .optional();

const noteField = z.string().trim().max(500, "Note is too long").optional();

const hasAtLeastOneMetric = (data: { distanceKm?: number; durationMin?: number; steps?: number }) =>
  (data.distanceKm ?? 0) > 0 || (data.durationMin ?? 0) > 0 || (data.steps ?? 0) > 0;

export const createActivitySchema = z
  .object({
    activityType: z.enum(ActivityType),
    distanceKm: distanceKmField,
    durationMin: durationMinField,
    steps: stepsField,
    activityDate: z.coerce.date().default(() => new Date()),
    note: noteField,
  })
  .refine(hasAtLeastOneMetric, {
    message: "At least one of distance, duration, or steps must be greater than zero",
    path: ["distanceKm"],
  });

export const updateActivitySchema = z.object({
  activityType: z.enum(ActivityType).optional(),
  distanceKm: distanceKmField,
  durationMin: durationMinField,
  steps: stepsField,
  activityDate: z.coerce.date().optional(),
  note: noteField,
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
