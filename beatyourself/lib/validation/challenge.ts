import { z } from "zod";

import { ChallengeStatus, ChallengeType, Difficulty, Metric } from "@prisma/client";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const titleField = z.string().trim().min(1, "Title is required").max(100, "Title is too long");
const descriptionField = z.string().trim().max(500, "Description is too long").optional();
const colorField = z
  .string()
  .regex(HEX_COLOR_RE, "Color must be a hex value like #RRGGBB or #RRGGBBAA")
  .optional();
const iconField = z.string().trim().min(1).max(50, "Icon name is too long").optional();
const unitField = z.string().trim().min(1, "Unit is required").max(20, "Unit is too long");
const targetValueField = z
  .number({ error: "Target value must be a number" })
  .positive("Target value must be greater than zero");

export const createChallengeSchema = z
  .object({
    title: titleField,
    description: descriptionField,
    type: z.enum(ChallengeType),
    metric: z.enum(Metric),
    targetValue: targetValueField,
    unit: unitField,
    difficulty: z.enum(Difficulty),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    color: colorField,
    icon: iconField,
  })
  .refine((data) => data.endDate.getTime() >= data.startDate.getTime(), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const updateChallengeSchema = z.object({
  description: descriptionField,
  endDate: z.coerce.date().optional(),
  color: colorField,
  icon: iconField,
  status: z.enum(ChallengeStatus).optional(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
