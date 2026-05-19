"use server";

import type { Activity } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { requireSession } from "@/lib/auth/session";
import {
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
} from "@/lib/services/activities";
import { createActivitySchema, updateActivitySchema } from "@/lib/validation/activity";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function revalidateActivityViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/challenges");
}

export async function createActivityAction(input: unknown): Promise<ActionResult<Activity>> {
  const session = await requireSession();

  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let activity: Activity;
  try {
    activity = await createActivity(session.user.id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create activity",
    };
  }

  revalidateActivityViews();
  return { success: true, data: activity };
}

export async function updateActivityAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Activity>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Activity id is required" };
  }

  const parsed = updateActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  let activity: Activity | null;
  try {
    activity = await updateActivity(session.user.id, id, parsed.data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update activity",
    };
  }

  if (!activity) {
    return { success: false, error: "Activity not found" };
  }

  revalidateActivityViews();
  return { success: true, data: activity };
}

const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function listActivitiesByDayAction(
  dateKey: string,
): Promise<ActionResult<Activity[]>> {
  const session = await requireSession();

  if (typeof dateKey !== "string" || !DAY_KEY_REGEX.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }

  const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return { success: false, error: "Invalid date" };
  }

  let activities: Activity[];
  try {
    activities = await listActivities(session.user.id, { from: dayStart, to: dayStart });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load activities",
    };
  }

  return { success: true, data: activities };
}

export async function deleteActivityAction(id: string): Promise<ActionResult<Activity>> {
  const session = await requireSession();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Activity id is required" };
  }

  let activity: Activity | null;
  try {
    activity = await deleteActivity(session.user.id, id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete activity",
    };
  }

  if (!activity) {
    return { success: false, error: "Activity not found" };
  }

  revalidateActivityViews();
  return { success: true, data: activity };
}
