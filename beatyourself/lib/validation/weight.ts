import { z } from "zod";

export const logWeightSchema = z.object({
  weightKg: z
    .number({ error: "Weight must be a number" })
    .positive("Weight must be greater than zero")
    .lt(500, "Weight must be less than 500 kg"),
  measuredAt: z.coerce.date(),
  note: z.string().trim().max(500, "Note is too long").optional(),
});

export type LogWeightInput = z.infer<typeof logWeightSchema>;

export const setWeightTargetSchema = z.object({
  weightKg: z
    .number({ error: "Target weight must be a number" })
    .positive("Target weight must be greater than zero")
    .lt(500, "Target weight must be less than 500 kg"),
  targetDate: z.coerce.date().optional(),
});

export type SetWeightTargetInput = z.infer<typeof setWeightTargetSchema>;
