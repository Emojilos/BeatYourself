import { z } from "zod";

export const addWaterSchema = z.object({
  amountMl: z
    .number({ error: "Amount must be a number" })
    .int("Amount must be an integer")
    .positive("Amount must be greater than zero"),
});

export type AddWaterInput = z.infer<typeof addWaterSchema>;
