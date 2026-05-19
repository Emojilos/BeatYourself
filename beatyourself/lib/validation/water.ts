import { z } from "zod";

export const addWaterSchema = z.object({
  amountMl: z
    .number({ error: "Amount must be a number" })
    .int("Amount must be an integer")
    .positive("Amount must be greater than zero"),
});

export type AddWaterInput = z.infer<typeof addWaterSchema>;

export const setWaterGoalSchema = z.object({
  goalMl: z
    .number({ error: "Goal must be a number" })
    .int("Goal must be an integer")
    .min(100, "Goal must be at least 100 ml")
    .max(20000, "Goal must be at most 20000 ml"),
});

export type SetWaterGoalInput = z.infer<typeof setWaterGoalSchema>;
