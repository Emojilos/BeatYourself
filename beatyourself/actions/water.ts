"use server";

import type { UserSettings, WaterLog } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { requireSession } from "@/lib/auth/session";
import { addWater, deleteWater, setWaterGoal } from "@/lib/services/water";
import { addWaterSchema, setWaterGoalSchema } from "@/lib/validation/water";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function revalidateWaterViews(): void {
  revalidatePath("/water");
  revalidatePath("/dashboard");
}

export async function addWaterAction(input: unknown): Promise<ActionResult<WaterLog>> {
  const session = await requireSession();

  const parsed = addWaterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let log: WaterLog;
  try {
    log = await addWater(session.user.id, parsed.data.amountMl);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add water log",
    };
  }

  revalidateWaterViews();
  return { success: true, data: log };
}

export async function deleteWaterAction(id: string): Promise<ActionResult<WaterLog>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Water log id is required" };
  }

  let log: WaterLog | null;
  try {
    log = await deleteWater(session.user.id, id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete water log",
    };
  }

  if (!log) {
    return { success: false, error: "Water log not found" };
  }

  revalidateWaterViews();
  return { success: true, data: log };
}

export async function setWaterGoalAction(input: unknown): Promise<ActionResult<UserSettings>> {
  const session = await requireSession();

  const parsed = setWaterGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let settings: UserSettings;
  try {
    settings = await setWaterGoal(session.user.id, parsed.data.goalMl);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update water goal",
    };
  }

  revalidateWaterViews();
  return { success: true, data: settings };
}
