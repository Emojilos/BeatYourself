"use server";

import type { UserSettings, WeightLog } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { requireSession } from "@/lib/auth/session";
import { clearWeightTarget, deleteWeight, logWeight, setWeightTarget } from "@/lib/services/weight";
import { logWeightSchema, setWeightTargetSchema } from "@/lib/validation/weight";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function revalidateWeightViews(): void {
  revalidatePath("/weight");
  revalidatePath("/dashboard");
}

export async function logWeightAction(input: unknown): Promise<ActionResult<WeightLog>> {
  const session = await requireSession();

  const parsed = logWeightSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let log: WeightLog;
  try {
    log = await logWeight(session.user.id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save weight",
    };
  }

  revalidateWeightViews();
  return { success: true, data: log };
}

export async function deleteWeightAction(id: string): Promise<ActionResult<WeightLog>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Weight id is required" };
  }

  let log: WeightLog | null;
  try {
    log = await deleteWeight(session.user.id, id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete weight",
    };
  }

  if (!log) {
    return { success: false, error: "Weight measurement not found" };
  }

  revalidateWeightViews();
  return { success: true, data: log };
}

export async function setWeightTargetAction(input: unknown): Promise<ActionResult<UserSettings>> {
  const session = await requireSession();

  const parsed = setWeightTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let settings: UserSettings;
  try {
    settings = await setWeightTarget(session.user.id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set weight target",
    };
  }

  revalidateWeightViews();
  return { success: true, data: settings };
}

export async function clearWeightTargetAction(): Promise<ActionResult<UserSettings | null>> {
  const session = await requireSession();

  let settings: UserSettings | null;
  try {
    settings = await clearWeightTarget(session.user.id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear weight target",
    };
  }

  revalidateWeightViews();
  return { success: true, data: settings };
}
